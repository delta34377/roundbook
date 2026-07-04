# The Round Book

Personal Arccos golf analytics, live on the internet for one person. A login-gated
dashboard (Vercel + Supabase) that re-syncs from Arccos on a schedule, plus the
original local Python pipeline it grew out of. Private repo; see `CLAUDE.md` for
the project brain (rules, data conventions, schema).

```
Arccos API ──> supabase/functions/arccos-sync (Deno, cron-scheduled)
                 │  fetches only NEW rounds (GPS geometry cache in
                 │  roundbook_raw_rounds; service-role only)
                 │  re-derives the payload with derive.ts (exact prep_data.py math)
                 ▼
             roundbook_data  (single JSONB row, owner-only SELECT)
                 ▼
             web/  (Vite app: Supabase login -> the dashboard engine,
                    verbatim from build_dash.py)
```

The local pipeline still works standalone and stays the reference:
`python3 arccos_export.py --all && python3 prep_data.py && python3 build_dash.py`.

## One-time setup

### 1. Supabase project (~5 min)

1. [database.new](https://database.new) -> create a project (any name, e.g. `roundbook`).
2. SQL Editor -> paste and run `supabase/schema.sql`.
3. Authentication -> Users -> Add user: your email + a strong password
   (auto-confirm on). This is the only account that can read the data; the RLS
   policy in the schema is pinned to `markgreenfield1@gmail.com`.
4. Authentication -> Sign In / Up -> disable "Allow new users to sign up"
   (strangers could otherwise create accounts; they'd see no data, but why let them).

### 2. Seed the data (~2 min)

From the repo root, with the service_role key from Settings -> API Keys:

```
cd web && npm install && cd ..
SUPABASE_URL=https://<PROJECT_REF>.supabase.co \
SUPABASE_SERVICE_KEY=<service_role key> \
node web/scripts/seed-roundbook-data.mjs
```

If `arccos-data-full.json` sits in the repo root (gitignored; regenerate with
`arccos_export.py`), the script also preloads the geometry cache so the first
sync fetches nothing it already has.

### 3. Deploy the site (~3 min)

1. [vercel.com/new](https://vercel.com/new) -> import this repo.
2. Root Directory: `web` (framework auto-detects as Vite).
3. Environment variables:
   - `VITE_SUPABASE_URL` = `https://<PROJECT_REF>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = the anon/public key
4. Deploy. Log in at the Vercel URL with the account from step 1.3.

By default the data is owner-only: reads go through RLS that only your login
satisfies. To let anyone with the link VIEW the dashboard, run the optional
public-read policy in supabase/schema.sql (derived stats only, no GPS; the
sync stays owner-only either way). The same file has the revert. For local dev: copy `web/.env.example` to
`web/.env.local`, fill it in, `npm run dev`.

### 4. The self-updating part (~10 min)

Needs the Supabase CLI (`npm i -g supabase`):

```
supabase login
supabase link --project-ref <PROJECT_REF>
supabase secrets set ARCCOS_EMAIL=<arccos login> ARCCOS_PASSWORD=<arccos password> SYNC_KEY=<secret key>
supabase functions deploy arccos-sync
```

Then Dashboard -> Database -> Extensions: enable `pg_cron` and `pg_net`, and run
the Vault + `cron.schedule` template at the bottom of `supabase/schema.sql`
(fill in `<PROJECT_REF>` and the service key). Daily 09:00 UTC by default.

Smoke test (the function rejects anything but the sync key):

```
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/arccos-sync \
  -H "Authorization: Bearer <service_role key>" \
  -H "Content-Type: application/json" -d '{}'
```

Expect JSON with rounds/holes counts and the through-date. `{"full": true}`
refetches all geometry if the cache is ever suspect. Optional secret
`ROUNDBOOK_HCP` overrides the handicap used by the dashboard (default 13.7).

The site's **Sync button** (top right after login) triggers the same function
with your login session token; the function accepts it only when the token's
email matches `OWNER_EMAIL` (secret, defaults to the owner's address), so no
secret key ever reaches the browser and nobody else can trigger it.

## Using it

- **Sync button** (top right): pulls the latest rounds from Arccos on demand;
  the nightly schedule is the backstop.
- **The link remembers your view**: the tab and course filter live in the URL
  (e.g. `#tab=tiger5&course=Birchwood%20CC`), so bookmarks and reopened tabs
  land where you left off.
- **Add it to your phone's home screen** (iPhone: Share -> Add to Home Screen)
  and it opens full-screen with its own icon, like a native app.

## Verification

- `node --experimental-strip-types web/scripts/verify-derive-parity.mjs` -
  proves the sync's derivation matches `prep_data.py` EXACTLY on the local raw
  export. Run it after touching `prep_data.py` or `derive.ts`. Passing Jul 2026.
- `cd web && npm run build` after any web change (CLAUDE.md rule 4).
- The engine itself was verified against `golf-dashboard.html` side by side in
  a browser at port time: 2,400 text cells (4 course filters x 10 tabs) and all
  19 interactive controls matched exactly.

## Privacy

- Private repo. `arccos-data-full.json` (per-shot GPS) is gitignored anyway.
- GPS geometry lives server-side only (`roundbook_raw_rounds`: RLS, no
  policies, client grants revoked). The dashboard payload has no coordinates.
- Arccos credentials exist only as Supabase secrets.
- The sync endpoint requires the sync key, so the public anon/publishable key
  cannot trigger Arccos traffic.
