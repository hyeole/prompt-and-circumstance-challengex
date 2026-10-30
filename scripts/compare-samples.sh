#!/bin/zsh
# M2: compare 1 vs 2 review samples on the dev split with the production build. Each config runs twice.
# Usage: zsh scripts/compare-samples.sh   (port 3000 must be free; the key comes from .env.local via next start)
set -u
cd "$(dirname "$0")/.."
for round in 1 2; do
  for n in 2 1; do
    CHALLENGEX_SAMPLES=$n npx next start -p 3000 > /tmp/nc-server-$n.log 2>&1 &
    pid=$!
    until curl -s -o /dev/null http://localhost:3000/; do sleep 1; done
    npx tsx scripts/run-eval.ts --split dev --concurrency 1 --label "M2 merge comparison: samples=$n, round $round (commit $(git rev-parse --short HEAD))" 2>&1 | grep -E "^Running|^Done"
    kill $pid; wait $pid 2>/dev/null
    sleep 2
  done
done
echo "comparison finished"
