#!/bin/zsh
# Post-tuning measurement of the current commit on all three datasets (production build, one case at a time).
set -u
cd "$(dirname "$0")/.."
mkdir -p tmp
pkill -f "next start -p 3000"; sleep 2
npm run build > tmp/build.log 2>&1 || { echo "BUILD FAILED"; exit 1; }
(npx next start -p 3000 > tmp/server.log 2>&1 &)
for i in {1..90}; do curl -s -o /dev/null http://localhost:3000/ && break; sleep 1; done
C=$(git rev-parse --short HEAD)
for ds in eval/dev-synthetic eval/fresh eval; do
  npx tsx scripts/run-eval.ts --dataset $ds --split all --concurrency 1 --label "post-tuning ($ds, commit $C)" 2>&1 | grep -E "^Running|^Done"
done
echo "post-tuning runs finished"
