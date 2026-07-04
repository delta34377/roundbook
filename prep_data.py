#!/usr/bin/env python3
"""
prep_data.py - arccos-data-full.json -> dash_data.json

Derives the full per-hole dataset the dashboard runs on. Consolidates the
base extraction plus the agr / apd / dc augmentations into one pass.

Usage:
  python3 prep_data.py                          # arccos-data-full.json -> dash_data.json
  python3 prep_data.py raw.json out.json        # explicit paths

Field reference (hole record):
  h     hole number            par   GPS-inferred par (verified vs scorecards)
  score noOfShots              putts Arccos putt count (Air caveat: may include fringe)
  gir   1/0/None               fw    1/0/None (None on par 3)   miss 'L'/'R'/''
  drv   driver distance yds    tee   tee club name              pen  penalty strokes
  pd    putt distances (ft)    ap    [startYd, proxFt] shots from >=50yd w/ GPS ends
  appd  last non-putt shot start distance (yds, any length)
  agr   approach-at-green: [club, startYd, proxFt, crossFt(+R/-L), alongFt(+long/-short)]
        = closest-finishing non-putt, non-penalty shot from >30yd ending <=50yd of pin
  apd   approach distance for Tiger inside-150 = last non-putt shot starting >30yd
  dc    double-chip flag: >=2 non-putt shots starting <=30yd
"""
import json, math, sys
from statistics import mean, median
from collections import defaultdict, Counter

SRC = sys.argv[1] if len(sys.argv) > 1 else "arccos-data-full.json"
OUT = sys.argv[2] if len(sys.argv) > 2 else "dash_data.json"

d = json.load(open(SRC))
M2Y = 1.09361
M2F = 3.28084

def TF(x): return x == "T"

def yd(a, b, c, e):
    if None in (a, b, c, e): return None
    R = 6371000.0
    p1, p2 = math.radians(a), math.radians(c)
    dp = math.radians(c - a); dl = math.radians(e - b)
    x = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return R * 2 * math.atan2(math.sqrt(x), math.sqrt(1-x)) * M2Y

def enu(lat, lon, latp, lonp):
    """meters east/north relative to pin"""
    E = (lon - lonp) * math.cos(math.radians(latp)) * 111320.0
    N = (lat - latp) * 110540.0
    return E, N

def par_of(h):
    s = h.get("shots", [])
    if not s: return 4
    if h.get("approachShotId") == 1: return 3
    L = yd(s[0].get("startLat"), s[0].get("startLong"), h.get("pinLat"), h.get("pinLong"))
    if L is None: return 4
    return 3 if L < 240 else (4 if L <= 470 else 5)

# EXACT mapping from bag config (clubType 35 = 3-hybrid; 3W in bag but no shots)
NAME = {1:"Driver",2:"3W",35:"3H",5:"4i",6:"5i",7:"6i",8:"7i",9:"8i",10:"9i",
        11:"PW",44:"GW",53:"56\u00b0",56:"60\u00b0",12:"Putter"}
CID2NAME = {1:"Driver",2:"3W",3:"3H",4:"4i",5:"5i",6:"6i",7:"7i",8:"8i",9:"9i",
            10:"PW",11:"GW",12:"56\u00b0",13:"60\u00b0",14:"Putter"}

def cat_of(ct):
    if ct in (1,2,35): return "wood"
    if ct in (5,6,7,8,9,10,11): return "iron"
    if ct in (44,53,56): return "wedge"
    return "putter" if ct == 12 else "other"

def cat_cid(cid):
    if cid in (1,2,3): return "wood"
    if cid in (4,5,6,7,8,9,10): return "iron"
    if cid in (11,12,13): return "wedge"
    return "putter"

def agr_of(s, latp, lonp):
    """approach-at-green: closest-finishing non-putt, non-penalty shot from >30yd ending <=50yd of pin"""
    if latp is None: return None
    cands = []
    for sh in s:
        if sh.get("clubType") == 12 or sh.get("noOfPenalties", 0): continue
        sd = yd(sh.get("startLat"), sh.get("startLong"), latp, lonp)
        ed = yd(sh.get("endLat"), sh.get("endLong"), latp, lonp)
        if sd is None or ed is None or sd <= 30 or ed > 50: continue
        cands.append((sh, sd, ed))
    if not cands: return None
    sh, sd, ed = min(cands, key=lambda x: x[2])
    Es, Ns = enu(sh.get("startLat"), sh.get("startLong"), latp, lonp)
    Ee, Ne = enu(sh.get("endLat"), sh.get("endLong"), latp, lonp)
    plen = math.hypot(Es, Ns) or 1
    pdx, pdy = -Es/plen, -Ns/plen          # play direction (toward pin)
    rdx, rdy = pdy, -pdx                   # right of play
    along = (Ee*pdx + Ne*pdy) * 3.28084    # + long, - short
    cross = (Ee*rdx + Ne*rdy) * 3.28084    # + right, - left
    return [NAME.get(sh.get("clubType"), "?"), round(sd), round(ed*3), round(cross), round(along)]

rounds = []
full = defaultdict(list)
usage = Counter()
drv_shots = []

for rd in d["rounds_detail"]:
    dt = (rd.get("startTime") or "")[:10]
    crs = rd.get("courseName", "?")
    hrecs = []; rs = rp = 0; nh = 0
    for h in rd["holes"]:
        if not h or not (h.get("noOfShots") or 0): continue
        par = par_of(h); sc = h["noOfShots"]; nh += 1; rs += sc; rp += par
        s = h.get("shots", []); tee = s[0] if s else None
        pin = (h.get("pinLat"), h.get("pinLong"))
        pen = sum(x.get("noOfPenalties", 0) for x in s)
        drv = None
        if par in (4, 5) and tee and tee.get("clubType") == 1:
            drv = round((tee.get("distance") or 0) * M2Y)
            drv_shots.append({"dist": drv, "date": dt, "course": crs,
                              "hole": h.get("holeId"), "fw": (1 if TF(h.get("isFairWay")) else 0)})
        ap = []; appd = None
        for sh in s:
            ct = sh.get("clubType"); usage[ct] += 1
            sd = yd(sh.get("startLat"), sh.get("startLong"), pin[0], pin[1])
            if ct != 12 and sd is not None: appd = round(sd)   # last non-putt shot start dist
            if ct == 12 or sh.get("noOfPenalties", 0): continue
            y = (sh.get("distance") or 0) * M2Y
            if y >= 20: full[ct].append(round(y))
            ed = yd(sh.get("endLat"), sh.get("endLong"), pin[0], pin[1])
            if sd is not None and ed is not None and sd >= 50: ap.append([round(sd), round(ed*3)])
        pd = [round((sh.get("distance") or 0) * M2F, 1) for sh in s if sh.get("clubType") == 12]
        # Tiger fields: apd (last non-putt start >30yd, penalties included) and double chips
        apd = None; chips = 0
        for sh in s:
            if sh.get("clubType") == 12: continue
            sd = yd(sh.get("startLat"), sh.get("startLong"), pin[0], pin[1]) if pin[0] is not None else None
            if sd is None: continue
            if sd > 30: apd = round(sd)
            else: chips += 1
        dc = 1 if chips >= 2 else 0
        miss = ""
        if par != 3 and h.get("isFairWay") == "F":
            miss = "L" if TF(h.get("isFairWayLeft")) else ("R" if TF(h.get("isFairWayRight")) else "")
        hrecs.append({"h": h.get("holeId"), "par": par, "score": sc, "putts": h.get("putts"),
                      "gir": (1 if TF(h.get("isGir")) else (0 if h.get("isGir") == "F" else None)),
                      "fw": (None if par == 3 else (1 if TF(h.get("isFairWay")) else 0)),
                      "miss": miss, "drv": drv,
                      "tee": NAME.get(tee.get("clubType")) if tee else None,
                      "pen": pen, "pd": pd, "ap": ap, "appd": appd,
                      "agr": agr_of(s, pin[0], pin[1]), "apd": apd, "dc": dc})
    if nh:
        rounds.append({"id": rd.get("roundId"), "date": dt, "course": crs, "n": nh,
                       "score": rs, "par": rp, "ou": rs - rp,
                       "pace18": round(rs/nh*18, 1), "holes": hrecs})

ladder = []
for c in d["smart_distances"]["clubs"]:
    cid = c.get("clubId")
    sd = c.get("smartDistance", {}).get("distance")
    n = c.get("usage", {}).get("count", 0)
    rng = c.get("range") or {}
    if sd and n >= 2:
        ladder.append({"dist": round(sd), "shots": n, "low": round(rng.get("low") or sd),
                       "high": round(rng.get("high") or sd), "cat": cat_cid(cid),
                       "name": CID2NAME.get(cid, "?")})
ladder.sort(key=lambda x: -x["dist"])

clubs = []
for ct, ds in full.items():
    if len(ds) < 2: continue
    clubs.append({"name": NAME.get(ct, "?"), "cat": cat_of(ct), "count": usage[ct],
                  "full": len(ds), "avg": round(mean(ds)), "med": round(median(ds)),
                  "min": min(ds), "max": max(ds), "dists": sorted(ds)})
clubs.sort(key=lambda x: -x["med"])

usage_list = sorted([{"name": NAME.get(ct, "?"), "count": n} for ct, n in usage.items()],
                    key=lambda x: -x["count"])

hc = d["handicap"]
cat = {"overall": round(abs(hc["userHcp"]), 1), "driving": round(abs(hc["driveHcp"]), 1),
       "approach": round(abs(hc["approachHcp"]), 1), "chipping": round(abs(hc["chipHcp"]), 1),
       "sand": round(abs(hc["sandHcp"]), 1), "putting": round(abs(hc["puttHcp"]), 1)}

dates = sorted(r["date"] for r in rounds)
payload = {"meta": {"nRounds": len(rounds), "nHoles": sum(r["n"] for r in rounds),
                    "dateMin": dates[0], "dateMax": dates[-1],
                    "courses": sorted(set(r["course"] for r in rounds))},
           "rounds": rounds, "ladder": ladder, "clubs": clubs, "usage": usage_list,
           "cat": cat, "driverShots": drv_shots}

json.dump(payload, open(OUT, "w"))
print(f"wrote {OUT}: {len(rounds)} rounds, {payload['meta']['nHoles']} holes, "
      f"{payload['meta']['dateMin']} to {payload['meta']['dateMax']}")
