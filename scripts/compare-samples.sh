#!/bin/zsh
# M2: compare 1 vs 2 review samples on the dev split with the production build. Each config runs twice.
# Usage: zsh scripts/compare-samples.sh   (port 3000 must be free; the key comes from .env.local via next start)
set -u
cd "$(dirname "$0")/.."
mkdir -p tmp
npm run build > tmp/build.log 2>&1 || { echo "BUILD FAILED (see tmp/build.log)"; exit 1; }
echo "built commit $(git rev-parse --short HEAD)"
for round in 1 2; do
  for n in 2 1; do
    CHALLENGEX_SAMPLES=$n npx next start -p 3000 > tmp/server-$n.log 2>&1 &
    pid=$!
    for i in {1..90}; do curl -s -o /dev/null http://localhost:3000/ && break; sleep 1; done
    curl -s -o /dev/null http://localhost:3000/ || { echo "SERVER DID NOT START (see tmp/server-$n.log)"; kill $pid 2>/dev/null; exit 1; }
    npx tsx scripts/run-eval.ts --split dev --concurrency 1 --label "M2 merge comparison: samples=$n, round $round (commit $(git rev-parse --short HEAD), production build)" 2>&1 | grep -E "^Running|^Done"
    kill $pid; wait $pid 2>/dev/null
    sleep 2
  done
done
echo "comparison finished"
