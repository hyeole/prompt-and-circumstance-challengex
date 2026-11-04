import type { ReviewResult } from "./types";

/**
 * Completion across the required checks, not only the main model call (audit item 1).
 * - failed: a required check that should have run and did not (model review, fact extraction, element outputs
 *   the model omitted, the citation check). Any failure makes the review partial.
 * - unsupported: checks that cannot run for this case by design (a redacted source field, an item whose
 *   applicability could not be determined, a charge with no team reference). These are named, but do not make
 *   the review partial, and they are never passes.
 */
export type Completion = {
  status: "complete" | "partial";
  failed: { check: string; reason: string }[];
  unsupported: { check: string; reason: string }[];
};

export function computeCompletion(r: Pick<ReviewResult, "modelStatus" | "modelError" | "calls" | "elements" | "citation">, opts: { citationExpected: boolean }): Completion {
  const failed: Completion["failed"] = [];
  const unsupported: Completion["unsupported"] = [];
  if (r.modelStatus !== "ok") failed.push({ check: "Model review", reason: r.modelError ? `did not complete (${r.modelError})` : "did not complete" });
  // The fact call may be retried once ("facts-retry"); it is complete if either attempt succeeded.
  const factCalls = (r.calls ?? []).filter((c) => c.role === "facts" || c.role === "facts-retry");
  const lastFacts = factCalls.at(-1);
  if (lastFacts && !factCalls.some((c) => c.status === "ok")) failed.push({ check: "Fact extraction", reason: `did not complete (${lastFacts.error ?? lastFacts.status}); entry and history comparisons used only statements read from the source text by rules` });
  const omitted = (r.elements ?? []).filter((e) => e.status === "not_checked");
  // Elements another completed check decided because the model's answer did not arrive: still a missing model answer.
  const byFallback = (r.elements ?? []).filter((e) => e.decidedWithoutModel);
  if ((omitted.length || byFallback.length) && r.modelStatus === "ok")
    failed.push({ check: "Required elements", reason: `no output for ${[...omitted, ...byFallback].map((e) => e.elementId).join(", ")}${byFallback.length ? ` (${byFallback.map((e) => e.elementId).join(", ")} decided from the completed fact extraction)` : ""}` });
  if (opts.citationExpected && r.citation?.status === "not_checked") failed.push({ check: "Citation check", reason: "did not run" });
  const redacted = (r.elements ?? []).filter((e) => e.status === "unavailable_redacted");
  if (redacted.length) unsupported.push({ check: "Redacted information", reason: `${redacted.map((e) => e.elementId).join(", ")} cannot be checked from a redacted source` });
  const unclearCtx = (r.elements ?? []).filter((e) => e.status === "applicability_unclear");
  if (unclearCtx.length) unsupported.push({ check: "Context-dependent items", reason: `${unclearCtx.map((e) => e.elementId).join(", ")}: the case context could not be determined` });
  if (r.citation?.status === "insufficient_information") unsupported.push({ check: "Citation check", reason: "no team reference for the selected charge" });
  return { status: failed.length ? "partial" : "complete", failed, unsupported };
}

/** Completion of a stored review, including reviews saved before the completion field existed. */
export function completionOf(r: ReviewResult): Completion {
  if (r.completion) return r.completion;
  return computeCompletion({ ...r, calls: r.calls ?? [] }, { citationExpected: false });
}

export const isComplete = (r: ReviewResult) => completionOf(r).status === "complete";

/** One line for banners and exports. */
export const completionSummary = (c: Completion) =>
  c.status === "complete" ? "complete" : `partial: ${c.failed.map((f) => `${f.check} ${f.reason}`).join("; ")}`;
