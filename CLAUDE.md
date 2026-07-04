# The Round Book - Arccos golf analytics

Personal golf analytics for Mark (handicap index 13.7, Birchwood CC). Reverse-engineered Arccos Air export, a derived per-hole dataset, a self-contained interactive HTML dashboard, and (Jul 2026) a standalone web app + Supabase backend so the dashboard lives on the internet behind a login and updates itself after every round. Deliberately its own private repo, separate from dogleg.

## Layout

```
arccos_export.py / prep_data.py / build_dash.py   the local pipeline (reference implementation)
dash_data.json / golf-dashboard.html              derived dataset + standalone dashboard artifact
web/                    Vite app: login gate (src/main.js) around the dashboard engine
web/src/engine.js       the dashboard, VERBATIM from build_dash.py's JS
web/src/metrics.js      pure computation layer (agg, BENCH, bench, TOURPROX)
web/src/bodyHtml.js     page skeleton; roundbook.css = styles scoped under .rb-scope
supabase/schema.sql     roundbook_data (payload, owner-only read) + roundbook_raw_rounds (GPS cache, service-role only) + cron template
supabase/functions/arccos-sync/   scheduled sync: Arccos login (secrets), incremental geometry fetch, derive, upsert
web/scripts/seed-roundbook-data.mjs      one-shot seed from dash_data.json (+ raw cache if local export exists)
web/scripts/verify-derive-parity.mjs     derive.ts vs prep_data.py: exact deep-diff, must pass
README.md               one-time deployment steps (Supabase project, Vercel, secrets, cron)
```

## Pipeline (local, unchanged)

```
arccos_export.py  ->  arccos-data-full.json    raw API export (run locally, login prompted)
prep_data.py      ->  dash_data.json           derived per-hole dataset, all analytics fields
build_dash.py     ->  golf-dashboard.html      self-contained dashboard (Chart.js + fonts via CDN)
```

Commands:
```
python3 arccos_export.py --all          # or --after 2026-01-01; password via hidden prompt; Python 3.11+
python3 prep_data.py                    # arccos-data-full.json -> dash_data.json
python3 build_dash.py                   # dash_data.json -> golf-dashboard.html (optional output path arg)
```

Validate the generated JS after EVERY build before showing anything:
```
python3 - <<'PY'
import re
html=open('golf-dashboard.html').read()
open('/tmp/app.js','w').write(re.findall(r'<script>(.*?)</script>', html, re.S)[-1])
PY
node --check /tmp/app.js
```

The pipeline is verified end-to-end: prep_data.py regenerates the shipped dash_data.json from the raw export with an exact deep-diff match (Jul 2026).

## Web app + sync (Jul 2026)

- web/src/engine.js + metrics.js carry the dashboard JS VERBATIM from build_dash.py (rule 1 survives by construction). Only deliberate behavior change: course filter buttons generate from meta.courses instead of the hardcoded three. main.js is auth + mount + the Sync button; deepLinks.js keeps #tab/#course in the URL by driving the engine's own buttons (engine stays verbatim). web/public has the PWA manifest + icons (add-to-home-screen). The mobile tab bar scrolls in one row - that @media block is mirrored in build_dash.py's CSS.
- supabase/functions/arccos-sync: logs into Arccos with Supabase secrets, fetches geometry only for rounds not in roundbook_raw_rounds (plus the 2 most recent, for post-round edits; body {"full":true} refetches all), re-derives, upserts roundbook_data. Callers need the sync key (cron) or the owner's session token (the site's Sync button; OWNER_EMAIL check). Hard failures leave the existing row untouched.
- derive.ts ports prep_data.py exactly, including CPython round() banker's semantics on exact IEEE-754 values and math.radians' single-rounded pi/180 factor.
- Parity proofs: web/scripts/verify-derive-parity.mjs (exact match on the real export, Jul 2026), and a port-time side-by-side in Chromium against golf-dashboard.html (2,400 text cells across 4 course filters x 10 tabs, plus all 19 interactive controls: exact match, zero console errors, headlines flip per filter - rule 2).
- If prep_data.py changes, mirror derive.ts and re-run the parity script. If the dashboard JS changes, change web/src and build_dash.py together or consciously let the standalone HTML freeze.
- Deployment steps: README.md.

## Non-negotiable rules

1. NO HARDCODED CLAIMS. Any number that is Mark's must be computed from the filtered data at render time. Any benchmark must come from the BENCH table (web/src/metrics.js and build_dash.py - keep them identical) or TOURPROX. Any sentence asserting something about his game must be conditional logic that can flip on a different data slice. He has caught hardcoded narrative repeatedly and it destroys trust.
2. Prove dynamism empirically. After adding a headline or insight, simulate its logic against each course filter (All / Birchwood CC / Longshore Golf Club / The Connecticut GC) and confirm the text changes appropriately before presenting.
3. Honest caveats stay in: small sample; Arccos Air has no lie, sand, or strokes-gained data in the export (verified field-by-field, do not pretend otherwise); Air has no putter sensor so fringe strokes may be logged as putts (the Putting tab has a sensitivity toggle, state var frT, thresholds 40/50/60 ft).
4. Build + node --check after every change. For web/ changes: npm run build in web/ and re-run the parity script if derive.ts moved. Fix before presenting.
5. Copy style for anything user-facing: plain, direct, no em dashes, no hollow praise, no AI-sounding filler.
6. Handicap is 13.7 (injected as data['hcp'] in build_dash.py; the seed script and sync function inject it server-side, ROUNDBOOK_HCP secret overrides). Ignore Arccos's internal userHcp (14.9). The cat{} block is Arccos's own category handicaps, display-only.
7. When in doubt about a number, verify against the raw export rather than asserting. If two derivations disagree, find out why before shipping either.

## Data conventions (all verified)

- Per-shot `distance` is METERS. x1.09361 = yards, x3.28084 = feet. A putt's `distance` is the length of the putt faced.
- Hole score = `noOfShots` (not scoreOverride). Holes with no shots are skipped.
- Par is GPS-inferred: approachShotId==1 -> par 3; else first-shot-to-pin distance <240y par 3, <=470y par 4, else par 5. Verified: inferred per-hole par sums exactly to every round's actual scorecard par and over/under (zero gap across all rounds).
- gir: 'T'->1, 'F'->0, else null. fw is null on par 3s. miss is 'L'/'R' only when the fairway was missed.
- Club maps (from Mark's actual bag; 3W is in the bag but has zero recorded shots):
  clubType->name: {1:Driver, 2:3W, 35:3H, 5:4i, 6:5i, 7:6i, 8:7i, 9:8i, 10:9i, 11:PW, 44:GW, 53:56deg, 56:60deg, 12:Putter}
  clubId->name (smart distances): {1:Driver, 2:3W, 3:3H, 4:4i ... 10:PW, 11:GW, 12:56deg, 13:60deg, 14:Putter}
- Rounds are stored newest-first in the payload. Round `id` == Arccos roundId, and ids are monotonic with time, so sort by (date, id) for true play order. Duplicate same-day dates in charts get (1)(2)(3) suffixes via dedupeDates().
- The raw export's holes array is positional: dash hole `h` == holeId == raw index + 1.

## dash_data.json schema

Top level: meta{nRounds,nHoles,dateMin,dateMax,courses}, rounds[], ladder[], clubs[], usage[], cat{}, driverShots[]
Round: id, date, course, n, score, par, ou, pace18, holes[]
Hole:
- h, par, score, putts, gir(1/0/null), fw(1/0/null), miss('L'/'R'/''), drv, tee, pen
- pd   = putt distances faced (ft), same length as putts
- ap   = [startYd, proxFt] for every non-putt, non-penalty shot from >=50yd with GPS ends
- appd = last non-putt shot's start distance (yds, any length)
- agr  = approach-at-green: [club, startYd, proxFt, crossFt(+right/-left), alongFt(+long/-short)] for the closest-finishing non-putt, non-penalty shot from >30yd ending <=50yd of the pin, else null
- apd  = approach distance for Tiger inside-150: last non-putt shot starting >30yd (penalties included)
- dc   = double-chip flag: >=2 non-putt shots starting <=30yd

The served payload (roundbook_data.data) is this plus `hcp`.

Direction math for agr (verified): ENU meters relative to pin E=(lon-lonp)*cos(latp)*111320, N=(lat-latp)*110540; play_dir = unit(-start_vec); right_dir = (play.y, -play.x); along = dot(end,play)*3.28084 (+long/-short); cross = dot(end,right)*3.28084 (+right/-left).

## Dashboard architecture

- build_dash.py: Python string assembly (CSS + JS + BODY templates, data embedded as window.__DATA__), self-contained single file. web/src carries the same CSS/JS/BODY as modules with an initRoundBook(root, data)/destroyRoundBook lifecycle.
- Charts: registry draw(id,cfg) destroys before recreating. Plugins: topLab, endLab, valH (inline bar labels), pinPlot (pin crosshair + green ring), tgt (Tiger 1.5 line). GRID='#243429'; muted text is the hex literal '#93a99c' (there is no MUT constant).
- Global filters: course buttons + date sliders -> filtered() -> agg(). Every tab recomputes from the filter.
- Tabs: Overview, Putting (incl. fringe-putt sensitivity card), Off the Tee, Approach (scoring yardages, proximity-by-club, pin-centered miss scatter), The Bag, Rounds (click a round for full report), Takeaways, Anatomy (4-bucket decomposition + vs-handicap verdicts), Benchmarks (BENCH table + hcp slider), Tiger 5.
- BENCH table is the single source of handicap references, linear interpolation via bench(stat,hcp). TOURPROX holds tour proximity references.
- Exact decomposition identity (must always sum to over-par): score-par = (putts-2) + [(score-putts)-(par-2)]; buckets are Approach (residual), Putting (putts-2), Penalties (pen), Short game (dc).
- Tiger 5 (Scott Fawcett DECADE): doubles+ (>=par+2), three-putts (>=3), par-5 bogeys+, bogeys+ inside 150 (apd<=150), double chips (dc). A hole can trip several categories; totals count mistake-events, not holes. Inside-150 uses approach distance, not lie (no lie data exists).

## Snapshot (10 rounds / 92 holes through Jun 25 2026 - refresh after new data, do not treat as constants)

+19.2/18 over par. GIR 43% (vs ~35% for a 13.7 - strength). Scrambling 6% (vs ~32% - the big leak). Putts 40.1/18, 29% three-putt (ceiling; Air caveat - at a 40ft fringe threshold this falls to 37.4 and 20%). Decomposition/18: Approach +11.7, Putting +4.1, Penalties +2.3, Short game +1.0. Driver median 258y. Sharpest club 8i (13 ft); GW is the scoring-zone leak (48 ft over the most shots). 65% of missed greens finish short (club selection, not swing path). Tiger 5: 11.9 mistakes/rd, biggest = bogey+ inside 150 (5.1/rd); 32% of holes mistake-free.

## Privacy

This repo is PRIVATE and stays that way. arccos-data-full.json contains GPS coordinates of every shot and is gitignored anyway (belt and braces); regenerate it locally when needed. Server-side, raw geometry lives only in roundbook_raw_rounds (RLS, zero policies, service role only); roundbook_data is readable only by the owner's login and contains no coordinates. Never put Arccos credentials in code, the repo, or client-side anything; the exporter prompts at runtime and the sync function reads Supabase secrets.

## Roadmap

1. ~~React/web + Supabase port with a scheduled Arccos sync so the dashboard self-updates.~~ Built (Jul 2026). Remaining: the one-time deployment in README.md (Supabase project, schema, seed, Vercel, secrets, cron).
2. Next analyses, in priority order: par-5 anatomy (worst hole type, 0 birdies, ties to Tiger-5 par-5 bogeys), score-by-approach-distance, blow-up/bounce-back tendency.
