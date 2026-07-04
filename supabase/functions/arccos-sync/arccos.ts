// arccos.ts — minimal Arccos API client for the sync function, ported from
// arccos_export.py (which remains the full archival exporter and
// the reference for these endpoints). Talks only to Arccos's own two servers
// with the owner's login. Credentials come from Supabase secrets; they are
// never in code, the repo, or anything client-side (CLAUDE.md).
//
// The sync needs just the sections prep_data.py consumes:
//   rounds list -> per-round shot geometry, smart distances, latest handicap.

const AUTH = 'https://authentication.arccosgolf.com';
const API = 'https://api.arccosgolf.com';
const UA = 'dogleg-roundbook-sync/1.0 (personal data sync)';
const PAGE = 200;

export class ArccosError extends Error {
  step: string;
  status: number | null;
  constructor(step: string, status: number | null, message: string) {
    super(message);
    this.step = step;
    this.status = status;
  }
}

async function call(
  step: string,
  method: string,
  url: string,
  token?: string | null,
  body?: unknown
): Promise<any> {
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: 'application/json',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new ArccosError(step, res.status, `HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

export async function login(email: string, pw: string): Promise<{ uid: string; key: string }> {
  const ak = await call('login', 'POST', `${AUTH}/accessKeys`, null, {
    email,
    password: pw,
    signedInByFacebook: 'F',
  });
  const uid = String(ak.userId ?? ak.id ?? '');
  const key = ak.accessKey ?? ak.accesskey;
  if (!uid || !key) {
    throw new ArccosError('login', null, `Unexpected login response keys: ${Object.keys(ak).join(',')}`);
  }
  return { uid, key };
}

export async function tokenFor(uid: string, key: string): Promise<string> {
  const tok = await call('token', 'POST', `${AUTH}/tokens`, null, { userId: uid, accessKey: key });
  const t = tok.token ?? tok.jwt ?? tok.accessToken;
  if (!t) throw new ArccosError('token', null, `Token call returned keys: ${Object.keys(tok).join(',')}`);
  return t;
}

// Full rounds list, newest first (same pagination rules as arccos_export.py:
// stop on short page, hard cap of 25 pages).
export async function fetchRoundsList(uid: string, token: string): Promise<any[]> {
  const rows: any[] = [];
  let offset = 0;
  let pages = 0;
  for (;;) {
    const page = await call(
      'rounds-list',
      'GET',
      `${API}/users/${uid}/rounds?offSet=${offset}&limit=${PAGE}&roundType=flagship`,
      token
    );
    const batch: any[] | null = Array.isArray(page) ? page : Array.isArray(page?.rounds) ? page.rounds : null;
    if (!batch || !batch.length) break;
    pages += 1;
    rows.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
    if (pages >= 25) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  return rows;
}

export function fetchRoundDetail(uid: string, rid: string | number, token: string): Promise<any> {
  return call('round-detail', 'GET', `${API}/users/${uid}/rounds/${rid}`, token);
}

export function fetchSmartDistances(uid: string, token: string): Promise<any> {
  return call('smart-distances', 'GET', `${API}/v4/clubs/user/${uid}/smart-distances`, token);
}

export function fetchHandicap(uid: string, token: string): Promise<any> {
  return call('handicap', 'GET', `${API}/users/${uid}/handicaps/latest`, token);
}
