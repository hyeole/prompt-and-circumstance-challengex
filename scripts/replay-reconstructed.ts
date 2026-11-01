// Offline replay of saved results with the model's own output reconstructed from what each result kept (no model
// calls). The review samples' raw text is not saved, so the review response is rebuilt from the saved result:
// - issues: every model-sourced finding (I-n / Q-n) as the model stated it: type, title, explanation, its verified
//   evidence (sentence id + quote, or field path), needs_human_review and its reason;
// - human_review: the saved routing reasons that the code did not generate itself (not a finding's "title: reason", not
//   a finding's own reason, not a known code reason). Reasons the code removed in the saved run are not rebuilt: the
//   withheld claim they depended on cannot be rebuilt either;
// - elements: the saved element statuses; citation: the saved status and evidence (a rule-decided status is re-derived);
// - the fact call returns the saved extraction (a timeout where it failed).
// Claims the code discarded in the saved run are not rebuilt (their evidence is not saved): this replay shows what the
// code does with claims that passed before. Run before and after a change and diff.
// Usage: npx tsx --conditions=react-server scripts/replay-reconstructed.ts <run-dir>... > out.jsonl
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { ModelError } from "../lib/llm";
import { reviewCase, type Complete } from "../lib/review/review";
import type { CaseRecord, ReviewResult } from "../lib/types";

const CODE_REASON = /^(This review is partial|Several people are described|Citation check depends|Possible mismatch between the narrative and the selected charge|See findings marked)/;
export function reconstruct(saved: ReviewResult): string {
  const model = saved.findings.filter((f) => f.source === "model" && /^[IQ]-\d+$/.test(f.id));
  const issues = model.map((f) => ({
    type: f.category === "inconsistency" ? "inconsistency" : "unclear", title: f.title, explanation: f.explanation,
    evidence: f.evidence.map((e) => (e.kind === "field" ? { field_path: e.fieldPath } : { sentence_id: e.sentenceId, quote: e.quote })),
    needs_human_review: !!f.needsHumanReview && f.category !== "inconsistency" ? true : !!f.needsHumanReview,
    reason: f.humanReviewReason && !/^Conflicting facts: a person should decide which is correct\.$|^Model asked for human review\.$/.test(f.humanReviewReason) ? f.humanReviewReason : "",
  }));
  const own = new Set(saved.findings.flatMap((f) => [f.title, `${f.title}${f.humanReviewReason ? `: ${f.humanReviewReason}` : ""}`, f.humanReviewReason ?? ""]));
  const reasons = saved.humanReview.reasons.filter((r) => !own.has(r) && !CODE_REASON.test(r) && r !== saved.citation.explanation);
  // N6 is set to not_applicable by the code when no discrepancy was found; the model's own answer is not saved, so it is
  // rebuilt as "present" (the code applies the same rule again). A redacted element was the model's "unavailable".
  const status = (e: ReviewResult["elements"][number]) => (e.status === "unavailable_redacted" ? "unavailable" : e.elementId === "N6" && e.status === "not_applicable" ? "present" : e.status);
  const elements = saved.elements.filter((e) => ["present", "absent", "unclear", "unavailable"].includes(status(e))).map((e) => ({ element_id: e.elementId, status: status(e), sentence_ids: e.sentenceIds ?? [], note: e.note ?? "" }));
  const cit = saved.citation;
  const citation = { status: ["consistent", "likely_mismatch", "insufficient_information", "needs_human_review"].includes(cit.status) ? cit.status : "consistent", explanation: cit.explanation || "See evidence.",
    evidence: (cit.evidence ?? []).filter((e) => e.kind === "sentence").map((e) => ({ sentence_id: e.sentenceId, quote: e.quote })) };
  return JSON.stringify({ elements, issues, citation, human_review: { required: reasons.length > 0 || issues.some((i) => i.needs_human_review), reasons } });
}
const fake = (saved: ReviewResult): Complete => async (system) => {
  if (system !== FACTS_SYSTEM_PROMPT) return { text: reconstruct(saved), attempts: 1 };
  if (saved.factsExtraction?.status === "valid") return { text: JSON.stringify(saved.factsExtraction.output), attempts: 1 };
  throw new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1);
};
if (process.argv[1]?.endsWith("replay-reconstructed.ts"))
  for (const run of process.argv.slice(2)) {
    const checkout = run.replace(/\/eval\/runs\/[^/]+\/?$/, "");
    if (!existsSync(`${run}/raw`)) continue;
    const ds = existsSync(`${run}/run-info.json`) ? (JSON.parse(readFileSync(`${run}/run-info.json`, "utf8")).dataset as string | undefined) : undefined;
    const casesDir = `${checkout}/${!ds || ds === "eval" ? "eval/cases" : `${ds}/cases`}`;
    const runId = run.replace(/\/$/, "").split("/").slice(-1)[0];
    for (const f of readdirSync(`${run}/raw`).filter((x) => x.endsWith(".json")).sort()) {
      const saved = JSON.parse(readFileSync(`${run}/raw/${f}`, "utf8")) as ReviewResult;
      const casePath = `${casesDir}/${saved.caseId}.json`;
      if (!existsSync(casePath) || !saved.findings || !saved.elements) { console.log(JSON.stringify({ run: runId, case: saved.caseId, skipped: "case file or saved review fields not found" })); continue; }
      const c = JSON.parse(readFileSync(casePath, "utf8")) as CaseRecord;
      const r = await reviewCase(c, fake(saved));
      console.log(JSON.stringify({ run: runId, case: r.caseId, findings: r.findings.map((x) => ({ id: x.id, category: x.category, source: x.source, title: x.title, explanation: x.explanation, evidence: x.evidence.map((e) => e.sentenceId ?? e.fieldPath) })),
        citation: r.citation.status, citationEvidence: r.citation.evidence.map((e) => e.sentenceId ?? e.fieldPath), humanReview: r.humanReview.required, reasons: r.humanReview.reasons, accounts: r.humanReview.accounts, discarded: r.discarded.map((d) => d.title + ": " + d.reason), completion: r.completion?.status }));
    }
  }
