// Stable identity of a finding for manual adjudication: category + evidence sources (field path, element,
// or the first 60 characters of the cited sentence with redaction tags removed).
import type { Finding, ReviewResult } from "../lib/types";

const low = (s: string) => s.toLowerCase();
const keyText = (r: ReviewResult, id?: string) =>
  low(r.sentences.find((s) => s.id === id)?.text ?? "").replace(/\[(redacted|unreadable)[^\]]*\]/g, "").replace(/[\s,]+/g, " ").trim().slice(0, 60).trim();

export const findingKey = (r: ReviewResult, f: Finding) =>
  `${f.category}|${f.evidence.map((e) => e.fieldPath ?? e.elementId ?? keyText(r, e.sentenceId)).sort().join("|")}`;

/**
 * What a finding claims (claim-aware adjudication, eval/migrations/2026-10-30-adjudication-claims.json). Two findings
 * make the same claim only if every part is identical; anything else needs manual adjudication. Word order is kept
 * and nothing is treated as a synonym. Parts:
 * - kind: the element and whether it is missing or unclear (M-N1 vs U-N1 differ), the rule or fact check, the
 *   citation check, or a free-text model claim (I/Q) with its title as written;
 * - values: dates, years, clock times and form codes, in the order the explanation gives them;
 * - direction: which source the explanation names first (form or narrative);
 * - negation: whether the explanation negates;
 * - subject and event: the attribution and event recorded on the cited evidence.
 */
export function findingClaim(f: Pick<Finding, "id" | "title" | "explanation" | "evidence">): string {
  const el = f.id.match(/^([MU])-([EN]\d+)$/);
  const kind = el ? `${el[1]}-${el[2]}` : /^(R|F)-/.test(f.id) ? f.id : /^C-\d+$/.test(f.id) ? "citation" : `${f.id.replace(/-\d+$/, "")}:${low(f.title).replace(/[^a-z0-9() ]+/g, " ").replace(/\s+/g, " ").trim()}`;
  const ex = f.explanation ?? "";
  const values = (ex.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(19|20)\d\d\b|\b\d{1,2}:\d{2}\b|\b\d{4}\s*hours\b|\b(EWI|PWA|AFOOT|NEGATIVE|POSITIVE|B1|B2|B1\/B2|H2B|NIM|AIR|VR|NTA)\b/g) ?? []).map((v) => v.replace(/\s*hours/, "h"));
  const iForm = ex.search(/\bform\b/i), iNarr = ex.search(/\bnarrative\b/i);
  const direction = iForm < 0 && iNarr < 0 ? "-" : iNarr < 0 || (iForm >= 0 && iForm < iNarr) ? "form>narrative" : "narrative>form";
  const negation = /\b(not|no|never|without|none|neither|nor)\b|n't\b/i.test(ex) ? "neg" : "pos";
  const ctx = f.evidence.map((e) => (e.kind === "sentence" ? `${e.context?.attribution ?? "?"}/${e.context?.event ?? "?"}` : e.kind === "field" ? `field:${e.fieldPath}` : `element:${e.elementId}`)).sort().join(",");
  return [kind, values.join(">"), direction, negation, ctx].join(" | ");
}

// ---- Claim v2 (scoring policy v2.4; eval/migrations/2026-10-30-adjudication-claims-v2.json) ----
// v1 recorded one negation flag for the whole explanation and only which source was named first, so opposite claims
// ("the form reports no prior removal; the narrative documents a removal" and the reverse) got the same key. v2 records,
// for each clause, WHO says it (form or narrative), WHAT it is about, and whether THAT clause negates it.
const TOPICS: [string, RegExp][] = [
  ["removal", /\b(remov\w*|deport\w*|reinstat\w*|exclu\w*|expedited)\b/i],
  ["prior-encounter", /\b(voluntary (return|departure)|notice to appear|previously (arrested|apprehended|encountered)|apprehen\w*)\b/i],
  ["entry-date", /\b(entry|entered|enter|arriv\w*|cross\w*)\b[^;,]{0,30}\b(dates?|years?|months?|(19|20)\d\d)\b|\b(dates?|years?|(19|20)\d\d) (of|for) (the )?(last )?entry\b|\bentry\.date\b/i],
  ["entry-place", /\b(entry|entered|enter|cross\w*)\b[^;,]{0,30}\b(place|location|port)\b|\b(place|location|port) of (last )?entry\b|\bentry\.place\b/i],
  ["entry-manner", /\b(manner|EWI|PWA|AFOOT|without inspection|inspect\w*|admi(tted|ssion)|paroled|visa|crossing card|illegal(ly)?|swam|waded|flew|flying)\b/i],
  ["encounter-time", /\b(\d{4}\s*hours|encounter time|arrest time|time of (the )?(encounter|arrest))\b|\bencounter\.date_time\b/i],
  ["status", /\b(status|lawful(ly)?|unlawful(ly)?|present without|no (valid )?(documents|documentation))\b/i],
  ["identity-document", /\b(passport|identification|ID card|consular|cedula|birth certificate|driver'?s licen[cs]e)\b/i],
  ["charge", /\b(charge|citation|INA|U\.?S\.?C\.?|section)\b/i],
];
const SOURCE_FORM = /\b(form|field|I-213|I-44|record (shows|indicates|lists|states|records))\b/i;
const SOURCE_NARR = /\b(narrative|statement|subject (stated|said|claims?|admitted)|he (stated|said|claimed|admitted)|she (stated|said|claimed|admitted))\b/i;
const NEG = /\b(no|not|never|none|neither|nor|without|lacks?|absent|fails? to|does not|doesn't|did not|didn't|is not|was not|has no)\b/i;

/** One proposition per clause: source (form / narrative / both / ?), polarity of that clause, and its topics. */
export function claimPropositions(text: string): { props: string[]; uncertain: boolean } {
  const clauses = text.split(/\s*;\s*|\.\s+|,?\s+\b(?:but|while|whereas|however|although)\b\s+|,\s+(?=the (?:form|narrative|record)\b)/i).filter((x) => x && x.trim());
  const props: string[] = [];
  let uncertain = false;
  for (const cl of clauses) {
    const topics = TOPICS.filter(([, re]) => re.test(cl)).map(([t]) => t);
    if (!topics.length) continue;
    const f = SOURCE_FORM.test(cl), n = SOURCE_NARR.test(cl);
    const src = f && n ? "both" : f ? "form" : n ? "narrative" : "?";
    if (src === "?") uncertain = true;
    // Negation counts only when it precedes a topic word in the same clause ("no prior removal", "was not admitted").
    const firstTopic = Math.min(...TOPICS.filter(([t]) => topics.includes(t)).map(([, re]) => cl.search(re)).filter((i) => i >= 0));
    const neg = NEG.test(cl.slice(0, firstTopic + 25)) ? "neg" : "pos";
    props.push(`${src}:${neg}:${topics.join("+")}`);
  }
  if (!props.length) uncertain = true;
  return { props: [...new Set(props)].sort(), uncertain };
}

/**
 * The claim of a finding under claim v2: kind, ordered values, the clause propositions (source, polarity, topics) and
 * the subject/event of the cited evidence. A claim whose sources or topics cannot be identified ends in "| UNCERTAIN"
 * and is never inherited: a person must adjudicate it.
 */
export function findingClaimV2(f: Pick<Finding, "id" | "title" | "explanation" | "evidence">): string {
  const base = findingClaim(f).split(" | ");
  const { props, uncertain } = claimPropositions(f.explanation ?? "");
  // Element findings (missing/unclear element X) and rule or fact-check findings (R-, F-) have claims fixed by their
  // kind, values and evidence; only free-text model claims (issues and citation verdicts) need their clauses resolved.
  const templated = /^([MU]-[EN]\d+|R-|F-)/.test(f.id);
  return [base[0], base[1], props.join(";"), base[4], ...(uncertain && !templated ? ["UNCERTAIN"] : [])].join(" | ");
}
