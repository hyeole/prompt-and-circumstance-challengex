// Stable identity of a finding for manual adjudication: category + evidence sources (field path, element,
// or the first 60 characters of the cited sentence with redaction tags removed).
import type { Finding, ReviewResult } from "../lib/types";

const low = (s: string) => s.toLowerCase();
const keyText = (r: ReviewResult, id?: string) =>
  low(r.sentences.find((s) => s.id === id)?.text ?? "").replace(/\[(redacted|unreadable)[^\]]*\]/g, "").replace(/[\s,]+/g, " ").trim().slice(0, 60).trim();

export const findingKey = (r: ReviewResult, f: Finding) =>
  `${f.category}|${f.evidence.map((e) => e.fieldPath ?? e.elementId ?? keyText(r, e.sentenceId)).sort().join("|")}`;
