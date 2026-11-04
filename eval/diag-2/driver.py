# diag-2 run driver: one bounded diagnostic of the frozen engine 44a1dae on the 30 locked diag-2 cases (team-authored
# fresh development cases; NOT an evaluation, NOT independent or unbiased validation). Run from this experiment worktree:
#   ET_LOG=<log path outside this folder> python3 -I eval/diag-2/driver.py <server-worktree> <port> <expected BUILD_ID>
# Before any call: the diag-2 LOCK hashes; the server worktree's code equals 44a1dae (lib, app, components, config) with a
# clean tree; the BUILD_ID; a reachable server. Each case once, in ID order, concurrency 1, no reruns. Model requests
# (attempts, retries included) are counted from each saved result; hard maximum 180 (30 reviews x 3 calls x 2 attempts);
# a review is not started if it could exceed it. Stops after 2 consecutive HTTP/server errors or 3 consecutive reviews
# whose model calls all failed.
import hashlib, json, subprocess, sys, glob, os, urllib.request
WT, PORT, BUILD = sys.argv[1], int(sys.argv[2]), sys.argv[3]
D = "eval/diag-2"; CEILING = 180; PER_REVIEW_MAX = 6; ENGINE = "44a1dae"
lock = json.load(open(f"{D}/LOCK.json"))
for path, digest in lock["files"].items():
    if hashlib.sha256(open(path, "rb").read()).hexdigest() != digest: sys.exit(f"LOCK mismatch: {path}")
sh = lambda cmd, cwd: subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True).stdout.strip()
if sh(f"git diff --stat {ENGINE} HEAD -- lib app components config", WT): sys.exit(f"server code differs from {ENGINE}")
if sh("git status --porcelain -- lib app components config", WT): sys.exit("uncommitted server changes")
head = sh("git rev-parse --short HEAD", WT)
build = open(f"{WT}/.next/BUILD_ID").read().strip()
if build != BUILD: sys.exit(f"BUILD_ID {build} != frozen {BUILD}")
try: urllib.request.urlopen(f"http://localhost:{PORT}/", timeout=10)
except Exception as e: sys.exit(f"server not reachable: {e}")
cases = sorted(os.path.basename(p)[:-5] for p in glob.glob(f"{D}/cases/*.json"))
if len(cases) != 30: sys.exit(f"expected 30 cases, found {len(cases)}")
log = {"server": {"worktree": "<server-worktree>", "head": head, "engine": ENGINE, "buildId": build, "port": PORT},
       "label": "diag-2: fresh team-authored development diagnostic of 44a1dae (not an evaluation; not independent validation)", "runs": [], "stopped": None, "requests": 0}
http = allfail = 0
for cid in cases:
    if log["requests"] + PER_REVIEW_MAX > CEILING:
        log["stopped"] = {"reason": "request ceiling", "at": cid}; break
    before = set(glob.glob("eval/runs/*"))
    env = {**os.environ, "EVAL_BASE_URL": f"http://localhost:{PORT}"}
    p = subprocess.run(["npx", "tsx", "scripts/run-eval.ts", "--dataset", D, "--split", "all", "--concurrency", "1", "--only", cid, "--label", f"diag-2 (fresh team-authored development diagnostic of {ENGINE}; not an evaluation)"], env=env, capture_output=True, text=True)
    new = sorted(set(glob.glob("eval/runs/*")) - before); run = new[-1] if new else None
    lat = json.load(open(f"{run}/latency.json")) if run and os.path.exists(f"{run}/latency.json") else []
    ok = bool(lat) and all(x.get("ok") for x in lat)
    raw = f"{run}/raw/{cid}.json" if run else None
    calls = json.load(open(raw)).get("calls", []) if raw and os.path.exists(raw) else []
    reqs = sum(int(c.get("attempts") or 1) for c in calls)
    log["requests"] += reqs
    all_failed = bool(calls) and all(c["status"] != "ok" for c in calls)
    log["runs"].append({"case": cid, "run": run, "http_ok": ok, "requests": reqs, "all_calls_failed": all_failed, "ms": lat[0]["ms"] if lat else None})
    print(json.dumps(log["runs"][-1]), flush=True)
    http = 0 if ok else http + 1
    allfail = allfail + 1 if all_failed else 0
    if http >= 2 or allfail >= 3:
        log["stopped"] = {"reason": "2 consecutive HTTP/server errors" if http >= 2 else "3 consecutive reviews with every model call failed", "at": cid}; break
json.dump(log, open(os.environ["ET_LOG"], "w"), indent=1)
print(json.dumps({"stopped": log["stopped"], "reviews": len(log["runs"]), "requests": log["requests"]}))
