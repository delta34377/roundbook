// ghin.ts — reads the official USGA Handicap Index straight from GHIN, the
// same source the Arccos app shows under the player's name. Arccos's own API
// never returns it (its profile.handicap is a whole-number sign-up field and
// its userHcp is Arccos's estimate), so the sync logs into GHIN with the
// owner's GHIN email and password (Supabase secrets GHIN_EMAIL / GHIN_PASSWORD,
// never logged, never stored anywhere else) and reads handicap_index.
//
// GHIN's API is unofficial; the login and lookup paths below are the ones the
// GHIN app and site use. Everything is optional: any failure returns
// { error } and the sync falls back to what Arccos has.

const GHIN = 'https://api2.ghin.com/api/v1';
const GHIN_UA = 'roundbook-sync/1.0 (personal handicap read)';
const GHIN_TIMEOUT_MS = 12_000;

async function ghinCall(method: string, url: string, body?: unknown, token?: string): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { 'User-Agent': GHIN_UA, Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(GHIN_TIMEOUT_MS),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: res.status, json };
}

// First value under a key named handicap_index (or handicapIndex) anywhere in
// the object, parsed as a number; "+1.2" (a plus handicap) stays positive here
// and is flagged in the source text.
export function pickIndex(obj: any, depth = 0): { value: number; plus: boolean } | null {
  if (depth > 6 || obj == null || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) { for (const x of obj.slice(0, 20)) { const r = pickIndex(x, depth + 1); if (r) return r; } return null; }
  for (const [k, v] of Object.entries(obj)) {
    if (/^handicap_?index$/i.test(k) && (typeof v === 'number' || typeof v === 'string')) {
      const s = String(v).trim();
      const m = s.match(/^(\+)?(-)?(\d+(?:\.\d+)?)$/);
      if (m) return { value: Number(m[3]), plus: m[1] === '+' };
    }
  }
  for (const v of Object.values(obj)) { const r = pickIndex(v, depth + 1); if (r) return r; }
  return null;
}

export async function fetchGhinIndex(email: string, password: string): Promise<{ index: number; source: string } | { error: string }> {
  const loginBody = { user: { email_or_ghin: email, password, remember_me: 'true' }, token: 'dummy token' };
  let login: { status: number; json: any } | null = null;
  const tried: string[] = [];
  for (const path of ['/golfer_login.json', '/users/login.json']) {
    try {
      const r = await ghinCall('POST', `${GHIN}${path}`, loginBody);
      tried.push(`${path} ${r.status}`);
      if (r.status >= 200 && r.status < 300 && r.json) { login = r; break; }
    } catch (e) { tried.push(`${path} ${String(e?.name ?? 'error')}`); }
  }
  if (!login) return { error: `GHIN login failed (${tried.join(', ')})` };
  // The login response usually carries the index already.
  const direct = pickIndex(login.json);
  if (direct) return { index: direct.value, source: `GHIN login${direct.plus ? ' (plus handicap)' : ''}` };
  const gu = login.json?.golfer_user ?? login.json?.user ?? {};
  const token = gu.golfer_user_token ?? gu.token ?? login.json?.token;
  const ghinId = gu.golfer_id ?? gu.ghin_number ?? gu.ghin;
  if (!token) return { error: 'GHIN login returned no token' };
  if (!ghinId) return { error: 'GHIN login returned no golfer id' };
  try {
    const r = await ghinCall('GET', `${GHIN}/golfers/search.json?golfer_id=${encodeURIComponent(String(ghinId))}&per_page=1&page=1`, undefined, token);
    const found = pickIndex(r.json);
    if (found) return { index: found.value, source: `GHIN golfer ${ghinId}${found.plus ? ' (plus handicap)' : ''}` };
    return { error: `GHIN lookup HTTP ${r.status}, no handicap_index in response` };
  } catch (e) {
    return { error: `GHIN lookup failed: ${String(e?.name ?? e)}` };
  }
}
