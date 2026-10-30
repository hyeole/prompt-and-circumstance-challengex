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
