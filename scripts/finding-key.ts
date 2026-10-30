// Stable identity of a finding for manual adjudication: category + evidence sources (field path, element,
// or the first 60 characters of the cited sentence with redaction tags removed).
import type { Finding, ReviewResult } from "../lib/types";

const low = (s: string) => s.toLowerCase();
const keyText = (r: ReviewResult, id?: string) =>
  low(r.sentences.find((s) => s.id === id)?.text ?? "").replace(/\[(redacted|unreadable)[^\]]*\]/g, "").replace(/[\s,]+/g, " ").trim().slice(0, 60).trim();

export const findingKey = (r: ReviewResult, f: Finding) =>
  `${f.category}|${f.evidence.map((e) => e.fieldPath ?? e.elementId ?? keyText(r, e.sentenceId)).sort().join("|")}`;

// What a finding claims, so a different claim on the same evidence is never judged by inheritance: the element for
// checklist findings, the check for rule and fact-comparison findings, "citation", and for free-text model findings
// the title reduced to its content words ("Encounter time discrepancy" and "Encounter time mismatch" are one claim).
const CLAIM_STOP = new Set(["between", "form", "forms", "narrative", "field", "fields", "and", "the", "of", "with", "vs", "versus", "in", "on", "for", "a", "an", "to", "from", "and/or",
  "mismatch", "mismatches", "discrepancy", "discrepancies", "conflict", "conflicts", "conflicting", "inconsistency", "inconsistent", "differs", "differ", "different", "difference", "contradiction", "possible"]);
// Words are sorted, so "entry date and place" and "entry place and date" are one claim.
export const normalizeClaimTitle = (t: string) => low(t).replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w && !CLAIM_STOP.has(w)).sort().join(" ");
export function claimOf(id: string, title: string, fieldPath?: string): string {
  const m = id.match(/^[MU]-([EN]\d+)$/);
  if (m) return m[1];
  if (id.startsWith("U-ACCOUNT")) return `account:${fieldPath ?? ""}`;
  if (/^(R|F)-/.test(id)) return id;
  if (/^C-\d+$/.test(id)) return "citation";
  return `${id.replace(/-\d+$/, "")}:${normalizeClaimTitle(title)}`;
}
export const findingClaim = (f: Finding) => claimOf(f.id, f.title, f.evidence.find((e) => e.fieldPath)?.fieldPath);
