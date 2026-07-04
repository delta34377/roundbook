// derive.ts — TypeScript port of prep_data.py (the reference).
// Turns a raw Arccos export shape into the dashboard payload. Dependency-free
// and runtime-agnostic on purpose: the arccos-sync edge function imports it
// under Deno, and web/scripts/verify-derive-parity.mjs runs the SAME file under
// Node against the real export and requires an exact deep-diff match with
// prep_data.py's output. If you change prep_data.py, change this and re-run
// the parity check; if the two ever disagree, prep_data.py wins.
//
// Field reference (hole record) — same as prep_data.py:
//   h     hole number            par   GPS-inferred par (verified vs scorecards)
//   score noOfShots              putts Arccos putt count (Air caveat: may include fringe)
//   gir   1/0/null               fw    1/0/null (null on par 3)   miss 'L'/'R'/''
//   drv   driver distance yds    tee   tee club name              pen  penalty strokes
//   pd    putt distances (ft)    ap    [startYd, proxFt] shots from >=50yd w/ GPS ends
//   appd  last non-putt shot start distance (yds, any length)
//   agr   approach-at-green: [club, startYd, proxFt, crossFt(+R/-L), alongFt(+long/-short)]
//   apd   approach distance for Tiger inside-150 = last non-putt shot starting >30yd
//   dc    double-chip flag: >=2 non-putt shots starting <=30yd

const M2Y = 1.09361;
const M2F = 3.28084;

// Python's round(): banker's rounding (half to even) evaluated on the EXACT
// decimal value of the IEEE-754 double, not on a formatted string. Math.round
// rounds halves up and would flip values like 2.5 or 258.5. This decomposes
// the double into sign * M * 2^E with BigInt and rounds the exact rational
// M * 10^nd / 2^-E half-to-even, which is bit-for-bit what CPython does.
function pyRound(x: number, ndigits?: number): number {
  const nd = ndigits ?? 0;
  if (!Number.isFinite(x) || x === 0) return x === 0 ? 0 : x;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const bits = view.getBigUint64(0);
  const neg = bits >> 63n === 1n;
  const expBits = Number((bits >> 52n) & 0x7ffn);
  const mantBits = bits & 0xfffffffffffffn;
  let M: bigint;
  let E: number;
  if (expBits === 0) {
    M = mantBits;
    E = -1074;
  } else {
    M = mantBits | (1n << 52n);
    E = expBits - 1075;
  }
  // |x| * 10^nd as the exact fraction A / D
  let A = M * 10n ** BigInt(Math.max(nd, 0));
  let D = nd < 0 ? 10n ** BigInt(-nd) : 1n;
  if (E >= 0) A <<= BigInt(E);
  else D <<= BigInt(-E);
  let Q = A / D;
  const rem = A % D;
  const twice = rem * 2n;
  if (twice > D || (twice === D && (Q & 1n) === 1n)) Q += 1n;
  let q = Number(Q);
  if (neg) q = -q;
  if (nd > 0) return q / 10 ** nd;
  if (nd < 0) return q * 10 ** -nd;
  return q;
}

// statistics.mean / statistics.median over the integer lists we feed them
// reduce to exact integer sums and correctly-rounded division, which plain JS
// arithmetic reproduces exactly.
function mean(a: number[]): number {
  let s = 0;
  for (const v of a) s += v;
  return s / a.length;
}
function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const TF = (x: unknown) => x === 'T';

// math.radians(x) in CPython is x * (pi/180) with the factor rounded ONCE to a
// double at compile time; (x * PI) / 180 rounds twice and can differ by 1 ulp,
// which matters when the result gets rounded to integer yards.
const DEG = Math.PI / 180.0;

// Haversine distance in yards (same constants and operation order as prep_data.py)
function yd(a: unknown, b: unknown, c: unknown, e: unknown): number | null {
  if (a == null || b == null || c == null || e == null) return null;
  const A = a as number, B = b as number, Cc = c as number, Ee = e as number;
  const R = 6371000.0;
  const p1 = A * DEG;
  const p2 = Cc * DEG;
  const dp = (Cc - A) * DEG;
  const dl = (Ee - B) * DEG;
  const x =
    Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * M2Y;
}

// meters east/north relative to pin
function enu(lat: number, lon: number, latp: number, lonp: number): [number, number] {
  const E = (lon - lonp) * Math.cos(latp * DEG) * 111320.0;
  const N = (lat - latp) * 110540.0;
  return [E, N];
}

function parOf(h: any): number {
  const s: any[] = h.shots ?? [];
  if (!s.length) return 4;
  if (h.approachShotId === 1) return 3;
  const L = yd(s[0]?.startLat, s[0]?.startLong, h.pinLat, h.pinLong);
  if (L == null) return 4;
  return L < 240 ? 3 : L <= 470 ? 4 : 5;
}

// EXACT mapping from bag config (clubType 35 = 3-hybrid; 3W in bag but no shots)
const NAME: Record<number, string> = {
  1: 'Driver', 2: '3W', 35: '3H', 5: '4i', 6: '5i', 7: '6i', 8: '7i', 9: '8i',
  10: '9i', 11: 'PW', 44: 'GW', 53: '56°', 56: '60°', 12: 'Putter',
};
const CID2NAME: Record<number, string> = {
  1: 'Driver', 2: '3W', 3: '3H', 4: '4i', 5: '5i', 6: '6i', 7: '7i', 8: '8i',
  9: '9i', 10: 'PW', 11: 'GW', 12: '56°', 13: '60°', 14: 'Putter',
};

function catOf(ct: number): string {
  if (ct === 1 || ct === 2 || ct === 35) return 'wood';
  if (ct >= 5 && ct <= 11) return 'iron';
  if (ct === 44 || ct === 53 || ct === 56) return 'wedge';
  return ct === 12 ? 'putter' : 'other';
}
function catCid(cid: number): string {
  if (cid === 1 || cid === 2 || cid === 3) return 'wood';
  if (cid >= 4 && cid <= 10) return 'iron';
  if (cid === 11 || cid === 12 || cid === 13) return 'wedge';
  return 'putter';
}

// approach-at-green: closest-finishing non-putt, non-penalty shot from >30yd ending <=50yd of pin
function agrOf(s: any[], latp: any, lonp: any): any[] | null {
  if (latp == null) return null;
  const cands: Array<[any, number, number]> = [];
  for (const sh of s) {
    if (sh.clubType === 12 || (sh.noOfPenalties ?? 0)) continue;
    const sd = yd(sh.startLat, sh.startLong, latp, lonp);
    const ed = yd(sh.endLat, sh.endLong, latp, lonp);
    if (sd == null || ed == null || sd <= 30 || ed > 50) continue;
    cands.push([sh, sd, ed]);
  }
  if (!cands.length) return null;
  let best = cands[0];
  for (const c of cands) if (c[2] < best[2]) best = c; // min() keeps the first on ties
  const [sh, sd, ed] = best;
  const [Es, Ns] = enu(sh.startLat, sh.startLong, latp, lonp);
  const [Ee, Ne] = enu(sh.endLat, sh.endLong, latp, lonp);
  const plen = Math.hypot(Es, Ns) || 1;
  const pdx = -Es / plen, pdy = -Ns / plen; // play direction (toward pin)
  const rdx = pdy, rdy = -pdx;              // right of play
  const along = (Ee * pdx + Ne * pdy) * 3.28084; // + long, - short
  const cross = (Ee * rdx + Ne * rdy) * 3.28084; // + right, - left
  return [NAME[sh.clubType] ?? '?', pyRound(sd), pyRound(ed * 3), pyRound(cross), pyRound(along)];
}

export function deriveDashData(d: any): any {
  const rounds: any[] = [];
  const full = new Map<number, number[]>();       // defaultdict(list), insertion-ordered
  const usage = new Map<number, number>();        // Counter, insertion-ordered
  const drvShots: any[] = [];

  for (const rd of d.rounds_detail) {
    const dt = ((rd.startTime ?? '') as string).slice(0, 10);
    const crs = rd.courseName ?? '?';
    const hrecs: any[] = [];
    let rs = 0, rp = 0, nh = 0;
    for (const h of rd.holes) {
      if (!h || !(h.noOfShots ?? 0)) continue;
      const par = parOf(h);
      const sc = h.noOfShots;
      nh += 1; rs += sc; rp += par;
      const s: any[] = h.shots ?? [];
      const tee = s.length ? s[0] : null;
      const pin: [any, any] = [h.pinLat, h.pinLong];
      let pen = 0;
      for (const x of s) pen += x.noOfPenalties ?? 0;
      let drv: number | null = null;
      if ((par === 4 || par === 5) && tee && tee.clubType === 1) {
        drv = pyRound((tee.distance ?? 0) * M2Y);
        drvShots.push({
          dist: drv, date: dt, course: crs,
          hole: h.holeId ?? null, fw: TF(h.isFairWay) ? 1 : 0,
        });
      }
      const ap: any[] = [];
      let appd: number | null = null;
      for (const sh of s) {
        const ct = sh.clubType;
        usage.set(ct, (usage.get(ct) ?? 0) + 1);
        const sd = yd(sh.startLat, sh.startLong, pin[0], pin[1]);
        if (ct !== 12 && sd != null) appd = pyRound(sd); // last non-putt shot start dist
        if (ct === 12 || (sh.noOfPenalties ?? 0)) continue;
        const y = (sh.distance ?? 0) * M2Y;
        if (y >= 20) {
          if (!full.has(ct)) full.set(ct, []);
          full.get(ct)!.push(pyRound(y));
        }
        const ed = yd(sh.endLat, sh.endLong, pin[0], pin[1]);
        if (sd != null && ed != null && sd >= 50) ap.push([pyRound(sd), pyRound(ed * 3)]);
      }
      const pd: number[] = [];
      for (const sh of s) if (sh.clubType === 12) pd.push(pyRound((sh.distance ?? 0) * M2F, 1));
      // Tiger fields: apd (last non-putt start >30yd, penalties included) and double chips
      let apd: number | null = null;
      let chips = 0;
      for (const sh of s) {
        if (sh.clubType === 12) continue;
        const sd = pin[0] != null ? yd(sh.startLat, sh.startLong, pin[0], pin[1]) : null;
        if (sd == null) continue;
        if (sd > 30) apd = pyRound(sd);
        else chips += 1;
      }
      const dc = chips >= 2 ? 1 : 0;
      let miss = '';
      if (par !== 3 && h.isFairWay === 'F') {
        miss = TF(h.isFairWayLeft) ? 'L' : TF(h.isFairWayRight) ? 'R' : '';
      }
      hrecs.push({
        h: h.holeId ?? null, par, score: sc, putts: h.putts ?? null,
        gir: TF(h.isGir) ? 1 : h.isGir === 'F' ? 0 : null,
        fw: par === 3 ? null : TF(h.isFairWay) ? 1 : 0,
        miss, drv,
        tee: tee ? NAME[tee.clubType] ?? null : null,
        pen, pd, ap, appd,
        agr: agrOf(s, pin[0], pin[1]), apd, dc,
      });
    }
    if (nh) {
      rounds.push({
        id: rd.roundId ?? null, date: dt, course: crs, n: nh,
        score: rs, par: rp, ou: rs - rp,
        pace18: pyRound((rs / nh) * 18, 1), holes: hrecs,
      });
    }
  }

  const ladder: any[] = [];
  for (const c of d.smart_distances.clubs) {
    const cid = c.clubId;
    const sd = c.smartDistance?.distance;
    const n = c.usage?.count ?? 0;
    const rng = c.range ?? {};
    if (sd && n >= 2) {
      ladder.push({
        dist: pyRound(sd), shots: n,
        low: pyRound(rng.low || sd), high: pyRound(rng.high || sd),
        cat: catCid(cid), name: CID2NAME[cid] ?? '?',
      });
    }
  }
  ladder.sort((a, b) => b.dist - a.dist);

  const clubs: any[] = [];
  for (const [ct, ds] of full) {
    if (ds.length < 2) continue;
    clubs.push({
      name: NAME[ct] ?? '?', cat: catOf(ct), count: usage.get(ct) ?? 0,
      full: ds.length, avg: pyRound(mean(ds)), med: pyRound(median(ds)),
      min: Math.min(...ds), max: Math.max(...ds), dists: [...ds].sort((x, y) => x - y),
    });
  }
  clubs.sort((a, b) => b.med - a.med);

  const usageList = [...usage.entries()]
    .map(([ct, n]) => ({ name: NAME[ct] ?? '?', count: n }))
    .sort((a, b) => b.count - a.count);

  const hc = d.handicap;
  const cat = {
    overall: pyRound(Math.abs(hc.userHcp), 1), driving: pyRound(Math.abs(hc.driveHcp), 1),
    approach: pyRound(Math.abs(hc.approachHcp), 1), chipping: pyRound(Math.abs(hc.chipHcp), 1),
    sand: pyRound(Math.abs(hc.sandHcp), 1), putting: pyRound(Math.abs(hc.puttHcp), 1),
  };

  const dates = rounds.map((r) => r.date).sort();
  let nHoles = 0;
  for (const r of rounds) nHoles += r.n;
  return {
    meta: {
      nRounds: rounds.length, nHoles,
      dateMin: dates[0], dateMax: dates[dates.length - 1],
      courses: [...new Set(rounds.map((r) => r.course))].sort(),
    },
    rounds, ladder, clubs, usage: usageList, cat, driverShots: drvShots,
  };
}
