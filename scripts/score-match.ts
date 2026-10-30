/**
 * Matching rules for scoring policy v2.3 (eval/README.md). Kept apart from score-eval.ts so the rules can be tested.
 *
 * v2.3 change: sharing a field or sentence with a planted issue is not enough. An inconsistency finding must also
 * identify the planted discrepancy: it must be about the right fact, use conflict language, not be about legibility
 * or formatting, and either cite the planted sentence or name the planted value.
 */
import type { Finding, ReviewResult } from "../lib/types";

export type Plant =
  | { type: "missing_element"; elementId: string }
  | { type: "inconsistency"; anchors: string[]; fieldPaths: string[] }
  | { type: "citation" }
  | { type: "human_review"; reason: "multi_charge" | "ambiguity"; anchors?: string[] };

const low = (s: string) => s.toLowerCase();
const sentenceText = (r: ReviewResult, id?: string) => low(r.sentences.find((s) => s.id === id)?.text ?? "");
export const citesAnchor = (r: ReviewResult, f: Finding, anchors: string[]) =>
  f.evidence.some((e) => e.kind === "sentence" && anchors.some((a) => sentenceText(r, e.sentenceId).includes(low(a))));

/** What a finding must be about, per form field of the planted discrepancy. */
const ASPECT: Record<string, RegExp> = {
  "entry.date": /\b(date|year|when|entered|entry|arriv)/i,
  "entry.manner": /\b(manner|how|entered|entry|crossed|crossing|inspect|admi(tted|ssion)|visa|port|EWI|PWA|without|flew|swam|wad)/i,
  "entry.place": /\b(place|location|where|port|near|entered|entry|crossed)/i,
  "history.immigration_record": /\b(remov|deport|record|history|prior|previous|NEGATIVE|expedited|order)/i,
};
const CONFLICT = /\b(differ|different|conflict|contradict|mismatch|inconsisten|disagree|does not match|do not match|not match|versus|vs\.?|but|while|whereas|however|two (different )?(accounts|dates|years|statements))\b/i;
/** Problems with how a value is shown, not with what it says. Never a planted factual discrepancy. */
const PRESENTATION = /\b(font|unreadable|illegible|legib|blurr?y|format(ted|ting)?|typo|spelling|handwriting|smudged|faded)\b/i;

/** Values a finding can name to show it found the planted discrepancy: 4-digit years and the anchor text itself. */
const anchorValues = (anchors: string[]) => [...new Set(anchors.flatMap((a) => [low(a), ...(a.match(/\b(19|20)\d\d\b/g) ?? [])]))];

export function identifiesDiscrepancy(r: ReviewResult, f: Finding, p: Extract<Plant, { type: "inconsistency" }>): boolean {
  const text = `${f.title}. ${f.explanation}`;
  if (PRESENTATION.test(text)) return false;
  if (!CONFLICT.test(text)) return false;
  const aspects = p.fieldPaths.map((fp) => ASPECT[fp]).filter(Boolean);
  if (aspects.length && !aspects.some((re) => re.test(text))) return false;
  if (citesAnchor(r, f, p.anchors)) return true;
  // Field-only evidence: the finding must name the planted value (e.g. the year the team changed).
  const cites = f.evidence.some((e) => e.kind === "field" && p.fieldPaths.includes(e.fieldPath!));
  return cites && anchorValues(p.anchors).some((v) => low(text).includes(v));
}

/** Does this finding specifically address this plant? */
export function matches(r: ReviewResult, f: Finding, p: Plant): boolean {
  switch (p.type) {
    case "missing_element": return (f.category === "missing_element" || f.category === "unclear") && f.referenceIds.includes(p.elementId);
    case "inconsistency": return (f.category === "inconsistency" || f.category === "unclear") && identifiesDiscrepancy(r, f, p);
    case "citation": return f.category === "citation";
    case "human_review": return p.reason === "multi_charge" ? f.id === "R-MULTI-CHARGE" : f.needsHumanReview && citesAnchor(r, f, p.anchors ?? []);
  }
}

export { isComplete } from "../lib/completion";
