// Case summaries for the Workspace and Cases pages, built only from saved data (no derived scores).
import "server-only";
import { allCases } from "./caseSource";
import { getHistory } from "./store";
import { completionOf } from "./completion";
import type { CaseRecord } from "./types";

export type CaseGroup = "source" | "variant" | "entered";
export const groupOf = (c: CaseRecord): CaseGroup => (c.kind === "user-case" ? "entered" : c.kind === "synthetic-variant" || c.kind === "synthetic" ? "variant" : "source");

export type ReviewState = "not_reviewed" | "incomplete" | "needs_human_review" | "reviewed";

export interface CaseRow {
  id: string;
  title: string;
  kind: CaseRecord["kind"];
  group: CaseGroup;
  createdAt?: string;
  versions: number;
  lastReviewedAt?: string;
  state: ReviewState;
  findings?: number;
  openDecisions?: number; // findings in the latest review with no officer decision yet
}

export function caseRows(set: "app" | "eval" = "app"): CaseRow[] {
  return allCases(set).map((c) => {
    const h = getHistory(c.id);
    const last = h.versions.at(-1);
    const base = { id: c.id, title: c.title, kind: c.kind, group: groupOf(c), createdAt: c.userCase?.createdAt, versions: h.versions.length };
    if (!last) return { ...base, state: "not_reviewed" as const };
    const decided = h.decisions[last.review.reviewId] ?? {};
    const open = last.review.findings.filter((f) => !decided[f.id] || decided[f.id].state === "open").length;
    // Recomputed from the review, so reviews saved before the completion field existed follow the same rule.
    const state: ReviewState = completionOf(last.review).status === "partial" || last.completion === "partial" ? "incomplete" : last.review.humanReview.required ? "needs_human_review" : "reviewed";
    return { ...base, lastReviewedAt: last.savedAt, state, findings: last.review.findings.length, openDecisions: open };
  });
}

export const STATE_LABEL: Record<ReviewState, string> = { not_reviewed: "Not reviewed", incomplete: "Review incomplete", needs_human_review: "Needs human review", reviewed: "Reviewed" };
export const GROUP_LABEL: Record<CaseGroup, string> = { source: "Adapted source record", variant: "Synthetic test variant", entered: "Entered case" };
