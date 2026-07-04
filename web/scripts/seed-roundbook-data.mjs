// seed-roundbook-data.mjs — one-shot seed of the Supabase tables from the
// repo's derived dataset, so the site works before (or without) the
// arccos-sync schedule.
//
// Seeds:
//   roundbook_data        <- dash_data.json (+ hcp, default 13.7)
//   roundbook_raw_rounds  <- arccos-data-full.json IF it exists locally
//                            (gitignored; seeding it means the first sync
//                            only fetches genuinely new rounds)
//
// Usage (service_role key from Supabase > Settings > API; run supabase/schema.sql first):
//   cd web && npm install && cd ..
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_KEY=<service_role> \
//     node web/scripts/seed-roundbook-data.mjs
//   (ROUNDBOOK_HCP overrides the 13.7 default)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY (service role) first.');
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

async function main() {
  const payload = JSON.parse(fs.readFileSync(path.join(root, 'dash_data.json'), 'utf8'));
  const envHcp = Number(process.env.ROUNDBOOK_HCP);
  payload.hcp = Number.isFinite(envHcp) && envHcp > 0 ? envHcp : 13.7;

  const { error } = await supabase.from('roundbook_data').upsert({
    id: 1,
    data: payload,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error('roundbook_data upsert failed:', error.message);
    console.error('Did you run supabase/schema.sql first?');
    process.exit(1);
  }
  console.log(
    `roundbook_data seeded: ${payload.meta.nRounds} rounds, ${payload.meta.nHoles} holes, ` +
      `${payload.meta.dateMin} to ${payload.meta.dateMax}, hcp ${payload.hcp}`
  );

  const rawPath = path.join(root, 'arccos-data-full.json');
  if (!fs.existsSync(rawPath)) {
    console.log(
      'No local arccos-data-full.json (it is gitignored), skipping the raw-round ' +
        'cache. The first arccos-sync run will fetch all geometry itself.'
    );
    return;
  }

  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  const details = Array.isArray(raw.rounds_detail) ? raw.rounds_detail : [];
  let ok = 0;
  for (const detail of details) {
    const rid = detail.roundId ?? detail.id;
    if (rid == null || !Array.isArray(detail.holes)) continue;
    const { error: rawErr } = await supabase.from('roundbook_raw_rounds').upsert({
      round_id: rid,
      start_time: detail.startTime ?? null,
      payload: detail,
      fetched_at: new Date().toISOString(),
    });
    if (rawErr) {
      console.error(`roundbook_raw_rounds upsert failed for ${rid}:`, rawErr.message);
      process.exit(1);
    }
    ok += 1;
  }
  console.log(`roundbook_raw_rounds seeded: ${ok} rounds of shot geometry cached.`);
}

main();
