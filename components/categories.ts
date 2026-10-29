import type { FindingCategory, ElementStatus, CitationStatus, CheckStatus } from "@/lib/types";

// Every color is paired with a text label so meaning never depends on color alone.
export const CATEGORY: Record<FindingCategory, { label: string; short: string }> = {
  missing_element: { label: "Missing element", short: "Missing" },
  inconsistency: { label: "Inconsistency", short: "Conflict" },
  unclear: { label: "Unclear statement", short: "Unclear" },
  citation: { label: "Citation check", short: "Citation" },
  human_review: { label: "Human review", short: "Review" },
};

export const ELEMENT_STATUS: Record<ElementStatus, { label: string; icon: string }> = {
  present: { label: "Present", icon: "✓" },
  absent: { label: "Not stated", icon: "✕" },
  unclear: { label: "Unclear", icon: "?" },
  unavailable_redacted: { label: "Unavailable (redacted)", icon: "▮" },
  unavailable_unreadable: { label: "Unavailable (unreadable)", icon: "▯" },
  not_checked: { label: "Not checked", icon: "–" },
};

export const CITATION_STATUS: Record<CitationStatus, string> = {
  consistent: "Consistent with narrative facts",
  likely_mismatch: "Possible mismatch",
  insufficient_information: "Cannot check: reference unavailable",
  needs_human_review: "Needs human review",
  not_checked: "Not checked",
};

export const CHECK_STATUS: Record<CheckStatus, string> = {
  completed_with_findings: "Completed, findings",
  completed_no_findings: "Completed, no findings",
  unavailable: "Unavailable",
  partial: "Partial",
};
