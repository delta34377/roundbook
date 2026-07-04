// verify-derive-parity.mjs — proves the arccos-sync edge function derives the
// EXACT same dashboard payload as prep_data.py (the reference).
//
// Runs supabase/functions/arccos-sync/derive.ts under Node against the local
// raw export and deep-diffs the result against dash_data.json (which
// prep_data.py provably regenerates byte-for-byte from the same file). Any
// difference at all is a failure: CLAUDE.md rule 7 says when two derivations
// disagree, find out why before shipping either.
//
// Usage (needs Node >= 22.6 for --experimental-strip-types, and the raw
// export, which is local-only and never committed):
//   node --experimental-strip-types web/scripts/verify-derive-parity.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deriveDashData } from '../../supabase/functions/arccos-sync/derive.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const rawPath = path.join(root, 'arccos-data-full.json');
const refPath = path.join(root, 'dash_data.json');

if (!fs.existsSync(rawPath)) {
  console.error(
    'No arccos-data-full.json (it is local-only, never committed).\n' +
      'Run: python3 arccos_export.py --all   then re-run this check.'
  );
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
const got = deriveDashData(raw);

const same = (a, b) => a === b || (a === 0 && b === 0); // JSON has no -0 anyway
function* diff(a, b, p = '') {
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    if (!same(a, b)) yield { path: p, ref: a, got: b };
    return;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    yield { path: p, ref: a, got: b };
    return;
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) {
      yield { path: p + '.length', ref: a.length, got: b.length };
      return;
    }
    for (let i = 0; i < a.length; i++) yield* diff(a[i], b[i], `${p}[${i}]`);
    return;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!(k in a) || !(k in b)) {
      yield { path: `${p}.${k}`, ref: k in a ? a[k] : '<missing>', got: k in b ? b[k] : '<missing>' };
    } else {
      yield* diff(a[k], b[k], `${p}.${k}`);
    }
  }
}

const diffs = [...diff(ref, got)];
if (diffs.length) {
  console.error(`PARITY FAILURE: ${diffs.length} difference(s) vs prep_data.py output`);
  for (const d of diffs.slice(0, 20)) {
    console.error(`  ${d.path}: reference=${JSON.stringify(d.ref)} derived=${JSON.stringify(d.got)}`);
  }
  process.exit(1);
}
console.log(
  `PARITY OK: derive.ts matches prep_data.py exactly ` +
    `(${got.meta.nRounds} rounds, ${got.meta.nHoles} holes, ${got.meta.dateMin} to ${got.meta.dateMax})`
);
