// Diagnostic. Usage: npx tsx scripts/diag-cross-case-inheritance.ts <run> [<run> ...]. Lists every non-planted flag whose
// verdict is inherited from a record made on a DIFFERENT case (another variant of the same base), with whether the
// narrative and form fields of the two cases are identical. Inheritance across differing texts needs a manual check.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { findingKey } from "./finding-key";
import { matches, type Plant } from "./score-match";
import type { CaseRecord, ReviewResult } from "../lib/types";
const adj = JSON.parse(readFileSync("eval/adjudications.json", "utf8")).items as { base: string; key: string; verdict: string; example: string }[];
for (const run of process.argv.slice(2)) {
  const info = JSON.parse(readFileSync(`eval/runs/${run}/run-info.json`, "utf8"));
  const ds = info.dataset ?? "eval";
  const exp = ds === "eval" ? "eval/expected" : `${ds}/expected`, cases = ds === "eval" ? "eval/cases" : `${ds}/cases`;
  const load = (id: string) => (existsSync(`${cases}/${id}.json`) ? JSON.parse(readFileSync(`${cases}/${id}.json`, "utf8")) as CaseRecord : null);
  for (const f of readdirSync(`eval/runs/${run}/raw`)) {
    const r = JSON.parse(readFileSync(`eval/runs/${run}/raw/${f}`, "utf8")) as ReviewResult;
    const ex = JSON.parse(readFileSync(`${exp}/${r.caseId}.json`, "utf8")) as { base: string; plants: Plant[] };
    for (const fd of r.findings) {
      if (ex.plants.some((p) => matches(r, fd, p))) continue;
      const a = adj.find((x) => x.base === ex.base && x.key === findingKey(r, fd));
      if (!a) continue;
      const src = a.example.split(" ")[0];
      if (src === r.caseId) continue;
      const c1 = load(r.caseId), c2 = load(src);
      const same = !!c1 && !!c2 && c1.narrative.text === c2.narrative.text && JSON.stringify(c1.facts) === JSON.stringify(c2.facts);
      console.log(`${run}\t${r.caseId}\t${fd.id}\t${a.verdict}\tfrom ${src}\t${same ? "same text and fields" : "TEXT OR FIELDS DIFFER"}\t${fd.title}`);
    }
  }
}
