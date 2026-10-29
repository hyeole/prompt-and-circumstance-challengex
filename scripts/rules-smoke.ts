// Prints rule-based findings for every case (no model call). Run: npx tsx scripts/rules-smoke.ts
import { readdirSync, readFileSync } from "node:fs";
import { splitSentences } from "../lib/text";
import { runRules } from "../lib/review/rules";
import type { CaseRecord } from "../lib/types";
for (const f of readdirSync("data/cases").sort()) {
  const c = JSON.parse(readFileSync(`data/cases/${f}`, "utf8")) as CaseRecord;
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const r = runRules(c, ss);
  const els = [...r.elementsFromFields.values()].map((e) => `${e.elementId}:${e.status}`).join(" ");
  console.log(`${c.id} sentences=${ss.length} | ${els} | ${r.findings.map((x) => x.id + (x.id === "R-TIME-MISMATCH" ? `(${x.evidence[0].quote})` : "")).join(", ") || "no rule findings"}`);
}
