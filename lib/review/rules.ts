// Deterministic checks. These run on every review, even when the model call fails.
import type { CaseRecord, ElementResult, Finding, Sentence, EvidenceRef } from "@/lib/types";
import { REFERENCES, findCharge } from "@/lib/references";
import { fieldQuality } from "@/lib/fieldQuality";

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
        : qs.some((q) => q !== "known") && !qs.includes("known") ? "partly_unknown" as const : undefined;
      elementsFromFields.set(el.id, {
        elementId: el.id, label: el.label, status: "present", sentenceIds: [],
        fieldPaths: present.map((f) => f!.path), qualifier,
        note: qualifier === "recorded_unknown" ? "The form records this as unknown. It is documented, but no usable value is recorded."
          : qualifier === "partly_unknown" ? "The form records this only partly (part of the value is marked unknown)."
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
  } else if (!findCharge(charges[0].citation, charges[0].referenceId)) {
    citationPrecheck = { status: "insufficient_information", explanation: `"${charges[0].citation}" is not in the loaded charge reference (version ${REFERENCES.version}), so it cannot be checked against reference elements.` };
    reasons.push("Selected charge is not in the loaded reference list.");
  }

  // 3. Multiple people in one narrative. Informational only: in the public source the names are redacted,
  // so statements cannot always be attributed. This is a property of the data, not an officer omission.
  const notes: string[] = [];
  const multi = sentences.filter((s) => /\b(subjects|individuals|passengers|occupants|(two|three|four|five|six|both) (subjects|individuals|people|persons|men|women|passengers|occupants|aliens)|all (subjects|three|four|five)|both of them)\b/i.test(s.text));
  if (multi.length >= 2)
    notes.push(`The narrative describes more than one person (for example ${multi[0].id}). Where names are redacted, statements may not be attributable to this record's subject; the model was told not to assume attribution.`);

  // 4. Encounter time in the form vs times stated in the narrative.
  const dt = field(c, "encounter.date_time");
  const formTime = dt?.status === "present" ? dt.value.match(/\b([01]\d|2[0-3])([0-5]\d)\b(?!\/)/g)?.pop() : undefined;
  if (formTime) {
    for (const s of sentences) {
      // The time must belong to the arrest/encounter itself, e.g. "placed ... under arrest at 1330 hours",
      // not to a later step such as "arrested and transported to the station at 2145 hours".
      // Both word orders: "placed under arrest at 1330 hours" and "At approximately 1030 hours, X was placed under arrest".
      const m =
        s.text.match(/\b(?:arrest|apprehend|encounter|detain|stopp?ed)\w*(?!\s*:)(?:(?!transport|process|book|arriv)[^.;]){0,40}?\bat\s+(?:approximately\s+)?(([01]\d|2[0-3])[0-5]\d)\s*hours\b(?![^.;]{0,40}\b(?:request|call|receiv|dispatch))/i) ??
        s.text.match(/\bat\s+(?:approximately\s+)?(([01]\d|2[0-3])[0-5]\d)\s*hours\b(?:(?!transport|process|book|arriv|request|call|receiv|dispatch)[^.;]){0,80}?\b(?:placed under arrest|arrested|apprehended|detained|encountered)\b/i);
      if (m && m[1] !== formTime && Math.abs(toMin(m[1]) - toMin(formTime)) >= 30) {
        findings.push(mk("R-TIME-MISMATCH", "inconsistency", "Encounter time differs between form and narrative",
          `The form records the encounter at ${formTime} hours, but the narrative gives ${m[1]} hours for the arrest. The difference may be legitimate (for example, encounter versus arrest time), but it should be confirmed.`,
          [quoteEvidence(s, m[0]), { kind: "field", fieldPath: "encounter.date_time", quote: dt!.value, page: dt!.sourcePage, verified: true }],
          ["E4"], "Times disagree by 30 minutes or more", "medium"));
        break;
      }
    }
  }
  return { elementsFromFields, findings, humanReviewReasons: reasons, citationPrecheck, notes };
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
