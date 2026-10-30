// Reports, separately from detection, the partial-review credit that exists only because of the round-3 provenance
// correction (history findings decided by source text and form data are "rule"). Scoring v2.4 credits a partial review
// only through rule findings; before round 3 these history findings were labelled "model", so they earned no partial
// credit. This script changes no score and writes nothing: it lists, for one run, the plants detected in partial
// reviews by a corrected-provenance finding and by no other rule finding, so a comparison can show that credit apart
// from genuinely new detections.
// Usage: npx tsx scripts/diag-provenance-credit.ts eval/runs/<timestamp>
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { matches, isComplete, type Plant } from "./score-match";
import type { ReviewResult } from "../lib/types";

/** Finding IDs whose provenance round 3 corrected from "model" to "rule" (see eval/ROUND3-DEFECT-FIXES.md, fix 6). */
const CORRECTED = new Set(["F-HISTORY", "F-HISTORY-2", "F-HISTORY-3"]);
const dir = process.argv[2];
if (!dir) throw new Error("usage: diag-provenance-credit.ts eval/runs/<timestamp>");
const info = existsSync(`${dir}/run-info.json`) ? JSON.parse(readFileSync(`${dir}/run-info.json`, "utf8")) as { dataset?: string; commit?: string } : {};
const dataset = info.dataset ?? "eval";
const expectedDir = dataset === "eval" ? "eval/expected" : `${dataset}/expected`;
const rows: string[] = [];
let partial = 0;
for (const f of readdirSync(expectedDir).sort()) {
  const e = JSON.parse(readFileSync(`${expectedDir}/${f}`, "utf8")) as { id: string; plants: Plant[] };
  const raw = `${dir}/raw/${e.id}.json`;
  if (!existsSync(raw)) continue;
  const r = JSON.parse(readFileSync(raw, "utf8")) as ReviewResult;
  if (isComplete(r)) continue;
  partial++;
  e.plants.forEach((p, i) => {
    const rule = r.findings.filter((x) => x.source === "rule" && matches(r, x, p));
    if (rule.length && rule.every((x) => CORRECTED.has(x.id))) rows.push(`${e.id} plant ${i + 1} (${p.type}): credited only through ${rule.map((x) => x.id).join(", ")}`);
  });
}
console.log(`Run ${dir} (commit ${info.commit ?? "unknown"}, dataset ${dataset}): ${partial} partial review(s).`);
console.log(`Partial-review credit from corrected provenance only: ${rows.length}. Report these apart from new detections.`);
for (const x of rows) console.log(`  ${x}`);
