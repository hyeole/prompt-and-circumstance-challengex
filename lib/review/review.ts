// Review pipeline: rules -> one model call -> schema validation -> evidence verification -> merged result.
import type { CaseRecord, CheckResult, ElementResult, EvidenceRef, Finding, ReviewResult, Sentence } from "@/lib/types";
import { REFERENCES, REFERENCE_VERSION, findCharge, type RequiredElement } from "@/lib/references";
import { sha, splitSentences, locateQuote } from "@/lib/text";
import { runRules } from "./rules";
import { ModelOutput } from "./schema";
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { completeJSON, extractJSON, MODEL, ModelError } from "@/lib/llm";

type Ev = { sentence_id?: string; quote?: string; field_path?: string };

/** Verify one piece of model evidence against the exact reviewed text. Returns null if it cannot be verified. */
function verifyEvidence(ev: Ev, sentences: Sentence[], c: CaseRecord): EvidenceRef | null {
  if (ev.field_path) {
    const f = c.facts.find((x) => x.path === ev.field_path);
    if (!f) return null;
    return { kind: "field", fieldPath: f.path, quote: f.status === "present" ? f.value : `[${f.status}]`, page: f.sourcePage, verified: true };
  }
  if (!ev.quote) return null;
  const byId = sentences.find((s) => s.id === ev.sentence_id);
  const tryIn = (s: Sentence) => {
    const loc = locateQuote(s, ev.quote!);
    return loc ? { kind: "sentence" as const, sentenceId: s.id, quote: c.narrative.text.slice(loc.start, loc.end), start: loc.start, end: loc.end, page: s.page, verified: true } : null;
  };
  // Prefer the cited sentence; otherwise accept a unique match elsewhere (the model sometimes mis-numbers).
  if (byId) { const r = tryIn(byId); if (r) return r; }
  const hits = sentences.map(tryIn).filter(Boolean);
  return hits.length === 1 ? hits[0] : null;
}

const OTHER_CHARGE_RE = /\b(should (be|have been) charged|recommend(ed)? (charging|the charge)|more appropriate charge|instead charge|a better charge)\b/i;

/** Remove any sentence that names a different charge or proposes one. The tool never selects a charge. */
function stripChargeAdvice(text: string, selected: string[]): { text: string; stripped: boolean } {
  const allCites = REFERENCES.charges.flatMap((c) => c.citations);
  const sels = selected.map((s) => s.toLowerCase());
  const parts = text.split(/(?<=[.!?])\s+/);
  const keep = parts.filter((p) => {
    if (OTHER_CHARGE_RE.test(p)) return false;
    const low = p.toLowerCase();
    return !allCites.some((ci) => low.includes(ci.toLowerCase()) && !sels.some((s) => s.includes(ci.toLowerCase()) || ci.toLowerCase().includes(s)));
  });
  return { text: keep.join(" "), stripped: keep.length !== parts.length };
}

export async function reviewCase(c: CaseRecord): Promise<ReviewResult> {
  const t0 = Date.now();
  const sentences = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const rules = runRules(c, sentences);
  const selected = c.selectedCharges.filter((s) => s.citation.trim());
  const charge = selected.length === 1 ? findCharge(selected[0].citation, selected[0].referenceId) : undefined;

  const allElements = REFERENCES.requiredElements as RequiredElement[];
  const toCheck = allElements.filter((e) => rules.elementsFromFields.get(e.id)?.status !== "present");

  const findings: Finding[] = [...rules.findings];
  const discarded: ReviewResult["discarded"] = [];
  const humanReasons = [...rules.humanReviewReasons];
  let modelStatus: ReviewResult["modelStatus"] = "ok";
  let modelError: string | undefined;
  let modelLatencyMs: number | undefined;
  let attempts = 0;
  let out: ModelOutput | null = null;

  try {
    const m0 = Date.now();
    const r = await completeJSON(SYSTEM_PROMPT, buildUserPrompt(c, sentences, toCheck, charge));
    modelLatencyMs = Date.now() - m0;
    attempts = r.attempts;
    const parsed = ModelOutput.safeParse(extractJSON(r.text));
    if (!parsed.success) {
      modelStatus = "invalid_output";
      modelError = "The model answered, but its output did not match the expected format.";
    } else out = parsed.data;
  } catch (e) {
    modelStatus = "failed";
    attempts = e instanceof ModelError ? e.attempts : attempts;
    modelError = e instanceof ModelError ? e.message : "The model check could not be completed.";
  }

  // ---- Required elements
  const elements: ElementResult[] = allElements.map((el) => {
    const fromField = rules.elementsFromFields.get(el.id);
    if (fromField?.status === "present") return fromField;
    const m = out?.elements.find((x) => x.element_id === el.id);
    const validIds = (m?.sentence_ids ?? []).filter((id) => sentences.some((s) => s.id === id));
    if (!m) return { elementId: el.id, label: el.label, status: "not_checked", sentenceIds: [], fieldPaths: [], note: out ? "The model did not report on this element." : "Model check unavailable." };
    if (m.status === "present" && validIds.length) return { elementId: el.id, label: el.label, status: "present", sentenceIds: validIds, fieldPaths: [], note: m.note };
    if (m.status === "present") return { elementId: el.id, label: el.label, status: "unclear", sentenceIds: [], fieldPaths: [], note: "Reported present, but no valid sentence reference was given." };
    // absent / unclear / unavailable: redaction or unreadable fields take precedence over "absent"
    if (fromField && (m.status === "absent" || m.status === "unavailable")) return fromField;
    if (m.status === "unavailable") return { elementId: el.id, label: el.label, status: "unavailable_redacted", sentenceIds: validIds, fieldPaths: [], note: m.note };
    return { elementId: el.id, label: el.label, status: m.status, sentenceIds: validIds, fieldPaths: [], note: m.note };
  });
  for (const e of elements) {
    const ref = allElements.find((x) => x.id === e.elementId)!;
    if (e.status === "absent") {
      findings.push({
        id: `M-${e.elementId}`, category: "missing_element", title: `Missing: ${e.label.toLowerCase()}`,
        explanation: `${ref.description} The narrative and form fields reviewed do not state this.${e.note ? " Model note: " + e.note : ""}`,
        evidence: [{ kind: "missing", elementId: e.elementId, verified: true }], referenceIds: [e.elementId],
        needsHumanReview: false, source: "model", severity: ref.severity as Finding["severity"],
      });
    } else if (e.status === "unclear") {
      const ev: EvidenceRef[] = e.sentenceIds.map((id) => { const s = sentences.find((x) => x.id === id)!; return { kind: "sentence", sentenceId: id, quote: s.text, start: s.start, end: s.end, page: s.page, verified: true }; });
      findings.push({
        id: `U-${e.elementId}`, category: "unclear", title: `Unclear: ${e.label.toLowerCase()}`,
        explanation: `${e.note || "The narrative touches on this element but does not state it clearly."}`,
        evidence: ev.length ? ev : [{ kind: "missing", elementId: e.elementId, verified: true }], referenceIds: [e.elementId],
        needsHumanReview: false, source: "model", severity: "low",
      });
    }
  }

  // ---- Model issues, kept only with verified evidence
  out?.issues.forEach((iss, i) => {
    const ev = iss.evidence.map((x) => verifyEvidence(x, sentences, c));
    const verified = ev.filter(Boolean) as EvidenceRef[];
    if (verified.length < ev.length || verified.length === 0) {
      discarded.push({ title: iss.title, reason: "Quoted evidence could not be matched to the reviewed text." });
      return;
    }
    if (iss.type === "inconsistency" && new Set(verified.map((v) => v.sentenceId ?? v.fieldPath)).size < 2) {
      discarded.push({ title: iss.title, reason: "An inconsistency needs two verified sources; only one was provided." });
      return;
    }
    const clean = stripChargeAdvice(iss.explanation, selected.map((s) => s.citation));
    findings.push({
      id: `${iss.type === "inconsistency" ? "I" : "Q"}-${i + 1}`, category: iss.type, title: iss.title,
      explanation: clean.text || "See linked evidence.", evidence: verified, referenceIds: [],
      needsHumanReview: iss.needs_human_review, humanReviewReason: iss.needs_human_review ? iss.reason || "Model asked for human review" : undefined,
      source: "model", severity: iss.type === "inconsistency" ? "high" : "low",
    });
    if (iss.needs_human_review && iss.reason) humanReasons.push(iss.reason);
  });

  // ---- Citation check
  let citation: ReviewResult["citation"];
  const citeText = selected.map((s) => s.citation).join("; ");
  if (rules.citationPrecheck) {
    citation = { status: rules.citationPrecheck.status, citation: citeText, explanation: rules.citationPrecheck.explanation, evidence: [] };
  } else if (!out) {
    citation = { status: "not_checked", citation: citeText, explanation: "The citation check could not run because the model check was unavailable.", evidence: [] };
  } else {
    const ev = out.citation.evidence.map((x) => verifyEvidence(x, sentences, c)).filter(Boolean) as EvidenceRef[];
    const clean = stripChargeAdvice(out.citation.explanation, selected.map((s) => s.citation));
    let status = out.citation.status;
    if (status === "likely_mismatch" && ev.length === 0) {
      status = "needs_human_review";
      discarded.push({ title: "Citation mismatch", reason: "Mismatch claimed without verifiable evidence; routed to a person instead." });
    }
    citation = { status, citation: citeText, explanation: clean.text || "See evidence.", evidence: ev };
    if (status === "likely_mismatch") {
      findings.push({
        id: "C-1", category: "citation", title: `Possible citation mismatch: ${citeText}`, explanation: citation.explanation,
        evidence: ev, referenceIds: charge ? [charge.id] : [], needsHumanReview: true,
        humanReviewReason: "The officer decides the charge; the tool does not select one.", source: "model", severity: "high",
      });
      humanReasons.push("Possible mismatch between the narrative and the selected charge.");
    }
    if (status === "needs_human_review") humanReasons.push(citation.explanation);
  }
  if (out?.human_review.required) humanReasons.push(...out.human_review.reasons);
  if (modelStatus !== "ok") humanReasons.push("The model check did not complete, so this review is partial.");

  // ---- Check summary
  const byCat = (cat: Finding["category"]) => findings.some((f) => f.category === cat);
  const modelOk = modelStatus === "ok";
  const elementsUnchecked = elements.some((e) => e.status === "not_checked");
  const checks: CheckResult[] = [
    { id: "required_elements", label: "Required elements", status: elementsUnchecked ? (modelOk ? "partial" : "partial") : byCat("missing_element") ? "completed_with_findings" : "completed_no_findings",
      note: elementsUnchecked ? "Some elements were not checked because the model check was unavailable." : undefined },
    { id: "consistency", label: "Consistency", status: !modelOk ? (byCat("inconsistency") ? "partial" : "unavailable") : byCat("inconsistency") ? "completed_with_findings" : "completed_no_findings",
      note: !modelOk ? "Only the rule-based time comparison ran." : undefined },
    { id: "clarity", label: "Clarity", status: !modelOk ? "unavailable" : byCat("unclear") ? "completed_with_findings" : "completed_no_findings" },
    { id: "citation", label: "Citation check", status: citation.status === "not_checked" || citation.status === "insufficient_information" ? "unavailable" : citation.status === "consistent" ? "completed_no_findings" : "completed_with_findings",
      note: citation.status === "insufficient_information" ? citation.explanation : undefined },
    { id: "routing", label: "Human-review routing", status: "completed_with_findings" },
  ];
  const uniqReasons = [...new Set(humanReasons.map((r) => r.trim()).filter(Boolean))];
  const required = uniqReasons.length > 0 || findings.some((f) => f.needsHumanReview);
  checks[4].status = required ? "completed_with_findings" : "completed_no_findings";

  return {
    reviewId: `R-${Date.now().toString(36)}`,
    caseId: c.id,
    narrativeHash: sha(c.narrative.text),
    factsHash: sha(JSON.stringify([c.facts, c.selectedCharges])),
    createdAt: new Date().toISOString(),
    mode: "live",
    model: MODEL,
    promptVersion: PROMPT_VERSION,
    referenceVersion: REFERENCE_VERSION,
    latencyMs: Date.now() - t0,
    modelLatencyMs,
    modelAttempts: attempts,
    modelStatus,
    modelError,
    sentences,
    checks,
    elements,
    citation,
    humanReview: { required, reasons: uniqReasons },
    findings,
    discarded,
  };
}
