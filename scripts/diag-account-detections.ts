// Diagnostic. Usage: npx tsx scripts/diag-account-detections.ts <run> [<run> ...]. Plants that are credited only through
// "account that may conflict (attribution unknown)" findings, reported separately from contradiction detections.
import { readFileSync, readdirSync } from "node:fs";
import { matches, isComplete, type Plant } from "./score-match";
import type { ReviewResult } from "../lib/types";
for (const run of process.argv.slice(2)) {
  const info = JSON.parse(readFileSync(`eval/runs/${run}/run-info.json`, "utf8"));
  const exp = (info.dataset ?? "eval") === "eval" ? "eval/expected" : `${info.dataset}/expected`;
  for (const f of readdirSync(`eval/runs/${run}/raw`)) {
    const r = JSON.parse(readFileSync(`eval/runs/${run}/raw/${f}`, "utf8")) as ReviewResult;
    const ex = JSON.parse(readFileSync(`${exp}/${r.caseId}.json`, "utf8")) as { plants: Plant[] };
    for (const p of ex.plants) {
      const by = r.findings.filter((fd) => matches(r, fd, p) && (isComplete(r) || fd.source === "rule"));
      if (by.length && by.every((fd) => fd.id.startsWith("U-ACCOUNT"))) console.log(`${run} ${r.caseId} ${p.type} detected ONLY via ${by.map((x) => x.id).join(",")}`);
    }
  }
}
