# ex-1 paired driver: the 20 locked ex-1 cases, once per engine (baseline 74e15fb, candidate 6c49e14), under identical
# settings. Engine order alternates per case: odd-numbered cases (1st, 3rd, ...) baseline first, even-numbered candidate
# first. Team-authored development cases; NOT independent validation. Run from this runner worktree:
#   ET_LOG=<log path> python3 -I eval/ex-1/driver.py <base-worktree> <base-port> <base-BUILD_ID> <cand-worktree> <cand-port> <cand-BUILD_ID>
# Before any call: the ex-1 LOCK; each server worktree's code equals its engine (lib, app, components, config) with a clean
# tree; each BUILD_ID; both servers reachable. Each review once, concurrency 1, no reruns. Model requests (attempts,
# retries included) are counted from each saved result; hard maximum 240 attempts (40 reviews x 3 calls x 2 attempts);
# a review is not started if it could exceed it. Stops after 2 consecutive HTTP/server errors or 3 consecutive reviews
# whose model calls all failed.
import hashlib, json, subprocess, sys, glob, os, urllib.request
BWT, BPORT, BBUILD, CWT, CPORT, CBUILD = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], int(sys.argv[5]), sys.argv[6]
ENGINES = {"baseline": ("74e15fb", BWT, BPORT, BBUILD), "candidate": ("6c49e14", CWT, CPORT, CBUILD)}
CEILING = 240; PER_REVIEW_MAX = 6
for path, digest in json.load(open("eval/ex-1/LOCK.json"))["sha256"].items():
    if hashlib.sha256(open(path, "rb").read()).hexdigest() != digest: sys.exit(f"LOCK mismatch: {path}")
CASES = sorted(os.path.basename(p)[:-5] for p in glob.glob("eval/ex-1/cases/*.json"))
if len(CASES) != 20: sys.exit(f"expected 20 cases, found {len(CASES)}")
sh = lambda cmd, cwd: subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True).stdout.strip()
servers = {}
for name, (commit, wt, port, build) in ENGINES.items():
    if sh(f"git diff --stat {commit} HEAD -- lib app components config", wt): sys.exit(f"{name}: server code differs from {commit}")
    if sh("git status --porcelain -- lib app components config", wt): sys.exit(f"{name}: uncommitted server changes")
    b = open(f"{wt}/.next/BUILD_ID").read().strip()
    if b != build: sys.exit(f"{name}: BUILD_ID {b} != frozen {build}")
    try: urllib.request.urlopen(f"http://localhost:{port}/", timeout=10)
    except Exception as e: sys.exit(f"{name}: server not reachable: {e}")
    servers[name] = {"engine": commit, "head": sh("git rev-parse --short HEAD", wt), "buildId": b, "port": port}
log = {"servers": servers, "label": "ex-1: paired comparison of 74e15fb and 6c49e14 on 20 locked team-authored cases (NOT independent validation)",
       "runs": [], "stopped": None, "requests": 0}
http = allfail = 0
order = []
for i, cid in enumerate(CASES):
    order += [(cid, e) for e in (("baseline", "candidate") if i % 2 == 0 else ("candidate", "baseline"))]
for cid, eng in order:
    if log["requests"] + PER_REVIEW_MAX > CEILING:
        log["stopped"] = {"reason": "request ceiling", "at": f"{cid}/{eng}"}; break
    commit, _, port, _ = ENGINES[eng]
    before = set(glob.glob("eval/runs/*"))
    env = {**os.environ, "EVAL_BASE_URL": f"http://localhost:{port}"}
    subprocess.run(["npx", "tsx", "scripts/run-eval.ts", "--dataset", "eval/ex-1", "--split", "all", "--concurrency", "1", "--only", cid,
                    "--label", f"ex-1 {eng} ({commit}); team-authored development cases; NOT independent validation"], env=env, capture_output=True, text=True)
    new = sorted(set(glob.glob("eval/runs/*")) - before); run = new[-1] if new else None
    lat = json.load(open(f"{run}/latency.json")) if run and os.path.exists(f"{run}/latency.json") else []
    ok = bool(lat) and all(x.get("ok") for x in lat)
    raw = f"{run}/raw/{cid}.json" if run else None
    calls = json.load(open(raw)).get("calls", []) if raw and os.path.exists(raw) else []
    reqs = sum(int(c.get("attempts") or 1) for c in calls)
    log["requests"] += reqs
    all_failed = bool(calls) and all(c["status"] != "ok" for c in calls)
    log["runs"].append({"case": cid, "engine": eng, "commit": commit, "run": run, "http_ok": ok, "requests": reqs, "all_calls_failed": all_failed, "ms": lat[0]["ms"] if lat else None})
    print(json.dumps(log["runs"][-1]), flush=True)
    http = 0 if ok else http + 1
    allfail = allfail + 1 if all_failed else 0
    if http >= 2 or allfail >= 3:
        log["stopped"] = {"reason": "2 consecutive HTTP/server errors" if http >= 2 else "3 consecutive reviews with every model call failed", "at": f"{cid}/{eng}"}; break
json.dump(log, open(os.environ["ET_LOG"], "w"), indent=1)
print(json.dumps({"stopped": log["stopped"], "reviews": len(log["runs"]), "requests": log["requests"]}))
