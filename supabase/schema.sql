-- ============================================================================
-- The Round Book — Supabase schema (its own project, separate from dogleg)
-- ============================================================================
-- Two tables:
--   roundbook_data       one row (id=1): the derived dashboard payload the
--                         web app reads. No GPS coordinates.
--   roundbook_raw_rounds  per-round Arccos shot geometry cached by the
--                         arccos-sync edge function so a sync only fetches
--                         NEW rounds. Contains GPS traces of every shot, so
--                         it is server-side only: RLS enabled, zero policies,
--                         client grants revoked. Only the service role
--                         (the sync function / seed script) touches it.
--
-- Writes come exclusively through the service role; there are deliberately
-- no INSERT/UPDATE/DELETE policies for clients.
--
-- Idempotent: safe to re-run.
-- ============================================================================

create table if not exists public.roundbook_data (
  id          integer primary key default 1 check (id = 1),
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.roundbook_data enable row level security;

-- Read: the owner only. This project has a single real user; the check is on
-- the JWT email so it works without any profiles table. Change the address
-- here if the login account ever changes.
drop policy if exists "roundbook_data owner read" on public.roundbook_data;
create policy "roundbook_data owner read"
  on public.roundbook_data
  for select
  using ((auth.jwt() ->> 'email') = 'markgreenfield1@gmail.com');

create table if not exists public.roundbook_raw_rounds (
  round_id    bigint primary key,
  start_time  text,
  payload     jsonb not null,
  fetched_at  timestamptz not null default now()
);

alter table public.roundbook_raw_rounds enable row level security;
-- No policies on purpose: GPS shot traces never reach a client session.
revoke all on table public.roundbook_raw_rounds from anon, authenticated;

-- ============================================================================
-- Scheduling the sync (run once, after deploying the arccos-sync function and
-- setting its secrets — full steps in README.md):
--
--   supabase secrets set ARCCOS_EMAIL=... ARCCOS_PASSWORD=... SYNC_KEY=<secret key>
--   supabase functions deploy arccos-sync
--
-- Then enable the pg_cron and pg_net extensions (Dashboard > Database >
-- Extensions), store the service role key in Vault, and schedule:
--
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'roundbook_sync_key');
--
--   select cron.schedule(
--     'roundbook-arccos-sync',
--     '0 9 * * *',   -- daily 09:00 UTC (5am ET): after any evening round
--     $cron$
--     select net.http_post(
--       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/arccos-sync',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || (
--           select decrypted_secret from vault.decrypted_secrets
--           where name = 'roundbook_sync_key')),
--       body := '{}'::jsonb,
--       timeout_milliseconds := 120000
--     );
--     $cron$
--   );
--
-- Useful afterwards:
--   select * from cron.job;                                  -- see the schedule
--   select * from cron.job_run_details order by start_time desc limit 10;
--   select cron.unschedule('roundbook-arccos-sync');         -- stop it
-- ============================================================================
