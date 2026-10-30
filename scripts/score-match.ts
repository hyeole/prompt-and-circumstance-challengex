/**
 * Matching rules for scoring policy v2.4 (eval/README.md). Kept apart from score-eval.ts so the rules can be tested.
 *
 * v2.3 change: sharing a field or sentence with a planted issue is not enough. An inconsistency finding must also
 * identify the planted discrepancy: it must be about the right fact, use conflict language, not be about legibility
 * or formatting, and either cite the planted sentence or name the planted value.
 * v2.4 change: "about the right fact" is checked per clause and per event. A clause must state the conflict about the
 * planted fact (an entry-date plant needs a date conflict about the entry, not "entry location differs; dates agree",
 * nor a birth or arrest date). A clause saying that fact agrees disqualifies the finding. An ambiguity plant needs a
 * review-marked finding about conflicting or unattributable accounts of the entry, not any finding citing the anchor.
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

/** The specific fact of each planted field, as it must appear in a clause that states the conflict (v2.4). */
const FACT: Record<string, RegExp> = {
  "entry.date": /\b(dates?|years?|months?|when)\b|\b(19|20)\d\d\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/i,
  "entry.manner": /\b(manner|how|inspect\w*|admi(tted|ssion)|paroled|visa|port of entry|crossing card|EWI|PWA|AFOOT|without inspection|illegal(ly)?|flew|flying|airport|swam|wad(ed|ing)|walk(ed|ing)|on foot)\b/i,
  "entry.place": /\b(place|location|where|port|city|town|near|miles? (north|south|east|west)|[A-Z][a-z]+,? (Texas|Arizona|California|New Mexico|TX|AZ|CA|NM))\b/,
  "history.immigration_record": /\b(remov\w*|deport\w*|record|history|prior|previous(ly)?|NEGATIVE|POSITIVE|expedited|order|reinstat\w*|voluntary return|apprehen\w*|arrest\w*|notice to appear)\b/i,
};
// The planted entry facts are about the U.S. entry. A clause about another event's date or place is not about them.
const OTHER_EVENT = /\b(birth|born|DOB|arrest(ed)? (date|time|location)|date of (arrest|birth|encounter)|encounter (date|time|location)|apprehension (date|time))\b/i;
const AGREES: Record<string, RegExp> = {
  "entry.date": /\b(dates?|years?)\b[^.;]{0,20}\b(agree|match(es)?|are (the )?same|is (the )?same|are consistent|is consistent|align)\b|\bsame (entry )?(date|year)\b/i,
  "entry.manner": /\bmanners?\b[^.;]{0,20}\b(agree|match(es)?|are (the )?same|is (the )?same|consistent)\b|\bsame manner\b/i,
  "entry.place": /\b(places?|locations?)\b[^.;]{0,20}\b(agree|match(es)?|are (the )?same|is (the )?same|consistent)\b|\bsame (place|location)\b/i,
  "history.immigration_record": /\b(histor(y|ies)|records?)\b[^.;]{0,20}\b(agree|match(es)?|are consistent|consistent)\b/i,
};
const clausesOf = (t: string) => t.split(/\s*;\s*|\.\s+|:\s+/).filter(Boolean);
/** v2.4: some clause states a conflict about the planted fact of the planted event, and none says that fact agrees. */
export function conflictAboutFact(f: Finding, fp: string): boolean {
  const re = FACT[fp];
  if (!re) return true;
  const cl = clausesOf(`${f.title}. ${f.explanation}`);
  if (AGREES[fp] && cl.some((c) => AGREES[fp].test(c))) return false;
  const citesField = f.evidence.some((e) => e.kind === "field" && e.fieldPath === fp);
  const ENTRY_WORDS = /\b(entry|entered|enter|cross\w*|arriv\w*)\b/i;
  // When the finding names another event's date or place anywhere, an unqualified clause ("Date conflict") is not
  // taken to be about the entry: the conflicting clause must say entry itself.
  const otherEvent = fp.startsWith("entry.") && cl.some((c) => OTHER_EVENT.test(c));
  return cl.some((c) => {
    if (!re.test(c) || (otherEvent && !ENTRY_WORDS.test(c))) return false;
    const values = fp === "entry.date" ? new Set(c.match(/\b(19|20)\d\d\b/g) ?? []) : new Set<string>();
    return CONFLICT.test(c) || values.size >= 2 || (citesField && /\b(form|field)\b/i.test(c) && /\bnarrative\b/i.test(c));
  });
}

export function identifiesDiscrepancy(r: ReviewResult, f: Finding, p: Extract<Plant, { type: "inconsistency" }>): boolean {
  const text = `${f.title}. ${f.explanation}`;
  if (PRESENTATION.test(text)) return false;
  if (!CONFLICT.test(text)) return false;
  const aspects = p.fieldPaths.map((fp) => ASPECT[fp]).filter(Boolean);
  if (aspects.length && !aspects.some((re) => re.test(text))) return false;
  if (p.fieldPaths.length && !p.fieldPaths.some((fp) => conflictAboutFact(f, fp))) return false;
  if (citesAnchor(r, f, p.anchors)) return true;
  // Field-only evidence: the finding must name the planted value (e.g. the year the team changed).
  const cites = f.evidence.some((e) => e.kind === "field" && p.fieldPaths.includes(e.fieldPath!));
  return cites && anchorValues(p.anchors).some((v) => low(text).includes(v));
}

// v2.4: an ambiguity plant (a statement that conflicts with the record or another account) is identified only by a finding
// about conflicting or unattributable accounts of the entry. An element-check finding (identity documents, a missing
// element) that happens to cite the same sentence does not identify it.
const AMBIGUITY = /\b(unclear (who|whose|which|whether)|ambigu\w*|attribut\w*|which (person|subject|individual|account)|whose|cannot be (determined|attributed|confirmed)|conflict\w*|inconsisten\w*|contradict\w*|disagree\w*|(two|different|differing) accounts|does not match|differs?)\b/i;
const ENTRY_TOPIC = /\b(entr(y|ies)|enter(ed|ing)?|cross(ed|ing)?|manner|admi(tted|ssion)|inspect\w*|port of entry|crossing card|arriv\w*)\b/i;
export const aboutAmbiguity = (f: Finding) => {
  if (/^[MU]-[EN]\d+$/.test(f.id) || f.category === "missing_element") return false;
  const text = `${f.title}. ${f.explanation}`;
  return !PRESENTATION.test(text) && AMBIGUITY.test(text) && ENTRY_TOPIC.test(text);
};

/** Does this finding specifically address this plant? */
export function matches(r: ReviewResult, f: Finding, p: Plant): boolean {
  switch (p.type) {
    case "missing_element": return (f.category === "missing_element" || f.category === "unclear") && f.referenceIds.includes(p.elementId);
    case "inconsistency": return (f.category === "inconsistency" || f.category === "unclear") && identifiesDiscrepancy(r, f, p);
    case "citation": return f.category === "citation";
    case "human_review": return p.reason === "multi_charge" ? f.id === "R-MULTI-CHARGE" : f.needsHumanReview && citesAnchor(r, f, p.anchors ?? []) && aboutAmbiguity(f);
  }
}

export { isComplete } from "../lib/completion";
