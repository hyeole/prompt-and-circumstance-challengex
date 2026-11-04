// Offline replay of every saved result in the given run directories through the review pipeline (no model calls), as
// replay-saved-extraction.ts does for a fixed set of runs: the fact call returns the extraction recorded in the saved
// result (a timeout where it failed); the review samples return a fixed stub. Each run's cases are read from the
// checkout that holds the run (<checkout>/eval/runs/<run>), so runs from other worktrees replay against their own cases.
// Run before and after a change and diff; every changed line is a behaviour change. Nothing in the runs is written.
// MODEL_CITATION=mismatch|consistent and FAIL_ALL=1 as in replay-saved-extraction.ts. REVIEW_FAIL=1: every review sample
// times out (the fact call still returns the saved extraction, unless FAIL_ALL is also set).
// Usage: npx tsx --conditions=react-server scripts/replay-all-saved.ts <run-dir>... > out.jsonl
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { ModelError } from "../lib/llm";
import { reviewCase, type Complete } from "../lib/review/review";
import { splitSentences } from "../lib/text";
import type { CaseRecord, ReviewResult } from "../lib/types";

const MODEL_CITATION = process.env.MODEL_CITATION;
const FAIL_ALL = process.env.FAIL_ALL === "1";
const REVIEW_FAIL = process.env.REVIEW_FAIL === "1";
const review = (c: CaseRecord) => {
  const s = splitSentences(c.narrative.text, c.narrative.pageSpans).find((x) => x.text.split(/\s+/).length >= 6)!;
  const citation = MODEL_CITATION === "mismatch"
    ? { status: "likely_mismatch", explanation: "The narrative does not support the selected charge.", evidence: [{ sentence_id: s.id, quote: s.text.split(/\s+/).slice(0, 6).join(" ") }] }
    : { status: "consistent", explanation: "Supported.", evidence: [] };
  return JSON.stringify({ elements: [], issues: [], citation, human_review: { required: false, reasons: [] } });
};
const fake = (c: CaseRecord, fx: ReviewResult["factsExtraction"]): Complete => async (system) => {
  if (system !== FACTS_SYSTEM_PROMPT) {
    if (REVIEW_FAIL) throw new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1);
    return { text: review(c), attempts: 1 };
  }
  if (fx?.status === "valid" && !FAIL_ALL) return { text: JSON.stringify(fx.output), attempts: 1 };
  throw new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1);
};
for (const run of process.argv.slice(2)) {
  const checkout = run.replace(/\/eval\/runs\/[^/]+\/?$/, "");
  if (!existsSync(`${run}/raw`)) continue;
  // The earliest runs have no run-info.json; they used the default dataset.
  const ds = existsSync(`${run}/run-info.json`) ? (JSON.parse(readFileSync(`${run}/run-info.json`, "utf8")).dataset as string | undefined) : undefined;
  const casesDir = `${checkout}/${!ds || ds === "eval" ? "eval/cases" : `${ds}/cases`}`;
  const runId = run.replace(/\/$/, "").split("/").slice(-1)[0];
  for (const f of readdirSync(`${run}/raw`).filter((x) => x.endsWith(".json")).sort()) {
    const saved = JSON.parse(readFileSync(`${run}/raw/${f}`, "utf8")) as ReviewResult;
    const casePath = `${casesDir}/${saved.caseId}.json`;
    if (!existsSync(casePath)) { console.log(JSON.stringify({ run: runId, case: saved.caseId, skipped: "case file not found" })); continue; }
    const c = JSON.parse(readFileSync(casePath, "utf8")) as CaseRecord;
    const r = await reviewCase(c, fake(c, saved.factsExtraction));
    console.log(JSON.stringify({ run: runId, case: r.caseId, findings: r.findings.map((x) => ({ id: x.id, category: x.category, source: x.source, title: x.title, explanation: x.explanation, evidence: x.evidence.map((e) => e.sentenceId ?? e.fieldPath), context: x.evidence.map((e) => e.context?.attribution ?? null) })),
      citation: r.citation.status, citationEvidence: r.citation.evidence.map((e) => e.sentenceId ?? e.fieldPath), humanReview: r.humanReview.required, reasons: r.humanReview.reasons, accounts: r.humanReview.accounts, discarded: r.discarded.map((d) => d.title + ": " + d.reason), completion: r.completion?.status }));
  }
}
