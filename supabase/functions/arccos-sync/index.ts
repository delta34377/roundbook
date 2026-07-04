// arccos-sync — scheduled Supabase Edge Function that keeps The Round Book
// fresh: pulls new rounds from Arccos, re-derives the dashboard payload with
// the exact prep_data.py math (see derive.ts and web/scripts/verify-derive-parity.mjs),
// and upserts it into public.roundbook_data for /roundbook to read.
//
// Secrets (supabase secrets set ...): ARCCOS_EMAIL, ARCCOS_PASSWORD, and
// optionally ROUNDBOOK_HCP (defaults to the previous payload's hcp, then 13.7 —
// CLAUDE.md rule 6: the dashboard uses Mark's real index, never
// Arccos's internal userHcp).
//
// Auth: callable only with the service role key as the bearer (the pg_cron
// schedule in supabase/schema.sql sends it from Vault). The anon
// key is deliberately rejected so visitors cannot trigger Arccos traffic.
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
import { ArccosError, fetchHandicap, fetchRoundDetail, fetchRoundsList, fetchSmartDistances, login, tokenFor } from './arccos.ts';

const DETAIL_DELAY_MS = 300;
const RECENT_REFRESH = 2;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!svcKey || bearer !== svcKey) {
    return json(401, { error: 'service role key required' });
  }

  const email = Deno.env.get('ARCCOS_EMAIL');
  const password = Deno.env.get('ARCCOS_PASSWORD');
  if (!email || !password) {
    return json(500, { error: 'ARCCOS_EMAIL / ARCCOS_PASSWORD secrets are not set' });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, svcKey);
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

    // --- derive with the verified prep_data.py math ---
    const payload = deriveDashData({
      rounds_detail: roundsDetail,
      smart_distances: smartDistances,
      handicap,
    });
    if (!payload.meta.nRounds) {
      return json(500, { error: 'derivation produced zero rounds; refusing to overwrite' });
    }

    // hcp: explicit secret > previous payload > 13.7 (rule 6; never Arccos userHcp)
    const prev = await supabase.from('roundbook_data').select('data').eq('id', 1).maybeSingle();
    const envHcp = Number(Deno.env.get('ROUNDBOOK_HCP'));
    payload.hcp = Number.isFinite(envHcp) && envHcp > 0
      ? envHcp
      : typeof prev.data?.data?.hcp === 'number'
        ? prev.data.data.hcp
        : 13.7;

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
      skipped,
      hcp: payload.hcp,
      ms: Date.now() - t0,
    });
  } catch (e) {
    const msg = e instanceof ArccosError ? `[${e.step}] ${e.message}` : String(e?.message ?? e);
    console.error('arccos-sync failed:', msg);
    return json(500, { error: msg });
  }
});
