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

const CITATION_RE = /\b(?:INA|Section|section)?\s*\b(?:212|237|235|275|276)\s*\(\s*a\s*\)|\b8\s*U\.?\s*S\.?\s*C\.?\s*§?\s*\d{4}/i;
const EXPLAINS_RE = /\b(in that|because|as an alien|who (has|was|is|arrived|entered)|without (being )?(admitted|paroled|inspected)|remained .* longer than permitted|after (admission|removal|being removed))\b/i;
const GENERIC_RE = /\b(not credible|not a bona fide|lack(s|ed)? credibility)\b/i;
const DISPOSITION_RE = /\b(notice to appear|\bNTA\b|warrant of arrest|reinstate(d|ment)?|expedited removal order|I-860|voluntary (return|departure)|served (with )?a?|remanded|turned over to|transferred to (ICE|immigration)|detained pending|released on|processed (as|for) (a |an )?(WA\/NTA|NTA|reinstatement|expedited removal|voluntary))/i;
const DOCUMENT_RE = /\b(passport|identification card|ID card|driver'?s license|birth certificate|visa\b|consular (ID|identification)|identity documents?|identification documents?|(no|any) (form of )?identification|did not (have|possess) any (identification|documents))\b/i;

const sentencesMatching = (sentences: Sentence[], re: RegExp) => sentences.filter((s) => re.test(s.text)).map((s) => s.id);

/** Deterministic result for items that do not need the model. Returns null when the model should decide. */
export function detect(item: ChecklistItem, c: CaseRecord, sentences: Sentence[]): ElementResult | null {
  const base = { elementId: item.id, label: item.label, sponsorCategory: item.sponsorCategory, fieldPaths: [] as string[] };
  if (item.id === "N5") {
    const cites = sentencesMatching(sentences, CITATION_RE);
    if (cites.length) {
      const explained = cites.filter((id) => EXPLAINS_RE.test(sentences.find((s) => s.id === id)!.text));
      return explained.length
        ? { ...base, status: "present", sentenceIds: explained, note: "The narrative states the section and explains how the facts meet it." }
        : { ...base, status: "unclear", sentenceIds: cites, note: "The narrative cites a section but does not explain how the facts satisfy it." };
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
  if (item.id === "N1") {
    const f = c.facts.find((x) => x.path === "documents.passport" && x.status === "present" && fieldQuality(x.value) !== "unknown");
    const ids = sentencesMatching(sentences, DOCUMENT_RE);
    if (ids.length) return { ...base, status: "present", sentenceIds: ids.slice(0, 3), note: "The narrative states what identity documents the person had, or that there were none." };
    if (f) return { ...base, status: "present", sentenceIds: [], fieldPaths: [f.path], note: "Recorded in a structured form field." };
    return null;
  }
  return null;
}
