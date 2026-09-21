// arccos-sync — scheduled Supabase Edge Function that keeps The Round Book
// fresh: pulls new rounds from Arccos, re-derives the dashboard payload with
// the exact prep_data.py math (see derive.ts and web/scripts/verify-derive-parity.mjs),
// and upserts it into public.roundbook_data for /roundbook to read.
//
// Secrets (supabase secrets set ...): ARCCOS_EMAIL, ARCCOS_PASSWORD, and
// optionally ROUNDBOOK_HCP (a manual override; by default the dashboard uses
// the handicap Arccos reports, cat.overall from /handicaps/latest, so it
// tracks the account after every sync - CLAUDE.md rule 6).
//
// Auth: callable with the sync key as the bearer (the pg_cron schedule in
// supabase/schema.sql sends it from Vault; set the same value as the SYNC_KEY
// function secret) OR with the owner's logged-in session token (the site's
// Sync button; email checked against OWNER_EMAIL, default the owner's).
// Public keys are rejected so visitors cannot trigger Arccos traffic.
//
// Behavior per run:
//   - fetch the full rounds list (newest first)
//   - fetch shot geometry only for rounds not already cached in
//     public.roundbook_raw_rounds, plus the 2 most recent (post-round edits);
//     POST body {"full": true} refetches everything
//   - failed/malformed round fetches are skipped and reported, mirroring how
//     arccos_export.py tolerates them; they retry next run
//   - derive + upsert the single roundbook_data row; on any hard error the
//     existing row is left untouched
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { deriveDashData } from './derive.ts';
import { ArccosError, fetchCourseDetail, fetchHandicap, fetchProfile, fetchRoundDetail, fetchRoundsList, fetchSmartDistances, login, tokenFor } from './arccos.ts';

const DETAIL_DELAY_MS = 300;
const RECENT_REFRESH = 2;

// Browser calls (the site's Sync button) require CORS: answer the preflight
// and stamp every response. Security lives in the bearer check, not origin.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  // Two ways in:
  //   1) the sync key (the cron schedule / manual curl): the SYNC_KEY secret
  //      if set, otherwise the platform-injected service role key
  //   2) the owner's logged-in session token (the site's Sync button): a
  //      valid user JWT whose email matches OWNER_EMAIL
  // Public publishable/anon keys match neither, and other users' tokens fail
  // the email check, so visitors cannot trigger Arccos traffic.
  const syncKey = Deno.env.get('SYNC_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const dbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SYNC_KEY') || '';
  const ownerEmail = Deno.env.get('OWNER_EMAIL') || 'markgreenfield1@gmail.com'; // same address as the RLS policy
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, dbKey);
  let authorized = Boolean(syncKey) && bearer === syncKey;
  if (!authorized && bearer) {
    const { data: userData, error: userErr } = await supabase.auth.getUser(bearer);
    authorized =
      !userErr &&
      typeof userData?.user?.email === 'string' &&
      userData.user.email.toLowerCase() === ownerEmail.toLowerCase();
  }
  if (!authorized) {
    return json(401, { error: 'sync key or owner login required' });
  }

  const email = Deno.env.get('ARCCOS_EMAIL');
  const password = Deno.env.get('ARCCOS_PASSWORD');
  if (!email || !password) {
    return json(500, { error: 'ARCCOS_EMAIL / ARCCOS_PASSWORD secrets are not set' });
  }

  const body = await req.json().catch(() => ({}));
  const fullRefetch = body?.full === true;
  const t0 = Date.now();

  try {
    // --- Arccos: list rounds ---
    const { uid, key } = await login(email, password);
    let token = await tokenFor(uid, key);
    const listed = await fetchRoundsList(uid, token);
    const rids: (string | number)[] = [];
    for (const r of listed) {
      const rid = r.roundId ?? r.id;
      if (rid != null) rids.push(rid);
    }
    if (!rids.length) return json(500, { error: 'Arccos returned no rounds; refusing to overwrite' });

    // --- which rounds need geometry fetched ---
    const cached = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('roundbook_raw_rounds')
        .select('round_id')
        .range(from, from + 999);
      if (error) throw new Error(`roundbook_raw_rounds read failed: ${error.message}`);
      for (const row of data ?? []) cached.add(String(row.round_id));
      if (!data || data.length < 1000) break;
    }
    const toFetch = rids.filter(
      (rid, i) => fullRefetch || i < RECENT_REFRESH || !cached.has(String(rid))
    );

    // --- fetch + cache new geometry (sequential, politely spaced) ---
    const skipped: string[] = [];
    let fetched = 0;
    for (const [i, rid] of toFetch.entries()) {
      try {
        const detail = await fetchRoundDetail(uid, rid, token);
        if (!detail || !Array.isArray(detail.holes)) {
          skipped.push(`${rid}: malformed detail`);
        } else {
          const { error } = await supabase.from('roundbook_raw_rounds').upsert({
            round_id: rid,
            start_time: detail.startTime ?? null,
            payload: detail,
            fetched_at: new Date().toISOString(),
          });
          if (error) throw new Error(`raw round upsert failed: ${error.message}`);
          fetched += 1;
        }
      } catch (e) {
        if (e instanceof ArccosError) skipped.push(`${rid}: ${e.message}`);
        else throw e;
      }
      if ((i + 1) % 100 === 0) token = await tokenFor(uid, key); // long full refetches
      await new Promise((r) => setTimeout(r, DETAIL_DELAY_MS));
    }

    // --- course scorecards: cache real pars for any course not yet fetched ---
    // (or whose courseVersion moved; {"full":true} refetches these too)
    const wantCourses = new Map<string, string>(); // courseId -> latest courseVersion seen
    for (const rd of listed) {
      const cid = rd.courseId != null ? String(rd.courseId) : '';
      if (!cid) continue;
      const v = rd.courseVersion != null ? String(rd.courseVersion) : '1';
      const prev = wantCourses.get(cid);
      if (prev == null || Number(v) > Number(prev)) wantCourses.set(cid, v);
    }
    const haveCourses = new Map<string, string>();
    {
      const { data, error } = await supabase.from('roundbook_courses').select('course_id, course_version');
      if (error) throw new Error(`roundbook_courses read failed: ${error.message}`);
      for (const row of data ?? []) haveCourses.set(String(row.course_id), String(row.course_version ?? ''));
    }
    let coursesFetched = 0;
    for (const [cid, ver] of wantCourses) {
      if (!fullRefetch && haveCourses.get(cid) === ver) continue;
      try {
        const detail = await fetchCourseDetail(cid, ver, token);
        const { error } = await supabase.from('roundbook_courses').upsert({
          course_id: cid,
          course_version: ver,
          payload: detail,
          fetched_at: new Date().toISOString(),
        });
        if (error) throw new Error(`course upsert failed: ${error.message}`);
        coursesFetched += 1;
      } catch (e) {
        if (e instanceof ArccosError) skipped.push(`course ${cid}: ${e.message}`);
        else throw e;
      }
      await new Promise((r) => setTimeout(r, DETAIL_DELAY_MS));
    }
    const coursesDetail: Record<string, any> = {};
    {
      const { data, error } = await supabase.from('roundbook_courses').select('course_id, payload');
      if (error) throw new Error(`roundbook_courses read failed: ${error.message}`);
      for (const row of data ?? []) coursesDetail[String(row.course_id)] = row.payload;
    }

    // --- assemble the raw export shape in the listed (newest-first) order ---
    const byId = new Map<string, any>();
    for (let at = 0; at < rids.length; at += 100) {
      const chunk = rids.slice(at, at + 100);
      const { data, error } = await supabase
        .from('roundbook_raw_rounds')
        .select('round_id, payload')
        .in('round_id', chunk);
      if (error) throw new Error(`raw rounds read failed: ${error.message}`);
      for (const row of data ?? []) byId.set(String(row.round_id), row.payload);
    }
    const roundsDetail = rids.map((rid) => byId.get(String(rid))).filter(Boolean);
    if (!roundsDetail.length) {
      return json(500, { error: 'no cached round geometry; every fetch failed', skipped });
    }

    const smartDistances = await fetchSmartDistances(uid, token);
    if (!Array.isArray(smartDistances?.clubs)) {
      return json(500, { error: 'smart-distances response missing clubs[]' });
    }
    const handicap = await fetchHandicap(uid, token);
    for (const k of ['userHcp', 'driveHcp', 'approachHcp', 'chipHcp', 'sandHcp', 'puttHcp']) {
      if (typeof handicap?.[k] !== 'number') {
        return json(500, { error: `handicap response missing numeric ${k}` });
      }
    }
    // The official index (USGA/GHIN, shown under the player's name in the app)
    // is a different number from Arccos's own userHcp. Its key is not
    // documented, so look for it in the profile and handicap responses: any
    // numeric field in handicap range whose key mentions ghin, usga or index.
    // Profile failures are not fatal; the handicap object is already verified.
    let profile: any = null;
    try { profile = await fetchProfile(uid, token); } catch (e) { console.warn('profile fetch failed:', String(e)); }
    // Live probe (Sep 2026): the profile carries a top-level `handicap` field
    // and the guessed extra endpoints all 404, so only these two are searched.
    const indexRoots = { profile, handicap };
    const indexHit = findOfficialIndex(indexRoots);

    // --- derive with the verified prep_data.py math ---
    const payload = deriveDashData({
      rounds_detail: roundsDetail,
      smart_distances: smartDistances,
      handicap,
      courses_detail: coursesDetail,
    });
    if (!payload.meta.nRounds) {
      return json(500, { error: 'derivation produced zero rounds; refusing to overwrite' });
    }

    // hcp: the official index when Arccos exposes it, else Arccos's own
    // handicap (cat.overall); ROUNDBOOK_HCP is a manual override only. The
    // source is stored so the site can say where the number came from.
    const envHcp = Number(Deno.env.get('ROUNDBOOK_HCP'));
    if (Number.isFinite(envHcp) && envHcp > 0) {
      payload.hcp = envHcp; payload.hcpSource = 'ROUNDBOOK_HCP secret';
    } else if (indexHit) {
      payload.hcp = indexHit.value; payload.hcpSource = `Arccos ${indexHit.path}`;
    } else {
      payload.hcp = payload.cat.overall; payload.hcpSource = 'Arccos handicap (userHcp); no USGA index field found';
    }
    payload.hcpCandidates = indexHit ? indexHit.candidates : describeIndexSearch(indexRoots);

    const { error: upErr } = await supabase.from('roundbook_data').upsert({
      id: 1,
      data: payload,
      updated_at: new Date().toISOString(),
    });
    if (upErr) throw new Error(`roundbook_data upsert failed: ${upErr.message}`);

    return json(200, {
      ok: true,
      rounds: payload.meta.nRounds,
      holes: payload.meta.nHoles,
      through: payload.meta.dateMax,
      listed: rids.length,
      geometryFetched: fetched,
      coursesFetched,
      skipped,
      hcp: payload.hcp,
      hcpSource: payload.hcpSource,
      hcpCandidates: payload.hcpCandidates,
      ms: Date.now() - t0,
    });
  } catch (e) {
    const msg = e instanceof ArccosError ? `[${e.step}] ${e.message}` : String(e?.message ?? e);
    console.error('arccos-sync failed:', msg);
    return json(500, { error: msg });
  }
});

// ---- official index discovery ----
// Arccos's own six category handicaps and any goal/target field are never the
// official index; everything else in handicap range with a handicap-ish key is
// a candidate, ghin/usga keys first. Values may arrive as numbers or as
// numeric strings ("12.3"); Arccos stores its own handicaps negative, so the
// magnitude is what counts.
const ARCCOS_OWN = new Set(['userHcp', 'driveHcp', 'approachHcp', 'chipHcp', 'sandHcp', 'puttHcp']);
const KEY_RE = /ghin|usga|index|hcp|handicap|hdcp/i;
function asHcp(x: any): number | null {
  const n = typeof x === 'number' ? x : (typeof x === 'string' && /^\s*[-+]?\d+(\.\d+)?\s*$/.test(x) ? Number(x) : NaN);
  return Number.isFinite(n) && n > -54 && n < 54 ? n : null;
}
function walkLeaves(roots: Record<string, any>, fn: (path: string, key: string, v: number, raw: any) => void): void {
  const walk = (v: any, path: string, depth: number) => {
    if (depth > 6 || v == null) return;
    if (Array.isArray(v)) { v.slice(0, 20).forEach((x, i) => walk(x, `${path}[${i}]`, depth + 1)); return; }
    if (typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        const n = asHcp(x);
        if (n != null) fn(`${path}.${k}`, k, n, x);
        walk(x, `${path}.${k}`, depth + 1);
      }
    }
  };
  for (const [name, obj] of Object.entries(roots)) walk(obj, name, 0);
}
function listIndexCandidates(roots: Record<string, any>): string[] {
  const out: string[] = [];
  walkLeaves(roots, (path, k, v) => { if (KEY_RE.test(k) && !ARCCOS_OWN.has(k) && !/goal|target/i.test(k)) out.push(`${path}=${v}`); });
  return out;
}
// Picks the official index: ghin/usga keys, then index keys, then any other
// handicap-ish key. null when nothing matches.
function findOfficialIndex(roots: Record<string, any>): { path: string; value: number; candidates: string[] } | null {
  const candidates = listIndexCandidates(roots);
  const keyOf = (c: string) => c.split('=')[0].split('.').pop()?.replace(/\[\d+\]$/, '') ?? '';
  const pick = (re: RegExp) => candidates.find((c) => re.test(keyOf(c)));
  const hit = pick(/ghin|usga/i) ?? pick(/index/i) ?? pick(/hcp|handicap|hdcp/i);
  if (!hit) return null;
  const [path, val] = hit.split('=');
  return { path, value: Math.abs(Number(val)), candidates };
}
// What the search saw, for the site to show when nothing matched: each probed
// endpoint's status or top-level keys, and every fractional number in handicap
// range (an index like 12.3) wherever it sits, capped.
function describeIndexSearch(roots: Record<string, any>): string[] {
  const out: string[] = [];
  for (const [name, obj] of Object.entries(roots)) {
    if (obj == null) { out.push(`${name}: (none)`); continue; }
    if (obj._error != null) { out.push(`${name}: HTTP ${obj._status ?? '?'}`); continue; }
    const keys = Array.isArray(obj) ? `list of ${obj.length}` : Object.keys(obj).slice(0, 25).join(' ');
    out.push(`${name}: {${keys}}`);
  }
  // any handicap-named field that is not a plain number, shown raw (capped)
  const raw: string[] = [];
  const show = (v: any, path: string, depth: number) => {
    if (depth > 6 || v == null || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.slice(0, 20).forEach((x, i) => show(x, `${path}[${i}]`, depth + 1)); return; }
    for (const [k, x] of Object.entries(v)) {
      if (KEY_RE.test(k) && !ARCCOS_OWN.has(k) && typeof x !== 'number' && raw.length < 12) raw.push(`${path}.${k}=${JSON.stringify(x).slice(0, 240)}`);
      show(x, `${path}.${k}`, depth + 1);
    }
  };
  for (const [name, obj] of Object.entries(roots)) show(obj, name, 0);
  const nums: string[] = [];
  walkLeaves(roots, (path, _k, v) => { if (!Number.isInteger(v) && nums.length < 40) nums.push(`${path}=${v}`); });
  return out.concat(raw.length ? ['handicap-named fields, raw: ' + raw.join(' ; ')] : [], nums.length ? ['fractional numbers seen: ' + nums.join(', ')] : ['no fractional numbers in handicap range anywhere']);
}
