// Offline replay of saved cases through the review pipeline (no model calls): the fact call returns the extraction
// recorded in that case's saved result (a timeout where it failed); the review samples return a fixed stub (the saved
// runs do not store the review samples' text). Run before and after a change and diff; every changed line is a
// behaviour change. The saved results are read from RUNS_ROOT (the main checkout by default); nothing there is written.
// RUNS=<run,run,…> picks the saved runs (default: the four rc-full-1 runs).
// FAIL_ALL=1 makes every fact call fail (the rule-only path).
// MODEL_CITATION=mismatch|consistent makes the stubbed review return that citation verdict (a "mismatch" cites the
// first narrative sentence, verbatim), to show where the model's verdict decides the outcome.
// Usage: RUNS_ROOT=<checkout> npx tsx --conditions=react-server scripts/replay-saved-extraction.ts > out.jsonl
import { readFileSync, readdirSync } from "node:fs";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { ModelError } from "../lib/llm";
import { reviewCase, type Complete } from "../lib/review/review";
import { splitSentences } from "../lib/text";
import type { CaseRecord, ReviewResult } from "../lib/types";

const ROOT = process.env.RUNS_ROOT ?? ".";
const RUNS = (process.env.RUNS ?? "2026-10-31T01-00-26,2026-10-31T01-03-00,2026-10-31T01-13-24,2026-10-31T01-28-34").split(",").map((r) => `${ROOT}/eval/runs/${r}`);
const FAIL_ALL = process.env.FAIL_ALL === "1";
const MODEL_CITATION = process.env.MODEL_CITATION;
const review = (c: CaseRecord) => {
  const s = splitSentences(c.narrative.text, c.narrative.pageSpans).find((x) => x.text.split(/\s+/).length >= 6)!;
  const citation = MODEL_CITATION === "mismatch"
    ? { status: "likely_mismatch", explanation: "The narrative does not support the selected charge.", evidence: [{ sentence_id: s.id, quote: s.text.split(/\s+/).slice(0, 6).join(" ") }] }
    : { status: "consistent", explanation: "Supported.", evidence: [] };
  return JSON.stringify({ elements: [], issues: [], citation, human_review: { required: false, reasons: [] } });
};
const fake = (c: CaseRecord, fx: ReviewResult["factsExtraction"]): Complete => async (system) => {
  if (system !== FACTS_SYSTEM_PROMPT) return { text: review(c), attempts: 1 };
  if (fx?.status === "valid" && !FAIL_ALL) return { text: JSON.stringify(fx.output), attempts: 1 };
  throw new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1);
};
for (const run of RUNS) {
  const ds = JSON.parse(readFileSync(`${run}/run-info.json`, "utf8")).dataset as string;
  const casesDir = ds === "eval" ? "eval/cases" : `${ds}/cases`;
  for (const f of readdirSync(`${run}/raw`).sort()) {
    const saved = JSON.parse(readFileSync(`${run}/raw/${f}`, "utf8")) as ReviewResult;
    const c = JSON.parse(readFileSync(`${casesDir}/${saved.caseId}.json`, "utf8")) as CaseRecord;
    const r = await reviewCase(c, fake(c, saved.factsExtraction));
    console.log(JSON.stringify({ case: r.caseId, findings: r.findings.map((x) => ({ id: x.id, category: x.category, source: x.source, title: x.title, explanation: x.explanation, evidence: x.evidence.map((e) => e.sentenceId ?? e.fieldPath) })),
      citation: r.citation.status, citationEvidence: r.citation.evidence.map((e) => e.sentenceId ?? e.fieldPath), humanReview: r.humanReview.required, reasons: r.humanReview.reasons, accounts: r.humanReview.accounts, discarded: r.discarded.map((d) => d.title + ": " + d.reason), completion: r.completion?.status }));
  }
}
