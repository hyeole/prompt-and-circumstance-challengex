// Comparing two reviewed versions of a case. Findings are matched only when that can be done reliably; otherwise the
// comparison says so instead of guessing.
import { diffWords } from "diff";
import type { Finding, ReviewResult } from "./types";

export type WordChange = { kind: "same" | "added" | "removed"; text: string };

/** Word-level comparison of two texts (officer edits between versions). */
export function wordDiff(before: string, after: string): WordChange[] {
  return diffWords(before, after).map((p) => ({ kind: p.added ? "added" : p.removed ? "removed" : "same", text: p.value }));
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** Identity of a finding across versions: category + its sources (field path, element, or the full cited sentence text). */
function key(r: ReviewResult, f: Finding) {
  return `${f.category}|${f.evidence.map((e) => e.fieldPath ?? e.elementId ?? norm(r.sentences.find((s) => s.id === e.sentenceId)?.text ?? e.quote ?? "")).sort().join("|")}`;
}

export interface FindingComparison {
  available: boolean;
  reason?: string;
  added: Finding[];
  persisting: Finding[];
  resolved: Finding[];
  /** Findings whose cited sentences were edited, so they cannot be matched reliably. */
  unmatched: Finding[];
}

export function compareFindings(before: ReviewResult, after: ReviewResult): FindingComparison {
  const empty = { added: [], persisting: [], resolved: [], unmatched: [] };
  if (before.modelStatus !== "ok" || after.modelStatus !== "ok")
    return { available: false, reason: "One of the reviews was partial, so findings cannot be compared.", ...empty };
  if (before.promptVersion !== after.promptVersion || before.referenceVersion !== after.referenceVersion)
    return { available: false, reason: "The reviews used different prompt or reference versions, so findings cannot be compared.", ...empty };

  const afterText = new Set(after.sentences.map((s) => norm(s.text)));
  const beforeText = new Set(before.sentences.map((s) => norm(s.text)));
  // A finding can be matched only if every sentence it cites still exists word for word in the other version.
  const stable = (r: ReviewResult, f: Finding, other: Set<string>) =>
    f.evidence.every((e) => e.kind !== "sentence" || other.has(norm(r.sentences.find((s) => s.id === e.sentenceId)?.text ?? "")));

  const bKeys = new Map(before.findings.map((f) => [key(before, f), f]));
  const aKeys = new Map(after.findings.map((f) => [key(after, f), f]));
  const out: FindingComparison = { available: true, ...empty };
  for (const [k, f] of aKeys) {
    if (bKeys.has(k)) out.persisting.push(f);
    else if (stable(after, f, beforeText)) out.added.push(f);
    else out.unmatched.push(f);
  }
  for (const [k, f] of bKeys) {
    if (aKeys.has(k)) continue;
    if (stable(before, f, afterText)) out.resolved.push(f);
    else out.unmatched.push(f);
  }
  return out;
}
