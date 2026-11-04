// Reproduction: C003-M3, C037-X1 and F010-D under controlled model failures (no model calls; fakes built from the
// saved rc-int-1 results). Usage: npx tsx --conditions=react-server scripts/repro-failure-retention.ts <rc-int-1 runs dir>
import { readFileSync } from "node:fs";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { ModelError } from "../lib/llm";
import { reviewCase, type Complete } from "../lib/review/review";
import { reconstruct } from "./replay-reconstructed";
import type { CaseRecord, ReviewResult } from "../lib/types";
const RUNS = process.argv[2];
const items = [
  { id: "C003-M3", run: "2026-11-01T06-52-57", dir: "eval", el: "E3" },
  { id: "C037-X1", run: "2026-11-01T06-52-57", dir: "eval", el: "E1" },
  { id: "F010-D", run: "2026-11-01T06-43-40", dir: "eval/fresh", el: "N7" },
];
const timeout = () => new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1);
type Scn = { name: string; facts: "ok" | "fail"; review: "ok" | "fail" | "one" | "omit" | "noelements" | "invalid" };
const scenarios: Scn[] = [
  { name: "complete", facts: "ok", review: "ok" }, { name: "facts failed", facts: "fail", review: "ok" },
  { name: "review failed", facts: "ok", review: "fail" }, { name: "both failed", facts: "fail", review: "fail" },
  { name: "one sample failed", facts: "ok", review: "one" }, { name: "review omits element", facts: "ok", review: "omit" },
  { name: "review without elements", facts: "ok", review: "noelements" }, { name: "review invalid JSON", facts: "ok", review: "invalid" },
  { name: "facts failed + omits element", facts: "fail", review: "omit" },
];
for (const it of items) {
  const saved = JSON.parse(readFileSync(`${RUNS}/${it.run}/raw/${it.id}.json`, "utf8")) as ReviewResult;
  const c = JSON.parse(readFileSync(`${it.dir}/cases/${it.id}.json`, "utf8")) as CaseRecord;
  console.log(`\n=== ${it.id} (planted: ${it.el === "E1" ? "entry date (F-ENTRY-DATE)" : "missing " + it.el})`);
  for (const s of scenarios) {
    let n = 0;
    const rv = JSON.parse(reconstruct(saved));
    if (s.review === "omit") rv.elements = rv.elements.filter((e: { element_id: string }) => e.element_id !== it.el);
    if (s.review === "noelements") rv.elements = [];
    const fake: Complete = async (system) => {
      if (system === FACTS_SYSTEM_PROMPT) {
        if (s.facts === "fail" || saved.factsExtraction?.status !== "valid") throw timeout();
        return { text: JSON.stringify(saved.factsExtraction.output), attempts: 1 };
      }
      n++;
      if (s.review === "fail" || (s.review === "one" && n === 1)) throw timeout();
      if (s.review === "invalid") return { text: "{not json", attempts: 1 };
      return { text: JSON.stringify(rv), attempts: 1 };
    };
    const r = await reviewCase(c, fake);
    const el = r.elements.find((e) => e.elementId === it.el);
    const planted = it.el === "E1" ? r.findings.filter((f) => f.id.startsWith("F-ENTRY-DATE")).map((f) => `${f.id}[${f.evidence.map((e) => e.sentenceId ?? e.fieldPath).join("+")}]`).join(",") || "—"
      : r.findings.filter((f) => f.id.endsWith(it.el)).map((f) => f.id).join(",") || "—";
    console.log(`  ${s.name.padEnd(28)} planted: ${planted.padEnd(26)} ${it.el}: ${(el?.status ?? "?").padEnd(12)} completion: ${r.completion?.status} ${(r.completion?.failed ?? []).map((f) => f.check).join("+")} | HR ${r.humanReview.required} | findings ${r.findings.map((f) => f.id).join(",")}`);
  }
}
