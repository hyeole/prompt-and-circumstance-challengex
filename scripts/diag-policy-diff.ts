// Plant outcomes that differ between the v2.3 and v2.4 default-layer scorings of each run (historical files unchanged).
import { existsSync, readdirSync, readFileSync } from "node:fs";
type Row = { id: string; plants: { type: string; outcome: string }[] };
let total = 0, changed = 0;
for (const run of readdirSync("eval/runs").sort()) {
  const d = `eval/runs/${run}`;
  const v24 = `${d}/summary-v2.4.json`;
  if (!existsSync(v24)) continue;
  const v23f = [`${d}/summary-v2.3.json`, `${d}/summary.json`].find((p) => existsSync(p) && JSON.parse(readFileSync(p, "utf8")).scoringPolicy === "v2.3");
  if (!v23f) continue;
  const a = new Map((JSON.parse(readFileSync(v23f, "utf8")).rows as Row[]).map((r) => [r.id, r]));
  for (const r of JSON.parse(readFileSync(v24, "utf8")).rows as Row[]) {
    const o = a.get(r.id); if (!o) continue;
    r.plants.forEach((p, i) => { total++; if (o.plants[i]?.outcome !== p.outcome) { changed++; console.log(`${run} ${r.id} ${p.type}: ${o.plants[i]?.outcome} -> ${p.outcome}`); } });
  }
}
console.log(`plant outcomes compared ${total}, changed ${changed}`);
