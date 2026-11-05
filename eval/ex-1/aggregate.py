# Builds one scoring folder per engine from the ex-1 per-case run records (raw results copied byte for byte; latency
# records in run order). The original run records under eval/runs/ are never modified.
#   python3 -I eval/ex-1/aggregate.py eval/ex-1/driver-log.json
import json, os, shutil, sys
log = json.load(open(sys.argv[1]))
for eng in ("baseline", "candidate"):
    d = f"eval/ex-1/scored/{eng}"
    os.makedirs(f"{d}/raw", exist_ok=True)
    lat, src = [], []
    for r in log["runs"]:
        if r["engine"] != eng or not r["run"]: continue
        raw = f"{r['run']}/raw/{r['case']}.json"
        if os.path.exists(raw): shutil.copyfile(raw, f"{d}/raw/{r['case']}.json")
        if os.path.exists(f"{r['run']}/latency.json"): lat += json.load(open(f"{r['run']}/latency.json"))
        src.append(r["run"])
    json.dump(lat, open(f"{d}/latency.json", "w"), indent=1)
    json.dump({"engine": eng, "commit": log["servers"][eng]["engine"], "aggregatedFrom": src}, open(f"{d}/run-info.json", "w"), indent=1)
    print(eng, len(src), "runs,", len(os.listdir(f"{d}/raw")), "raw")
