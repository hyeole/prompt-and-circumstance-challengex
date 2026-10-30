// Checklist v2: applicability by case context, and deterministic detection for items that can be checked without the model.
// The sponsor's table is guidance: an item that does not apply is "not applicable", and an item whose applicability
// depends on an unknown context is "applicability unclear". Neither ever becomes a missing-information finding.
import type { CaseContext, CaseRecord, ElementResult, Sentence } from "@/lib/types";
import { fieldQuality } from "@/lib/fieldQuality";

export type ChecklistItem = {
  id: string; label: string; fieldPaths: string[]; sponsorCategory?: string; appliesIn?: string[]; advisory?: boolean; conditional?: string;
};

/** Context from the case data, or inferred conservatively from the narrative and form. */
export function caseContext(c: CaseRecord, sentences: Sentence[]): { contexts: CaseContext[]; source: "case" | "inferred" | "unknown"; basis?: string } {
  if (c.context?.length) return { contexts: c.context, source: "case" };
  const text = sentences.map((s) => s.text).join(" ");
  const ctx: CaseContext[] = [];
  const basis: string[] = [];
  // Current expedited-removal processing (not a historical "received an Expedited Removal" in the subject's history).
  if (/\b(processed|being processed|is processed) (for|as) (an )?expedited removal|\bI-860\b|notice and order of expedited removal/i.test(text)) { ctx.push("expedited_removal"); basis.push("expedited-removal processing is described"); }
  if (/\b(applied|applying|application|applicant) for admission|\b(primary|secondary) inspection\b|presented (himself|herself|themselves) for inspection/i.test(text)) { ctx.push("port_of_entry"); basis.push("an application for admission or inspection at a port is described"); }
  const method = c.facts.find((f) => f.path === "encounter.method" && f.status === "present" && f.value.trim());
  if (!ctx.includes("port_of_entry") && (method || /\bBorder Patrol (agents?|station)|\bagents? (encountered|observed|located|apprehended)/i.test(text))) { ctx.push("interior"); basis.push(method ? "the form records a method of location/apprehension" : "a Border Patrol encounter is described"); }
  return ctx.length ? { contexts: ctx, source: "inferred", basis: basis.join("; ") } : { contexts: [], source: "unknown" };
}

/** Whether an item applies in the case context: true, false, or "unclear" when the context is unknown. */
export function applies(item: ChecklistItem, ctx: { contexts: CaseContext[] }): boolean | "unclear" {
  const where = item.appliesIn ?? ["all"];
  if (where.includes("all")) return true;
  if (!ctx.contexts.length) return "unclear";
  return where.some((w) => ctx.contexts.includes(w as CaseContext));
}

// Any statutory citation, and a precise one: INA 212/237 need at least paragraph and subparagraph ("212(a)(6)(A)");
// "INA 212(a)" alone does not state a specific ground (audit item 4). 8 U.S.C. 1325/1326 and INA 275/276 are specific.
const CITATION_RE = /\b(?:INA|Section|section)?\s*\b(?:212|237|235|275|276)\s*\(\s*a\s*\)|\b8\s*U\.?\s*S\.?\s*C\.?\s*§?\s*\d{4}/i;
const PRECISE_CITATION_RE = /\b(?:212|237)\s*\(\s*a\s*\)\s*\(\s*\d+\s*\)\s*\(\s*[A-Z]\s*\)|\b(?:275|276)\s*\(\s*a\s*\)|\b8\s*U\.?\s*S\.?\s*C\.?\s*§?\s*13(?:25|26)\b/i;
const EXPLAINS_RE = /\b(in that|because|as an alien|who (has|was|is|arrived|entered)|without (being )?(admitted|paroled|inspected)|remained .* longer than permitted|after (admission|removal|being removed))\b/i;
const GENERIC_RE = /\b(not credible|not a bona fide|lack(s|ed)? credibility)\b/i;
export const DISPOSITION_RE = /\b(notice to appear|refused admission|permitted to withdraw|(was|were|has been|have been) (returned|removed) to|released (on|from|pending)|(held|detained) (at|in|pending)|remain(s|ed)? in (custody|detention)|\bWA\/NTA|\bNTA\b|warrant of arrest|reinstate(d|ment)?|expedited removal order|I-860|voluntary (return|departure)|served (with )?(an? |the )?(Form )?(I-\d{3}|Notice to Appear|NTA|Notice and Order|warrant|order)|remanded|turned over to|transferred to (ICE|immigration)|detained pending|released on|processed (as|for) (a |an )?(WA\/NTA|NTA|reinstatement|expedited removal|voluntary))/i;
// Facts that meet a ground, stated anywhere in the narrative: the basis facts (E6) or an illegal / uninspected entry.
const FACTS_FOR_GROUND_RE = new RegExp(`${EXPLAINS_RE.source}|\\b(crossed|entered|cross|enter)\\b[^.]{0,60}\\billegal(ly)?\\b|\\billegal(ly)? (crossed|cross|crossing|entry|entered)|\\bwithout (being )?(inspection|admission|parole)\\b|\\b(overst(ay|ayed)|remained [^.]{0,40}longer than (permitted|authorized))`, "i");
const BASIS_RE = /\b(illegal(ly)? (present|in the United States|entered)|without (any |valid )?(immigration )?(documents|documentation|status)|no (valid |legal )?(immigration )?(documents|documentation|status)|not in possession of any|overst(ay|ayed)|expired|altered|counterfeit|fraudulent(ly)?|fraud|misrepresent(ation|ed)?|invalid (passport|visa|document)|ordered removed|without permission to reapply)\b/i;
// Identifying documents: a document the person had, carried, presented or was identified by, or a statement that there
// were none. Mentioning a document is not enough ("his visa application was denied" identifies no one: audit item 4).
const ID_DOC = "(passport|identification card|ID card|driver'?s licen[cs]e|birth certificate|consular (ID|identification)( card)?|identity documents?|identification documents?|national (ID|identity card)|voter (ID|card)|cedula|border crossing card|visa)";
export const DOCUMENT_RE = new RegExp(`\\b(had|has|have|carried|carrying|possess(ed|ing)?|in (his|her|their) possession|presented|presenting|produced|provided|showed|displayed|tendered|found|identified (himself|herself|themselves|him|her|them)? ?(with|by|using)|using|received (a copy of)?|obtained|seized|surrendered|copy of)\\b[^.]{0,60}\\b${ID_DOC}s?\\b|\\b${ID_DOC}s?\\b[^.]{0,30}\\b(was|were) (found|presented|produced|located|seized)\\b|\\b(no|any|without) (form of |valid )?(identification|identity documents?|documents)\\b(?! (allowing|that (would )?allow|to (be|remain|live|enter|stay)|permitting))|\\bdid not (have|possess) any (identification|documents)\\b`, "i");

const DOCS_PRESENTED_RE = /\b(presented|presenting|showed|displayed|tendered)\b[^.]{0,80}\b(passport|visa|card|document|permit|license)|\b(passport|visa)\b[^.]{0,40}\b(presented|shown)\b/i;
const PURPOSE_RE = /\b(purpose (of|for) (his|her|their|the) (trip|travel|visit)|purpose was|for (tourism|business|pleasure|a visit|a conference|medical)|intend(ed|s)? to (visit|work|study|stay|live)|(visit|visiting) (a |his |her |their )?(family|friends?|relatives?|cousins?|sons?|daughters?|parents?|brothers?|sisters?|girlfriends?|boyfriends?))\b/i;
const ADVISAL_RE = /\b(advised|informed|notified)\b[^.]{0,60}\b(charge|inadmissib|removab)/i;
const RESPONSE_RE = /\b(sworn statement|I-867|opportunity to respond|given (an|the) opportunity|asked (if|whether) (he|she|they) (had|wished|wanted)[^.]{0,40}(add|say|respond))\b/i;

const sentencesMatching = (sentences: Sentence[], re: RegExp) => sentences.filter((s) => re.test(s.text)).map((s) => s.id);

/** Deterministic result for items that do not need the model. Returns null when the model should decide. */
export function detect(item: ChecklistItem, c: CaseRecord, sentences: Sentence[]): ElementResult | null {
  const base = { elementId: item.id, label: item.label, sponsorCategory: item.sponsorCategory, fieldPaths: [] as string[] };
  if (item.id === "N5") {
    // Both components are required: the precise section and subsection, and the facts that meet it.
    const cites = sentencesMatching(sentences, CITATION_RE);
    if (cites.length) {
      const precise = cites.filter((id) => PRECISE_CITATION_RE.test(sentences.find((s) => s.id === id)!.text));
      if (!precise.length) return { ...base, status: "unclear", sentenceIds: cites, note: "A statute is cited, but not the precise section and subsection of the ground relied on." };
      const explained = precise.filter((id) => EXPLAINS_RE.test(sentences.find((s) => s.id === id)!.text));
      if (explained.length) return { ...base, status: "present", sentenceIds: explained, note: "The narrative states the precise section and explains how the facts meet it." };
      // The explanation may be elsewhere: sentences that state the facts behind the violation (as for E6).
      const facts = sentencesMatching(sentences, FACTS_FOR_GROUND_RE).filter((id) => !precise.includes(id));
      return facts.length
        ? { ...base, status: "present", sentenceIds: [...precise.slice(0, 1), ...facts.slice(0, 2)], note: "The narrative states the precise section, and other sentences state the facts that meet it." }
        : { ...base, status: "unclear", sentenceIds: precise, note: "The narrative cites the section but does not state the facts that satisfy it." };
    }
    const generic = sentencesMatching(sentences, GENERIC_RE);
    if (generic.length) return { ...base, status: "unclear", sentenceIds: generic, note: "Only a general credibility assertion is made; no statutory ground is stated." };
    return { ...base, status: "absent", sentenceIds: [], note: "The narrative does not state the INA section relied on. The officer-selected charge is checked separately." };
  }
  if (item.id === "N7") {
    const f = c.facts.find((x) => x.path === "form.disposition" && x.status === "present" && fieldQuality(x.value) === "known");
    const ids = sentencesMatching(sentences, DISPOSITION_RE);
    if (ids.length) return { ...base, status: "present", sentenceIds: ids.slice(0, 3), note: "The narrative states the action taken." };
    if (f) return { ...base, status: "present", sentenceIds: [], fieldPaths: [f.path], note: "Recorded in the form's disposition field." };
    return null; // let the model look for less common wording
  }
  if (item.id === "E6") {
    // Basis for the violation: lack of status or documents, overstay, or a fraudulent/invalid document at a port.
    const ids = sentencesMatching(sentences, BASIS_RE);
    return ids.length ? { ...base, status: "present", sentenceIds: ids.slice(0, 3), note: "The narrative states the facts behind the violation." } : null;
  }
  if (item.id === "N3") {
    // Application for admission: documents presented AND purpose of travel (the port itself is usually on the form).
    const docs = sentencesMatching(sentences, DOCS_PRESENTED_RE);
    const purpose = sentencesMatching(sentences, PURPOSE_RE);
    if (docs.length && purpose.length) return { ...base, status: "present", sentenceIds: [...new Set([...docs, ...purpose])].slice(0, 4), note: "Documents presented and the stated purpose of travel are recorded." };
    if (docs.length || purpose.length) return { ...base, status: "unclear", sentenceIds: [...docs, ...purpose].slice(0, 3), note: docs.length ? "Documents presented are recorded, but the stated purpose of travel is not." : "The stated purpose of travel is recorded, but not the documents presented." };
    return { ...base, status: "absent", sentenceIds: [], note: "Neither the documents presented nor the stated purpose of travel is recorded." };
  }
  if (item.id === "N8") {
    // Expedited removal: advised of the charge AND given an opportunity to respond (sworn statement).
    const adv = sentencesMatching(sentences, ADVISAL_RE);
    const resp = sentencesMatching(sentences, RESPONSE_RE);
    if (adv.length && resp.length) return { ...base, status: "present", sentenceIds: [...new Set([...adv, ...resp])].slice(0, 4), note: "The advisal of the charge and the opportunity to respond are recorded." };
    if (adv.length || resp.length) return { ...base, status: "unclear", sentenceIds: [...adv, ...resp].slice(0, 3), note: adv.length ? "The advisal is recorded, but not the opportunity to respond." : "A sworn statement or response is recorded, but not the advisal of the charge." };
    return { ...base, status: "absent", sentenceIds: [], note: "Neither the advisal of the charge nor an opportunity to respond is recorded." };
  }
  if (item.id === "N1") {
    const f = c.facts.find((x) => x.path === "documents.passport" && x.status === "present" && fieldQuality(x.value) !== "unknown");
    const ids = sentencesMatching(sentences, DOCUMENT_RE);
    if (ids.length) return { ...base, status: "present", sentenceIds: ids.slice(0, 3), note: "The narrative states what identity documents the person had, or that there were none." };
    if (f) return { ...base, status: "present", sentenceIds: [], fieldPaths: [f.path], note: "Recorded in a structured form field." };
    return null;
  }
  return null;
}
