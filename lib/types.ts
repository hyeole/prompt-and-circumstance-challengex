// Shared types for cases, references, and review results.

/** How a piece of information is available to the reviewer. Redacted or unreadable is never treated as an officer omission. */
export type FieldStatus = "present" | "redacted" | "absent" | "unreadable" | "not_applicable";

export interface FactField {
  path: string; // e.g. "entry.manner"
  label: string;
  value: string;
  status: FieldStatus;
  sourcePage?: number; // PDF page number in the public source
  sourceField?: string; // printed field name on the form
}

export interface PageSpan {
  page: number;
  start: number;
  end: number;
}

export interface SelectedCharge {
  citation: string; // e.g. "INA 212(a)(6)(A)(i)"
  referenceId?: string; // id in config/references.json, if the citation matches one
  source: "officer-selected" | "stated-in-record" | "team-assigned-for-testing";
  note?: string;
}

export type CaseKind = "adapted-public-record" | "synthetic-variant" | "synthetic" | "user-case";

export interface CaseRecord {
  id: string;
  title: string;
  kind: CaseKind;
  split?: "dev" | "heldout" | "demo";
  baseCaseId?: string;
  provenance: {
    source: string;
    sourceUrl?: string;
    pdfPages?: number[];
    extraction: string;
    verification: string;
    replacements: { original: string; replacement: string; note: string }[];
    modifications?: string[]; // documented edits for synthetic variants (expected findings live elsewhere)
    /** Where the narrative text came from. User cases must set this. */
    textOrigin?: "officer-entered" | "transcribed-from-source" | "synthetic-test";
  };
  /** Present on cases created in the app: when, and the attached source PDF if any (stored locally, never committed). */
  userCase?: { createdAt: string; sourcePdf?: { originalName: string; size: number; pages?: number[] } };
  narrative: { text: string; pageSpans?: PageSpan[] };
  facts: FactField[];
  selectedCharges: SelectedCharge[];
  recordedChargeCode?: string; // abbreviated code as printed on the form; mapping not assumed
  /** Case context(s). When absent, the context is inferred from the narrative and may be unknown. */
  context?: CaseContext[];
}

export type CaseContext = "interior" | "port_of_entry" | "expedited_removal";

export interface Sentence {
  id: string; // "S1"
  start: number;
  end: number;
  text: string;
  page?: number;
}

export type FindingCategory = "missing_element" | "inconsistency" | "unclear" | "citation" | "human_review";

export interface EvidenceRef {
  kind: "sentence" | "field" | "missing";
  sentenceId?: string;
  fieldPath?: string;
  elementId?: string;
  quote?: string; // verified verbatim text from the reviewed version
  start?: number; // offsets into the reviewed narrative
  end?: number;
  page?: number;
  verified: boolean;
  /** "exact": the quote matched the source after normalizing whitespace, case, quote marks and redaction markers.
   *  "partial": fact comparison only; the shown text is a source fragment that contains the material fact. */
  match?: "exact" | "partial";
  /** Who and what the cited statement is about, as decided by code (never inferred from redacted names). */
  context?: { attribution?: "subject" | "unclear" | "other"; event?: string };
}

export interface Finding {
  id: string;
  category: FindingCategory;
  title: string;
  explanation: string;
  evidence: EvidenceRef[];
  referenceIds: string[];
  needsHumanReview: boolean;
  humanReviewReason?: string;
  source: "rule" | "model";
  severity: "high" | "medium" | "low";
  /** For model issues: how many of the parallel samples reported an issue with the same evidence. */
  sampleAgreement?: number;
}

export type CheckStatus = "completed_with_findings" | "completed_no_findings" | "unavailable" | "partial";

export interface CheckResult {
  id: "required_elements" | "consistency" | "clarity" | "citation" | "routing";
  label: string;
  status: CheckStatus;
  note?: string;
}

export type ElementStatus = "present" | "absent" | "unclear" | "unavailable_redacted" | "unavailable_unreadable" | "not_checked" | "not_applicable" | "applicability_unclear";

export interface ElementResult {
  elementId: string;
  label: string;
  status: ElementStatus;
  sentenceIds: string[];
  fieldPaths: string[];
  note?: string;
  /** Unissant guidance category (S1-S6) this item implements. */
  sponsorCategory?: string;
  /** Set when the element is covered only by form fields whose values are not fully known. */
  qualifier?: "recorded_unknown" | "partly_unknown" | "see_narrative";
}

export type CitationStatus = "consistent" | "likely_mismatch" | "insufficient_information" | "needs_human_review" | "not_checked";

export interface ReviewResult {
  reviewId: string;
  caseId: string;
  narrativeHash: string;
  factsHash: string;
  createdAt: string;
  mode: "live";
  model: string;
  promptVersion: string;
  modelConfig: { reasoningEffort: string; samples: number; validSamples: number; factsPromptVersion: string; factsStatus: "ok" | "failed" };
  /** The fact extraction as validated and used by the comparison, or the reason it failed (never invalid model text). Absent in reviews made before it was recorded. */
  factsExtraction?: { status: "valid"; output: unknown } | { status: "failed"; reason: string };
  referenceVersion: string;
  latencyMs: number;
  modelLatencyMs?: number;
  modelAttempts: number;
  modelStatus: "ok" | "failed" | "invalid_output";
  modelError?: string;
  sentences: Sentence[];
  checks: CheckResult[];
  elements: ElementResult[];
  citation: { status: CitationStatus; citation: string; explanation: string; evidence: EvidenceRef[] };
  humanReview: {
    required: boolean; reasons: string[];
    /** Accounts that may conflict with this record but cannot be attributed to its subject, grouped by the fact they
     *  concern. Routing items for a person, not findings: no contradiction is claimed and they are not scored. */
    accounts?: { fieldPath?: string; sentenceIds: string[]; details: string[] }[];
  };
  findings: Finding[];
  notes: string[]; // informational context, not flags
  /** Case context used to decide which checklist items apply. */
  caseContext?: { contexts: CaseContext[]; source: "case" | "inferred" | "unknown"; basis?: string };
  checklistVersion?: string;
  discarded: { reason: string; title: string }[]; // model output dropped because evidence could not be verified
  /** Every model request made for this review, including failed and cancelled ones. */
  calls: { role: string; status: "ok" | "failed" | "cancelled" | "invalid_output"; ms: number; attempts: number; error?: string; chars?: number; tokens?: { prompt?: number; completion?: number; reasoning?: number } }[];
  /** Raw issue counts per sample before verification, to check that merging does not just accumulate flags. */
  sampleIssues: { perSample: number[]; merged: number; inAllSamples: number };
  /** Completion across every required check (lib/completion.ts). Absent on reviews saved before it existed. */
  completion?: import("./completion").Completion;
}
