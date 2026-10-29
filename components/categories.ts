import type { FindingCategory, ElementStatus, CitationStatus, CheckStatus } from "@/lib/types";

// Every color is paired with a text label and an icon so meaning never depends on color alone.
export const CATEGORY: Record<FindingCategory, { label: string; short: string; icon: string }> = {
  missing_element: { label: "Missing element", short: "Missing", icon: "missing" },
  inconsistency: { label: "Inconsistency", short: "Conflicts", icon: "conflict" },
  unclear: { label: "Unclear statement", short: "Unclear", icon: "unclear" },
  citation: { label: "Citation check", short: "Citation", icon: "citation" },
  human_review: { label: "Human review", short: "Review", icon: "review" },
};

export const ELEMENT_STATUS: Record<ElementStatus, { label: string; icon: string }> = {
  present: { label: "Established", icon: "check" },
  absent: { label: "Not stated", icon: "x" },
  unclear: { label: "Unclear", icon: "unclear" },
  unavailable_redacted: { label: "Unavailable (redacted)", icon: "shield" },
  unavailable_unreadable: { label: "Unavailable (unreadable)", icon: "info" },
  not_checked: { label: "Not checked", icon: "clock" },
};

export const CITATION_STATUS: Record<CitationStatus, string> = {
  consistent: "Consistent with facts",
  likely_mismatch: "Possible mismatch",
  insufficient_information: "Reference unavailable",
  needs_human_review: "Needs human review",
  not_checked: "Not checked",
};

export const CHECK_STATUS: Record<CheckStatus, string> = {
  completed_with_findings: "Completed, findings",
  completed_no_findings: "Completed, no findings",
  unavailable: "Unavailable",
  partial: "Partial",
};
