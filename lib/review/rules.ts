// Deterministic checks. These run on every review, even when the model call fails.
import type { CaseRecord, ElementResult, Finding, Sentence, EvidenceRef } from "@/lib/types";
import { REFERENCES, chargeIdConflict, findCharge } from "@/lib/references";
import { fieldQuality } from "@/lib/fieldQuality";
import { statesSeveralPeople } from "./facts";
import { conflictsWithForm, isEncounterTime, statedTimes } from "./times";

export interface RuleOutput {
  elementsFromFields: Map<string, ElementResult>; // elements already satisfied or blocked by structured fields
  findings: Finding[];
  humanReviewReasons: string[];
  notes: string[];
  citationPrecheck?: { status: "needs_human_review" | "insufficient_information" | "not_checked"; explanation: string };
}

const field = (c: CaseRecord, path: string) => c.facts.find((f) => f.path === path);

export function runRules(c: CaseRecord, sentences: Sentence[]): RuleOutput {
  const findings: Finding[] = [];
  const reasons: string[] = [];
  const elementsFromFields = new Map<string, ElementResult>();

  // 1. Required elements that structured fields already cover, or that redaction blocks.
  for (const el of REFERENCES.requiredElements as { id: string; label: string; fieldPaths: string[]; requireAllFields?: boolean }[]) {
    if (!el.fieldPaths.length) continue;
    const fs = el.fieldPaths.map((p) => field(c, p));
    const present = fs.filter((f) => f?.status === "present" && f.value.trim());
    const covered = el.requireAllFields ? present.length === el.fieldPaths.length : present.length > 0;
    if (covered) {
      // Populated is not the same as known: qualify elements covered only by "unknown" or "See narrative" values.
      const qs = present.map((f) => fieldQuality(f!.value));
      const qualifier = qs.every((q) => q === "unknown") ? "recorded_unknown" as const
        : qs.every((q) => q === "see_narrative") ? "see_narrative" as const
        // Any field that is not fully known qualifies the element, even when another field is known (audit item 5):
        // an unknown encounter date with a known location and method is only partly established.
        : qs.some((q) => q !== "known") ? "partly_unknown" as const : undefined;
      elementsFromFields.set(el.id, {
        elementId: el.id, label: el.label, status: "present", sentenceIds: [],
        fieldPaths: present.map((f) => f!.path), qualifier,
        note: qualifier === "recorded_unknown" ? "The form records this as unknown. It is documented, but no usable value is recorded."
          : qualifier === "partly_unknown" ? `The form records this only partly: ${present.filter((f) => fieldQuality(f!.value) !== "known").map((f) => `${f!.label ?? f!.path} is "${f!.value}"`).join("; ")}.`
          : qualifier === "see_narrative" ? "The form field refers to the narrative." : "Recorded in a structured form field.",
      });
    } else if (fs.some((f) => f?.status === "redacted")) {
      // Not final: the model may still find it in the narrative. Used only if the narrative lacks it.
      elementsFromFields.set(el.id, {
        elementId: el.id, label: el.label, status: "unavailable_redacted", sentenceIds: [],
        fieldPaths: fs.filter((f) => f?.status === "redacted").map((f) => f!.path),
        note: "The related form field is redacted in the source, so its absence is not an officer omission.",
      });
    } else if (fs.some((f) => f?.status === "unreadable")) {
      elementsFromFields.set(el.id, {
        elementId: el.id, label: el.label, status: "unavailable_unreadable", sentenceIds: [],
        fieldPaths: fs.filter((f) => f?.status === "unreadable").map((f) => f!.path),
        note: "The related form field could not be read reliably from the source.",
      });
    }
  }

  // 2. Charge selection rules. The tool never proposes a charge.
  let citationPrecheck: RuleOutput["citationPrecheck"];
  const charges = c.selectedCharges.filter((s) => s.citation.trim());
  if (charges.length === 0) {
    citationPrecheck = { status: "not_checked", explanation: "No charge has been selected, so the citation could not be checked." };
    reasons.push("No officer-selected charge is recorded.");
  } else if (charges.length > 1) {
    citationPrecheck = { status: "needs_human_review", explanation: `More than one charge is selected (${charges.map((x) => x.citation).join("; ")}). Multi-charge cases always go to a person.` };
    reasons.push("Multiple charges are selected.");
    findings.push(mk("R-MULTI-CHARGE", "human_review", "Multiple charges selected", citationPrecheck.explanation,
      [{ kind: "field", fieldPath: "selectedCharges", verified: true }], [], "Multi-charge case", "medium"));
  } else if (chargeIdConflict(charges[0].citation, charges[0].referenceId)) {
    citationPrecheck = { status: "needs_human_review", explanation: `The selected citation "${charges[0].citation}" does not match its reference ID (${charges[0].referenceId}). A person must confirm which charge was selected; the tool does not choose.` };
    reasons.push("The selected citation and its reference ID disagree.");
  } else if (!findCharge(charges[0].citation, charges[0].referenceId)) {
    citationPrecheck = { status: "insufficient_information", explanation: `"${charges[0].citation}" is not in the loaded charge reference (version ${REFERENCES.version}), so it cannot be checked against reference elements.` };
    reasons.push("Selected charge is not in the loaded reference list.");
  }

  // 3. Multiple people in one narrative. Informational only: in the public source the names are redacted,
  // so statements cannot always be attributed. This is a property of the data, not an officer omission.
  const notes: string[] = [];
  // Bare group wording ("subjects", "passengers") must recur, since it can be boilerplate; a sentence that itself states
  // several people (a count, "the other subject", two coordinated non-official redacted names) is enough on its own.
  // Repeated identical redaction markers and officials' names never establish a second person.
  const multi = sentences.filter((s) => /\b(subjects|individuals|passengers|occupants|(two|three|four|five|six|both) (subjects|individuals|people|persons|men|women|passengers|occupants|aliens)|all (subjects|three|four|five)|both of them)\b/i.test(s.text));
  const stated = sentences.find((s) => statesSeveralPeople(s.text));
  if (multi.length >= 2 || stated)
    notes.push(`The narrative describes more than one person (for example ${(multi.length >= 2 ? multi[0] : stated!).id}). Where names are redacted, statements may not be attributable to this record's subject; the model was told not to assume attribution.`);

  // 4. Encounter time in the form vs times stated in the narrative, event by event (lib/review/times.ts). The form's
  // encounter hour conflicts with a time the narrative states for the encounter itself, or with an arrest stated before
  // it (the subject cannot be arrested before being encountered). An arrest after it is the normal sequence.
  const dt = field(c, "encounter.date_time");
  const formTime = dt?.status === "present" ? dt.value.match(/\b([01]\d|2[0-3])([0-5]\d)\b(?!\/)/g)?.pop() : undefined;
  if (formTime) {
    const times = statedTimes(sentences);
    const t = times.find((x) => isEncounterTime(x) && conflictsWithForm(x, formTime)) ?? times.find((x) => conflictsWithForm(x, formTime));
    if (t) {
      const s = sentences.find((x) => x.id === t.sentenceId)!;
      findings.push(mk("R-TIME-MISMATCH", "inconsistency", "Encounter time differs between form and narrative",
        t.event === "arrest"
          ? `The form records the encounter at ${formTime} hours, but the narrative gives ${t.hhmm} hours for the arrest, before that. The subject cannot be arrested before being encountered, so one of the times may be wrong; it should be confirmed.`
          : `The form records the encounter at ${formTime} hours, but the narrative states ${t.hhmm} hours for the encounter itself. It should be confirmed which is correct.`,
        [quoteEvidence(s, timeQuote(s.text, t.hhmm)), { kind: "field", fieldPath: "encounter.date_time", quote: dt!.value, page: dt!.sourcePage, verified: true }],
        ["E4"], "Times disagree by 30 minutes or more", "medium"));
    }
  }
  return { elementsFromFields, findings, humanReviewReasons: reasons, citationPrecheck, notes };
}

/** The shortest quotable span of the sentence that states this clock time ("at approximately 1330 hours"). */
function timeQuote(text: string, hhmm: string): string {
  return text.match(new RegExp(`\\b(?:at\\s+)?(?:approximately\\s+)?${hhmm}\\s*(?:hours|hrs|hr)?\\b`, "i"))?.[0] ?? text;
}

/** Whether the sentence gives this clock time for a call, request or dispatch ("at 2000 hours, a Trooper requested assistance"). */
export function isRequestTime(text: string, hhmm: string): boolean {
  const t = `(?:approximately\\s+)?${hhmm}\\s*(?:hours|hrs)?`;
  return new RegExp(`\\b${t}\\b[^.;]{0,60}\\b(?:request|call|receiv|dispatch|radio|notif)`, "i").test(text) ||
    new RegExp(`\\b(?:request|call|receiv|dispatch|radio|notif)\\w*[^.;]{0,40}\\bat\\s+${t}\\b`, "i").test(text);
}

const toMin = (hhmm: string) => parseInt(hhmm.slice(0, 2)) * 60 + parseInt(hhmm.slice(2));

function quoteEvidence(s: Sentence, quote: string): EvidenceRef {
  const i = s.text.indexOf(quote);
  return i >= 0
    ? { kind: "sentence", sentenceId: s.id, quote, start: s.start + i, end: s.start + i + quote.length, page: s.page, verified: true }
    : { kind: "sentence", sentenceId: s.id, quote: s.text, start: s.start, end: s.end, page: s.page, verified: true };
}

function mk(id: string, category: Finding["category"], title: string, explanation: string, evidence: EvidenceRef[],
  referenceIds: string[], reason: string | undefined, severity: Finding["severity"]): Finding {
  return { id, category, title, explanation, evidence, referenceIds, needsHumanReview: !!reason, humanReviewReason: reason, source: "rule", severity };
}
