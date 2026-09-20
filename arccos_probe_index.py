#!/usr/bin/env python3
"""Find where Arccos exposes the USGA / GHIN index the app shows under the
player's name (the dashboard should use that, not Arccos's own userHcp).

Runs locally like arccos_export.py (password via hidden prompt, nothing stored),
fetches the profile and handicap endpoints, and prints every JSON path whose
key looks handicap-related or whose value equals --value. Paste the output
back; no round data is printed.

    python3 arccos_probe_index.py --value 12.3
"""
import argparse, getpass, json, os, re, sys

from arccos_export import API, login, safe, token_for

KEY_RE = re.compile(r"index|ghin|usga|hcp|handicap|hdcp", re.I)


def walk(obj, path, hits, want):
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f"{path}.{k}"
            if KEY_RE.search(str(k)) and not isinstance(v, (dict, list)):
                hits.append((p, v, "key"))
            if want is not None and isinstance(v, (int, float)) and not isinstance(v, bool) and abs(float(v) - want) < 1e-9:
                hits.append((p, v, "VALUE MATCH"))
            walk(v, p, hits, want)
    elif isinstance(obj, list):
        for i, v in enumerate(obj[:50]):
            walk(v, f"{path}[{i}]", hits, want)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--value", type=float, default=None, help="the index the Arccos app shows, e.g. 12.3")
    p.add_argument("--email", default=os.environ.get("ARCCOS_EMAIL"))
    a = p.parse_args()
    email = a.email or input("Arccos email: ").strip()
    pw = os.environ.get("ARCCOS_PASSWORD") or getpass.getpass("Arccos password: ")
    uid, key = login(email, pw)
    token = token_for(uid, key)
    print(f"  ok — userId {uid}\n", flush=True)

    endpoints = {
        "profile": f"/users/{uid}",
        "handicap_latest": f"/users/{uid}/handicaps/latest",
        "handicap_history": f"/users/{uid}/handicaps?rounds=5",
        "settings": f"/users/{uid}/settings",
        "stats": f"/users/{uid}/stats",
        "player_summary": f"/users/{uid}/summary",
    }
    for name, path in endpoints.items():
        st, js, err = safe("GET", API + path, token)
        if js is None:
            print(f"[{name}] {path} -> HTTP {st} {err or ''}".rstrip())
            continue
        hits = []
        walk(js, name, hits, a.value)
        top = list(js.keys()) if isinstance(js, dict) else f"list of {len(js)}"
        print(f"[{name}] {path} -> HTTP {st}; top-level keys: {top}")
        for pth, v, why in hits:
            print(f"    {why:11s} {pth} = {json.dumps(v)}")
        print()
    if a.value is None:
        print("Tip: pass --value <the index shown in the app> to flag exact matches.")


if __name__ == "__main__":
    main()
