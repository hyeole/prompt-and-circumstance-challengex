// Offline replay of every rc-full-1 case through the review pipeline (no model calls): the fact call returns the
// extraction recorded in that case's saved result (a timeout where it failed); the review samples return a fixed stub
// (the saved runs do not store the review samples' text). Run before and after a change and diff; every changed line is
// a behaviour change. The saved results are read from RUNS_ROOT (the main checkout); nothing there is written.
// FAIL_ALL=1 makes every fact call fail (the rule-only path).
// Usage: RUNS_ROOT=<checkout> npx tsx --conditions=react-server scripts/replay-saved-extraction.ts > out.jsonl
import { readFileSync, readdirSync } from "node:fs";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { ModelError } from "../lib/llm";
import { reviewCase, type Complete } from "../lib/review/review";
import type { CaseRecord, ReviewResult } from "../lib/types";

const ROOT = process.env.RUNS_ROOT ?? ".";
const RUNS = ["2026-10-31T01-00-26", "2026-10-31T01-03-00", "2026-10-31T01-13-24", "2026-10-31T01-28-34"].map((r) => `${ROOT}/eval/runs/${r}`);
const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const FAIL_ALL = process.env.FAIL_ALL === "1";
const fake = (fx: ReviewResult["factsExtraction"]): Complete => async (system) => {
  if (system !== FACTS_SYSTEM_PROMPT) return { text: REVIEW, attempts: 1 };
  if (fx?.status === "valid" && !FAIL_ALL) return { text: JSON.stringify(fx.output), attempts: 1 };
  throw new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1);
};
for (const run of RUNS) {
  const ds = JSON.parse(readFileSync(`${run}/run-info.json`, "utf8")).dataset as string;
  const casesDir = ds === "eval" ? "eval/cases" : `${ds}/cases`;
  for (const f of readdirSync(`${run}/raw`).sort()) {
    const saved = JSON.parse(readFileSync(`${run}/raw/${f}`, "utf8")) as ReviewResult;
    const c = JSON.parse(readFileSync(`${casesDir}/${saved.caseId}.json`, "utf8")) as CaseRecord;
    const r = await reviewCase(c, fake(saved.factsExtraction));
    console.log(JSON.stringify({ case: r.caseId, findings: r.findings.map((x) => ({ id: x.id, category: x.category, source: x.source, title: x.title, explanation: x.explanation, evidence: x.evidence.map((e) => e.sentenceId ?? e.fieldPath) })),
      citation: r.citation.status, humanReview: r.humanReview.required, reasons: r.humanReview.reasons, accounts: r.humanReview.accounts, discarded: r.discarded.map((d) => d.title + ": " + d.reason), completion: r.completion?.status }));
  }
}
