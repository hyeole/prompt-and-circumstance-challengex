// Case summaries for the Workspace and Cases pages, built only from saved data (no derived scores).
import "server-only";
import { allCases } from "./caseSource";
import { metered } from "./kv";
import { caseSummaries } from "./store";
import type { CaseRecord } from "./types";
import { currentVisitor } from "./visitor";

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

/** The current visitor's case list: their entered cases plus the sample cases, with their own review status. */
export async function caseRows(set: "app" | "eval" = "app"): Promise<CaseRow[]> {
  const vid = await currentVisitor();
  return metered(async () => {
    const cases = await allCases(vid, set);
    const sums = await caseSummaries(vid, cases.map((c) => c.id));
    return cases.map((c) => {
      const h = sums.get(c.id) ?? { versions: 0 };
      const base = { id: c.id, title: c.title, kind: c.kind, group: groupOf(c), createdAt: c.userCase?.createdAt, versions: h.versions };
      if (!h.versions) return { ...base, state: "not_reviewed" as const };
      const state: ReviewState = h.completion === "partial" ? "incomplete" : h.humanReview ? "needs_human_review" : "reviewed";
      return { ...base, lastReviewedAt: h.lastReviewedAt, state, findings: h.findings, openDecisions: h.openDecisions };
    });
  });
}

export const STATE_LABEL: Record<ReviewState, string> = { not_reviewed: "Not reviewed", incomplete: "Review incomplete", needs_human_review: "Needs human review", reviewed: "Reviewed" };
export const GROUP_LABEL: Record<CaseGroup, string> = { source: "Adapted source record", variant: "Synthetic test variant", entered: "Entered case" };
