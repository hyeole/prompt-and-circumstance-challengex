// Review pipeline: rules -> one model call -> schema validation -> evidence verification -> merged result.
import type { CaseRecord, CheckResult, ElementResult, EvidenceRef, Finding, ReviewResult, Sentence } from "@/lib/types";
import { REFERENCES, REFERENCE_VERSION, findCharge, type RequiredElement } from "@/lib/references";
import { sha, splitSentences, locateQuote } from "@/lib/text";
import { runRules } from "./rules";
import { ModelOutput } from "./schema";
import { mergeOutputs } from "./merge";
import { FACTS_PROMPT_VERSION, FACTS_SYSTEM_PROMPT, FactsOutput, buildFactsPrompt, checkChargeRequirement, compareFacts } from "./facts";
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { completeJSON, extractJSON, MODEL, ModelError, SAMPLES, REASONING_EFFORT } from "@/lib/llm";

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

// Statements about whether the SELECTED charge fits belong in the citation check only.
const CHARGE_FIT_RE = /\b(selected charge|the charge|this charge|charge requires|charge (is|does not|doesn't)|requires? (a )?(prior )?(admission|removal))\b/i;
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

const SAMPLE_GRACE_MS = 12_000;

/** Run n samples in parallel. After the first one succeeds, wait at most SAMPLE_GRACE_MS for the rest, then cancel them. */
async function samplesWithGrace<T>(n: number, run: (signal: AbortSignal) => Promise<T>): Promise<PromiseSettledResult<T>[]> {
  const ctrls = Array.from({ length: n }, () => new AbortController());
  const all = ctrls.map((c) => run(c.signal));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const grace = new Promise<void>((resolve) => {
    let pending = n;
    all.forEach((p) => p.then(() => { timer ??= setTimeout(resolve, SAMPLE_GRACE_MS); }, () => {}).finally(() => { if (--pending === 0) resolve(); }));
  });
  await grace;
  if (timer) clearTimeout(timer);
  ctrls.forEach((c) => c.abort());
  return Promise.allSettled(all);
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

  // SAMPLES independent calls in parallel. Each output is validated on its own; valid outputs are merged.
  const m0 = Date.now();
  const user = buildUserPrompt(c, sentences, toCheck, charge, REFERENCES.formGlossary);
  // Fact extraction runs alongside the review samples; code compares the extracted statements (lib/review/facts.ts).
  const factsCall = completeJSON(FACTS_SYSTEM_PROMPT, buildFactsPrompt(sentences)).then((r) => FactsOutput.parse(extractJSON(r.text)));
  const [settled, factsSettled] = await Promise.all([
    samplesWithGrace(SAMPLES, (signal) => completeJSON(SYSTEM_PROMPT, user, undefined, signal)),
    factsCall.then((v) => ({ ok: true as const, v }), () => ({ ok: false as const })),
  ]);
  modelLatencyMs = Date.now() - m0;
  const outs: ModelOutput[] = [];
  for (const r of settled) {
    if (r.status === "rejected") {
      attempts += r.reason instanceof ModelError ? r.reason.attempts : 1;
      modelError ??= r.reason instanceof ModelError ? r.reason.message : "The model check could not be completed.";
      continue;
    }
    attempts += r.value.attempts;
    try {
      const parsed = ModelOutput.safeParse(extractJSON(r.value.text));
      if (parsed.success) outs.push(parsed.data);
      else modelError ??= "The model answered, but its output did not match the expected format.";
    } catch {
      modelError ??= "The model answered, but its output was not valid JSON.";
    }
  }
  if (outs.length) {
    out = mergeOutputs(outs);
    modelError = undefined;
  } else {
    modelStatus = settled.some((r) => r.status === "fulfilled") ? "invalid_output" : "failed";
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
    const ref = allElements.find((x) => x.id === e.elementId)! as RequiredElement & { advisory?: boolean };
    if (ref.advisory) continue; // advisory elements appear in the checklist only
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
    const issText = `${iss.title} ${iss.explanation}`;
    if (CHARGE_FIT_RE.test(issText) || selected.some((x) => issText.includes(x.citation))) {
      discarded.push({ title: iss.title, reason: "Charge fit is reported in the citation check, not as a separate issue." });
      return;
    }
    const clean = stripChargeAdvice(iss.explanation, selected.map((s) => s.citation));
    // Conflicting facts always go to a person: the tool does not decide which account is right.
    const hr = iss.type === "inconsistency" || iss.needs_human_review;
    findings.push({
      id: `${iss.type === "inconsistency" ? "I" : "Q"}-${i + 1}`, category: iss.type, title: iss.title,
      explanation: clean.text || "See linked evidence.", evidence: verified, referenceIds: [],
      needsHumanReview: hr, humanReviewReason: hr ? iss.reason || (iss.type === "inconsistency" ? "Conflicting facts: a person should decide which is correct." : "Model asked for human review.") : undefined,
      source: "model", severity: iss.type === "inconsistency" ? "high" : "low",
    });
    if (iss.needs_human_review && iss.reason) humanReasons.push(iss.reason);
  });

  // ---- Deterministic comparison of extracted facts. These replace model issues that point at the same sources.
  let factsStatus: "ok" | "failed" = "failed";
  if (factsSettled.ok) {
    factsStatus = "ok";
    const cmp = compareFacts(c, sentences, factsSettled.v);
    for (const ff of cmp.findings) {
      const srcs = new Set(ff.evidence.map((e) => e.sentenceId ?? e.fieldPath));
      for (let i = findings.length - 1; i >= 0; i--) {
        const f = findings[i];
        if (f.source === "model" && (f.category === "inconsistency" || f.category === "unclear") && f.evidence.some((e) => srcs.has(e.sentenceId ?? e.fieldPath))) findings.splice(i, 1);
      }
      findings.push(ff);
    }
    if (cmp.dropped) discarded.push({ title: "Extracted entry statements", reason: `${cmp.dropped} quote(s) could not be matched to the text and were ignored.` });
  }

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
    let explanation = clean.text || "See evidence.";
    if (status === "insufficient_information" && charge) {
      // The reference exists, so "insufficient" means the record does not establish a key fact for this charge.
      status = "needs_human_review";
      explanation = `The record does not establish a key fact required by the selected charge. ${explanation}`;
    }
    let evidence = ev;
    // Deterministic pre-check of the charge's core requirement; the more cautious result wins.
    const req = factsSettled.ok && charge ? checkChargeRequirement(c, sentences, factsSettled.v, (charge as { requires?: { entryManner?: string; priorRemoval?: boolean } }).requires) : null;
    if (req && status !== "likely_mismatch") {
      status = "likely_mismatch";
      explanation = req.explanation;
      evidence = req.evidence;
    }
    if (status === "likely_mismatch" && evidence.length === 0) {
      status = "needs_human_review";
      discarded.push({ title: "Citation mismatch", reason: "Mismatch claimed without verifiable evidence; routed to a person instead." });
    }
    citation = { status, citation: citeText, explanation, evidence };
    if (status === "likely_mismatch") {
      findings.push({
        id: "C-1", category: "citation", title: `Possible citation mismatch: ${citeText}`, explanation: citation.explanation,
        evidence: citation.evidence, referenceIds: charge ? [charge.id] : [], needsHumanReview: true,
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
    { id: "consistency", label: "Consistency",
      status: !modelOk && factsStatus !== "ok" ? (byCat("inconsistency") ? "partial" : "unavailable") : !modelOk || factsStatus !== "ok" ? "partial" : byCat("inconsistency") ? "completed_with_findings" : "completed_no_findings",
      note: !modelOk && factsStatus !== "ok" ? "Only the rule-based time comparison ran." : factsStatus !== "ok" ? "The entry and history fact comparison did not run." : !modelOk ? "Only the fact comparison and rules ran." : undefined },
    { id: "clarity", label: "Clarity", status: !modelOk ? "unavailable" : byCat("unclear") ? "completed_with_findings" : "completed_no_findings" },
    { id: "citation", label: "Citation check", status: citation.status === "not_checked" || citation.status === "insufficient_information" ? "unavailable" : citation.status === "consistent" ? "completed_no_findings" : "completed_with_findings",
      note: citation.status === "insufficient_information" ? citation.explanation : undefined },
    { id: "routing", label: "Human-review routing", status: "completed_with_findings" },
  ];
  for (const f of findings) if (f.needsHumanReview) humanReasons.push(`${f.title}${f.humanReviewReason ? `: ${f.humanReviewReason}` : ""}`);
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
    modelConfig: { reasoningEffort: REASONING_EFFORT, samples: SAMPLES, validSamples: outs.length, factsPromptVersion: FACTS_PROMPT_VERSION, factsStatus },
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
    notes: rules.notes,
    discarded,
  };
}
