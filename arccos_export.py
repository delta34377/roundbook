#!/usr/bin/env python3
"""
arccos_export.py — ONE complete Arccos export. Everything the API exposes.

Pulls every endpoint I know of and writes them to a single JSON file, with a
date filter and a manifest at the end showing exactly what landed and what
failed. Standard library only; talks only to Arccos's own two servers with your
own login; password via a hidden prompt.

Sections pulled:
  profile, bag/clubs, smart distances, handicap (latest + history),
  courses played, personal bests, every round's shot GEOMETRY,
  the strokes-gained / per-shot LIE analysis, strokes-to-get-down,
  course detail (real hole pars/yardages), and per-club shot history.

Choosing rounds:
  python3 arccos_export.py                          # last 25 rounds
  python3 arccos_export.py --after 2025-01-01       # every round since that date
  python3 arccos_export.py --after 2025-04-01 --before 2025-09-30
  python3 arccos_export.py --after 2024-01-01 --rounds 500   # range + safety cap
  python3 arccos_export.py --all                    # entire history, no cap

Dates are YYYY-MM-DD. Outputs: arccos-data-full.json  (upload it back to chat)
Requires Python >= 3.11.
"""
from __future__ import annotations
import argparse, getpass, json, os, re, sys, time
import urllib.error, urllib.request
from datetime import datetime, timezone

AUTH = "https://authentication.arccosgolf.com"
API  = "https://api.arccosgolf.com"
UA   = "arccos-export/1.0 (personal data export; stdlib)"
PAGE = 200
DELAY = 0.3


def call(method, url, token=None, body=None, timeout=30):
    data = json.dumps(body).encode() if body is not None else None
    h = {"User-Agent": UA, "Accept": "application/json"}
    if body is not None: h["Content-Type"] = "application/json"
    if token: h["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read().decode()
    return r.status, (json.loads(raw) if raw else {})


def safe(method, url, token=None, body=None):
    try:
        st, js = call(method, url, token, body)
        return st, js, None
    except urllib.error.HTTPError as e:
        t = ""
        try: t = e.read().decode()[:300]
        except Exception: pass
        return e.code, None, t
    except Exception as e:  # noqa: BLE001
        return None, None, f"{type(e).__name__}: {e}"


def login(email, pw):
    print("Authenticating ...", flush=True)
    try:
        _, ak = call("POST", f"{AUTH}/accessKeys",
                     body={"email": email, "password": pw, "signedInByFacebook": "F"})
    except urllib.error.HTTPError as e:
        sys.exit("Login failed — Arccos rejected those credentials." if e.code in (400,401,403)
                 else f"Login failed: HTTP {e.code}")
    uid = str(ak.get("userId") or ak.get("id") or "")
    key = ak.get("accessKey") or ak.get("accesskey")
    if not (uid and key): sys.exit(f"Unexpected login response: {list(ak.keys())}")
    return uid, key


def token_for(uid, key):
    _, tok = call("POST", f"{AUTH}/tokens", body={"userId": uid, "accessKey": key})
    t = tok.get("token") or tok.get("jwt") or tok.get("accessToken")
    if not t: sys.exit(f"Token call returned: {list(tok.keys())}")
    return t


def fetch_rounds(uid, token, after, before, cap):
    rows, offset, pages = [], 0, 0
    while True:
        _, page, err = safe("GET",
            f"{API}/users/{uid}/rounds?offSet={offset}&limit={PAGE}&roundType=flagship", token)
        batch = page if isinstance(page, list) else (page.get("rounds") if isinstance(page, dict) else None)
        if not batch: break
        pages += 1
        dts = []
        for r in batch:
            dt = (r.get("startTime") or "")[:10]
            if dt: dts.append(dt)
            if after and dt and dt < after: continue
            if before and dt and dt > before: continue
            rows.append(r)
            if cap and len(rows) >= cap: return rows
        if after and dts and min(dts) < after: break
        if len(batch) < PAGE: break
        offset += PAGE
        if pages >= 25: break
        time.sleep(0.25)
    return rows


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--after"); p.add_argument("--before")
    p.add_argument("--rounds", type=int, default=None)
    p.add_argument("--all", action="store_true", help="entire history, no cap")
    p.add_argument("--no-club-shots", action="store_true", help="skip per-club shot history")
    p.add_argument("-o", "--output", default="arccos-data-full.json")
    p.add_argument("--email", default=os.environ.get("ARCCOS_EMAIL"))
    a = p.parse_args()
    for lab, v in (("--after", a.after), ("--before", a.before)):
        if v and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
            sys.exit(f"{lab} must be YYYY-MM-DD, got: {v}")
    cap = None if a.all else (a.rounds if a.rounds else (None if (a.after or a.before) else 25))

    email = a.email or input("Arccos email: ").strip()
    pw = os.environ.get("ARCCOS_PASSWORD") or getpass.getpass("Arccos password: ")
    if not (email and pw): sys.exit("Email and password required.")

    uid, key = login(email, pw)
    token = token_for(uid, key)
    print(f"  ok — userId {uid}", flush=True)

    out = {"_meta": {"exported_at": datetime.now(timezone.utc).isoformat(), "user_id": uid,
                     "filter": {"after": a.after, "before": a.before, "cap": cap, "all": a.all}}}
    man = {}  # manifest: section -> (ok?, note)
    def grab(name, path, into):
        _, js, err = safe("GET", API + path, token)
        out[into] = js
        man[name] = (js is not None, err or (f"{(len(js) if hasattr(js,'__len__') else '')} item(s)" if js is not None else ""))
        return js

    # --- summary sections ---
    prof = grab("profile", f"/users/{uid}", "profile")
    bag_id = None
    if isinstance(prof, dict):
        bag_id = prof.get("bagId") or prof.get("bagID")
        if not bag_id and prof.get("bags"):
            bag_id = prof["bags"][0].get("bagId") or prof["bags"][0].get("id")
    if bag_id:
        grab("bag", f"/users/{uid}/bags/{bag_id}", "bag")
    else:
        man["bag"] = (False, "no bagId on profile"); out["bag"] = {}
    grab("smart_distances", f"/v4/clubs/user/{uid}/smart-distances", "smart_distances")
    grab("handicap", f"/users/{uid}/handicaps/latest", "handicap")
    grab("handicap_history", f"/users/{uid}/handicaps?rounds=100", "handicap_history")
    grab("courses_played", f"/users/{uid}/coursesPlayed", "courses_played")
    grab("personal_bests", f"/users/{uid}/personalBests?tags=allTimeBest", "personal_bests")

    # --- rounds (date filtered) ---
    win = ([f"after {a.after}"] if a.after else []) + ([f"before {a.before}"] if a.before else [])
    print(f"Selecting rounds ({', '.join(win) or ('all' if a.all else f'last {cap}')}) ...", flush=True)
    rounds = fetch_rounds(uid, token, a.after, a.before, cap)
    dates = sorted((r.get("startTime") or "")[:10] for r in rounds if r.get("startTime"))
    out["rounds_summary"] = rounds
    man["rounds_summary"] = (bool(rounds), f"{len(rounds)} rounds" + (f" ({dates[0]} -> {dates[-1]})" if dates else ""))
    print(f"  {len(rounds)} rounds" + (f"  {dates[0]} -> {dates[-1]}" if dates else ""), flush=True)
    rids = [str(r.get("roundId") or r.get("id")) for r in rounds if (r.get("roundId") or r.get("id"))]

    # --- round geometry (hole/shot detail) ---
    print(f"Pulling shot geometry for {len(rids)} rounds ...", flush=True)
    detail, det_fail = [], 0
    for i, rid in enumerate(rids, 1):
        _, js, err = safe("GET", f"{API}/users/{uid}/rounds/{rid}", token)
        if js is not None: detail.append(js)
        else: det_fail += 1
        if i % 20 == 0 or i == len(rids): print(f"  geometry {i}/{len(rids)}", flush=True)
        if i % 100 == 0: token = token_for(uid, key)
        time.sleep(DELAY)
    out["rounds_detail"] = detail
    man["rounds_detail"] = (len(detail) > 0, f"{len(detail)}/{len(rids)} ok" + (f", {det_fail} failed" if det_fail else ""))

    # --- strokes-gained / per-shot LIE (refresh token first) ---
    print("Refreshing token, then pulling strokes-gained / lie ...", flush=True)
    token = token_for(uid, key)
    sga, sga_fail, sga_err = {}, 0, ""
    for i, rid in enumerate(rids, 1):
        _, js, err = safe("GET", f"{API}/v2/sga/shots/{rid}", token)
        if js is not None: sga[rid] = js
        else:
            sga_fail += 1
            if not sga_err: sga_err = f"HTTP {err}" if err else "failed"
        if i % 20 == 0 or i == len(rids): print(f"  strokes-gained {i}/{len(rids)} (ok {len(sga)})", flush=True)
        if i % 100 == 0: token = token_for(uid, key)
        time.sleep(DELAY)
    out["sga_by_round"] = sga
    man["sga_by_round"] = (len(sga) > 0, f"{len(sga)}/{len(rids)} ok" + (f"; first error: {sga_err}" if sga_fail else ""))
    grab("strokes_to_get_down", "/v2/sga/strokes-to-get-down", "strokes_to_get_down")

    # --- course detail (real hole pars/yardages) ---
    course_ids = sorted({str(r.get("courseId")) for r in rounds if r.get("courseId")})
    print(f"Pulling detail for {len(course_ids)} courses ...", flush=True)
    courses, cfail = {}, 0
    for cid in course_ids:
        _, js, err = safe("GET", f"{API}/courses/{cid}?courseVersion=1", token)
        if js is not None: courses[cid] = js
        else: cfail += 1
        time.sleep(0.2)
    out["courses_detail"] = courses
    man["courses_detail"] = (len(courses) > 0, f"{len(courses)}/{len(course_ids)} ok")

    # --- per-club shot history ---
    if not a.no_club_shots and bag_id and isinstance(out.get("bag"), dict):
        clubs = [c for c in out["bag"].get("clubs", []) if c.get("isDeleted") != "T"]
        print(f"Pulling shot history for {len(clubs)} clubs ...", flush=True)
        cs, csf = {}, 0
        for c in clubs:
            cidc = c.get("clubId")
            _, js, err = safe("GET", f"{API}/users/{uid}/bags/{bag_id}/clubs/{cidc}/shots", token)
            if js is not None: cs[str(cidc)] = js
            else: csf += 1
            time.sleep(0.2)
        out["club_shots"] = cs
        man["club_shots"] = (len(cs) > 0, f"{len(cs)}/{len(clubs)} ok")
    else:
        man["club_shots"] = (None, "skipped")

    out["_manifest"] = {k: {"ok": v[0], "note": v[1]} for k, v in man.items()}

    with open(a.output, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, default=str)

    # --- manifest printout ---
    print("\n" + "=" * 54)
    print("EXPORT MANIFEST  (what landed / what didn't)")
    print("=" * 54)
    for k, (ok, note) in man.items():
        mark = "skip" if ok is None else (" ok " if ok else "FAIL")
        print(f"  [{mark}] {k:20} {note}")
    print("=" * 54)
    fails = [k for k, (ok, _) in man.items() if ok is False]
    if fails:
        print("FAILED sections:", ", ".join(fails))
        print("Send me the file anyway + this manifest; I'll work from what's here and tell you")
        print("up front what's covered. Don't silently re-run — let me see the errors first.")
    else:
        print("Everything I know to pull came through.")
    sz = os.path.getsize(a.output) / 1024
    print(f"Saved -> {a.output}  ({sz:,.0f} KB). Upload it to the chat.")


if __name__ == "__main__":
    main()
