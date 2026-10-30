// Diagnostic. Usage: npx tsx scripts/diag-inherited-adjudications.ts <run> [<run> ...]. For each non-planted flag in a run, show the adjudication it inherits and whether that
// adjudication was made for the same claim (same finding-id prefix, element and title), or only shares category/evidence.
import { readFileSync, readdirSync } from "node:fs";
import { findingKey } from "./finding-key";
import { matches, type Plant } from "./score-match";
import type { ReviewResult } from "../lib/types";
const runs = process.argv.slice(2);
const adj = JSON.parse(readFileSync("eval/adjudications.json", "utf8")).items as { base: string; key: string; verdict: string; note: string; example: string }[];
const out: string[] = [];
for (const run of runs) {
  const info = JSON.parse(readFileSync(`eval/runs/${run}/run-info.json`, "utf8"));
  const exp = info.dataset === "eval" ? "eval/expected" : `${info.dataset}/expected`;
  for (const f of readdirSync(`eval/runs/${run}/raw`)) {
    const r = JSON.parse(readFileSync(`eval/runs/${run}/raw/${f}`, "utf8")) as ReviewResult;
    const ex = JSON.parse(readFileSync(`${exp}/${r.caseId}.json`, "utf8")) as { base: string; plants: Plant[] };
    for (const fd of r.findings) {
      if (ex.plants.some((p) => matches(r, fd, p))) continue;
      const key = findingKey(r, fd);
      const a = adj.find((x) => x.base === ex.base && x.key === key);
      if (!a) { out.push(`${run}\t${r.caseId}\t${fd.id}\tUNADJ\t\t${fd.title}`); continue; }
      const [exCase, exId, ...exTitle] = a.example.split(" ");
      const prefix = (id: string) => id.replace(/-\d+$/, "").replace(/^(I|Q)-.*/, "$1");
      const same = prefix(exId) === prefix(fd.id) && exTitle.join(" ") === fd.title;
      out.push(`${run}\t${r.caseId}\t${fd.id}\t${a.verdict}\t${same ? "same-claim" : "DIFFERENT"}\t${fd.title} <= adjudicated as: ${a.example}`);
    }
  }
}
console.log(out.join("\n"));
