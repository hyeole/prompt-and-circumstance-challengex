// Review pipeline: rules -> one model call -> schema validation -> evidence verification -> merged result.
import type { CaseRecord, CheckResult, ElementResult, EvidenceRef, Finding, ReviewResult, Sentence } from "@/lib/types";
import { REFERENCES, REFERENCE_VERSION, findCharge, type RequiredElement } from "@/lib/references";
import { splitSentences, locateQuote } from "@/lib/text";
import { sha } from "@/lib/hash";
import { fieldQuality } from "@/lib/fieldQuality";
import { computeCompletion } from "@/lib/completion";
import { runRules } from "./rules";
import { ModelOutput } from "./schema";
import { agreement, mergeOutputs } from "./merge";
import { FACTS_PROMPT_VERSION, FACTS_SYSTEM_PROMPT, FactsOutput, buildFactsPrompt, checkChargeRequirement, compareFacts, hasMannerStatement, supportsRequirement, EMPTY_FACTS, statusStatements, nonUsEntrySentences, usEntryMannerBySentence, formMannerCategory, formYear } from "./facts";
import { unsupportedValues } from "./support";
import { applies, caseContext, detect, DISPOSITION_RE, DOCUMENT_RE, type ChecklistItem } from "./checklist";
import { attribution } from "./facts";
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
    // Model claims need an exact match (after normalizing whitespace, case, quote marks and redaction markers).
    return loc ? { kind: "sentence" as const, sentenceId: s.id, quote: c.narrative.text.slice(loc.start, loc.end), start: loc.start, end: loc.end, page: s.page, verified: true, match: "exact" as const } : null;
  };
  // Prefer the cited sentence; otherwise accept a unique match elsewhere (the model sometimes mis-numbers).
  if (byId) { const r = tryIn(byId); if (r) return r; }
  const hits = sentences.map(tryIn).filter(Boolean);
  return hits.length === 1 ? hits[0] : null;
}

// Statements about whether the SELECTED charge fits belong in the citation check only.
/**
 * The date or place part of a model claim, restated from the record, when the cited text supports it: a year that
 * differs from the form's entry year, or a place that does not appear in the cited text while the form's is known.
 */
function supportedEntryPart(c: CaseRecord, path: string, citedText: string): string | null {
  const f = c.facts.find((x) => x.path === path && x.status === "present" && fieldQuality(x.value) !== "unknown");
  if (!f) return null;
  if (path === "entry.date") {
    const fy = formYear(f.value);
    const years = [...new Set(citedText.match(/\b(19|20)\d\d\b/g) ?? [])].filter((y) => fy && Number(y) !== fy);
    return fy && years.length ? `The cited narrative statement gives ${years.join(" and ")} for the entry, but the form records ${fy}.` : null;
  }
  if (path === "entry.place") {
    const tokens = (f.value.match(/[A-Za-z]{3,}/g) ?? []).filter((t) => !/^(miles?|of|unk|unknown|near|the)$/i.test(t));
    const named = /\b(near|at|in|into|through|via) [A-Z][a-z]+/.test(citedText);
    return tokens.length && named && !tokens.some((t) => new RegExp(`\\b${t}`, "i").test(citedText)) ? `The cited narrative statement names a different place of entry than the form ("${f.value}").` : null;
  }
  return null;
}

/** A sentence that says a fact is not known ("does not recall when", "date of entry unknown"). */
const UNKNOWN_STATEMENT_RE = /\b(unknown|not known|does not (know|remember|recall)|did not (know|remember|recall)|(could|can) ?not (recall|remember|say)|cannot (recall|remember|say)|unsure|not sure|no recollection|unable to (recall|remember|say|provide))\b/i;
// A sentence that also gives a date or year states something known, whatever else it calls unknown.
const statesUnknown = (t: string) => UNKNOWN_STATEMENT_RE.test(t) && !/\b(19|20)\d\d\b|\b\d{1,2}\/\d{1,2}\//.test(t);
/** A citation explanation that says the narrative supports the charge, and one that says it does not. */
const AFFIRMS_SUPPORT_RE = /\b(narrative|record|facts?) (clearly |also )?(supports?|establish(es)?|is consistent with|are consistent with)\b|\bsupported by the (narrative|record)\b|\bwhich the narrative supports\b/i;
const DENIES_SUPPORT_RE = /\b(not|never|n't|no longer|fails? to) (clearly )?(support|establish|consistent)/i;
const CHARGE_FIT_RE = /\b(selected charge|the charge|this charge|charge requires|charge (is|does not|doesn't)|requires? (a )?(prior )?(admission|removal))\b/i;
const ANY_CITATION_RE = /\b(?:INA|Section)\s*\d{3}\s*\([a-z0-9]+\)(?:\s*\([a-z0-9]+\))*|\b8\s*U\.?\s*S\.?\s*C\.?\s*§?\s*\d{4}(?:\s*\([a-z0-9]+\))*/gi;
const OTHER_CHARGE_RE = /\b(should (be|have been) charged|recommend(ed|s)? (charging|the charge|a charge)|more appropriate|a better charge|alternative charge|could be charged|consider (charging|a different|another))\b|\bcharg\w*\b[^.]*\binstead\b|\binstead\b[^.]*\bcharg/i;

/** Remove any sentence that names a different charge or proposes one. The tool never selects a charge. */
function stripChargeAdvice(text: string, selected: string[]): { text: string; stripped: boolean } {
  const allCites = REFERENCES.charges.flatMap((c) => c.citations);
  // Do not split after single-letter abbreviations ("U.S.C.", "U.S."), or citations get cut in half.
  const parts = text.split(/(?<=[.!?])(?<!\b[A-Z]\.)\s+/);
  const core = (x: string) => x.toLowerCase().replace(/[\s.§]/g, "").replace(/^(ina|section|8usc)/, "");
  // The selected charge may appear in any of its equivalent forms (INA section, U.S.C. section, "Section ...").
  const allowed = [...selected, ...REFERENCES.charges.filter((ch) => ch.citations.some((ci) => selected.some((x) => core(x).startsWith(core(ci))))).flatMap((ch) => ch.citations)].map(core);
  const keep = parts.filter((p) => {
    if (OTHER_CHARGE_RE.test(p)) return false;
    const low = p.toLowerCase();
    if (allCites.some((ci) => low.includes(ci.toLowerCase()) && !allowed.some((a) => a.startsWith(core(ci)) || core(ci).startsWith(a)))) return false;
    // Any other statutory citation pattern that is not the selected charge (or a prefix of it).
    return [...p.matchAll(ANY_CITATION_RE)].every((m) => allowed.some((a) => a.startsWith(core(m[0])) || core(m[0]).startsWith(a)));
  });
  return { text: keep.join(" "), stripped: keep.length !== parts.length };
}

const SAMPLE_GRACE_MS = 12_000;

/** Run n samples in parallel. After the first one succeeds, wait at most SAMPLE_GRACE_MS for the rest, then cancel them. */
async function samplesWithGrace<T>(n: number, run: (signal: AbortSignal, i: number) => Promise<T>): Promise<PromiseSettledResult<T>[]> {
  const ctrls = Array.from({ length: n }, () => new AbortController());
  const all = ctrls.map((c, i) => run(c.signal, i));
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

/** A model call. Injected so tests can run the whole pipeline offline with a fake model. */
export type Complete = (system: string, user: string, budgetMs?: number, signal?: AbortSignal) => Promise<{ text: string; attempts: number }>;
type CallLog = ReviewResult["calls"][number];

/** Wrap a call so its outcome, duration and attempts are recorded, including failures and cancellations. */
function logged<T extends { attempts: number }>(log: CallLog[], role: string, p: Promise<T>): Promise<T> {
  const t0 = Date.now();
  return p.then(
    (v) => (log.push({ role, status: "ok", ms: Date.now() - t0, attempts: v.attempts }), v),
    (e) => {
      const cancelled = e instanceof ModelError && /cancelled/i.test(e.message);
      log.push({ role, status: cancelled ? "cancelled" : "failed", ms: Date.now() - t0, attempts: e instanceof ModelError ? e.attempts : 1, error: e instanceof ModelError ? e.kind : "error" });
      throw e;
    },
  );
}

export async function reviewCase(c: CaseRecord, complete: Complete = completeJSON): Promise<ReviewResult> {
  const calls: CallLog[] = [];
  const t0 = Date.now();
  const sentences = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const rules = runRules(c, sentences);
  // Several people described (redacted names): only explicitly-"subject" statements count for or against this record.
  const multiPerson = rules.notes.length > 0;
  const selected = c.selectedCharges.filter((s) => s.citation.trim());
  const charge = selected.length === 1 ? findCharge(selected[0].citation, selected[0].referenceId) : undefined;

  const allElements = REFERENCES.requiredElements as (RequiredElement & ChecklistItem)[];
  // Checklist v2: which items apply in this case's context, and which can be decided without the model.
  const ctx = caseContext(c, sentences);
  const applicability = new Map(allElements.map((el) => [el.id, applies(el, ctx)]));
  const detected = new Map(allElements.map((el) => [el.id, applicability.get(el.id) === true ? detect(el, c, sentences) : null]));
  const toCheck = allElements.filter((e) => applicability.get(e.id) === true && !detected.get(e.id) && !(rules.elementsFromFields.get(e.id)?.status === "present" && !rules.elementsFromFields.get(e.id)?.qualifier));

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
  const factsCall = logged(calls, "facts", complete(FACTS_SYSTEM_PROMPT, buildFactsPrompt(sentences))).then((r) => {
    try { return FactsOutput.parse(extractJSON(r.text)); } catch (e) { const last = calls.find((x) => x.role === "facts"); if (last) last.status = "invalid_output"; throw e; }
  });
  const [settled, factsSettled] = await Promise.all([
    samplesWithGrace(SAMPLES, (signal, i) => logged(calls, `review-${i + 1}`, complete(SYSTEM_PROMPT, user, undefined, signal))),
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
    const idx = settled.indexOf(r);
    const markInvalid = () => { const l = calls.find((x) => x.role === `review-${idx + 1}`); if (l) l.status = "invalid_output"; };
    try {
      const parsed = ModelOutput.safeParse(extractJSON(r.value.text));
      if (parsed.success) outs.push(parsed.data);
      else { markInvalid(); modelError ??= "The model answered, but its output did not match the expected format."; }
    } catch {
      markInvalid();
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
  const elements: ElementResult[] = allElements.map((el): ElementResult => {
    const ap = applicability.get(el.id);
    if (ap === false) return { elementId: el.id, label: el.label, status: "not_applicable", sentenceIds: [], fieldPaths: [], note: `Applies only in: ${(el.appliesIn ?? []).join(", ").replace(/_/g, " ")}.` };
    if (ap === "unclear") return { elementId: el.id, label: el.label, status: "applicability_unclear", sentenceIds: [], fieldPaths: [], note: `Applies in ${(el.appliesIn ?? []).join(", ").replace(/_/g, " ")}; this case's context could not be determined.` };
    const det = detected.get(el.id);
    if (det) return det;
    const fromField = rules.elementsFromFields.get(el.id);
    // Fully known form fields settle the element. Fields recorded as unknown (or partly unknown) are documented but
    // not established, so the narrative is still checked; if it does not state the fact, the qualified field result stands.
    if (fromField?.status === "present" && !fromField.qualifier) return fromField;
    const m = out?.elements.find((x) => x.element_id === el.id);
    const validIds = (m?.sentence_ids ?? []).filter((id) => sentences.some((s) => s.id === id));
    if (fromField?.status === "present") {
      if (m?.status === "present" && validIds.length) {
        const unknownOnly = validIds.every((id) => statesUnknown(sentences.find((s) => s.id === id)!.text));
        return unknownOnly ? { ...fromField, sentenceIds: validIds, qualifier: "recorded_unknown", note: "The form and the narrative both record this as unknown. It is documented, but not established." }
          : { elementId: el.id, label: el.label, status: "present", sentenceIds: validIds, fieldPaths: fromField.fieldPaths, note: `Stated in the narrative. ${fromField.note}` };
      }
      return fromField;
    }
    if (!m) return { elementId: el.id, label: el.label, status: "not_checked", sentenceIds: [], fieldPaths: [], note: out ? "The model did not report on this element." : "Model check unavailable." };
    if (m.status === "present" && validIds.length) {
      // A narrative that only says the fact is unknown documents it without establishing it (audit item 5).
      if (validIds.every((id) => statesUnknown(sentences.find((s) => s.id === id)!.text)))
        return { elementId: el.id, label: el.label, status: "present", sentenceIds: validIds, fieldPaths: [], qualifier: "recorded_unknown", note: "The narrative records this as unknown. It is documented, but not established." };
      return { elementId: el.id, label: el.label, status: "present", sentenceIds: validIds, fieldPaths: [], note: m.note };
    }
    if (m.status === "present") return { elementId: el.id, label: el.label, status: "unclear", sentenceIds: [], fieldPaths: [], note: "Reported present, but no valid sentence reference was given." };
    // absent / unclear / unavailable: redaction or unreadable fields take precedence over "absent"
    if (fromField && (m.status === "absent" || m.status === "unavailable")) return fromField;
    if (m.status === "unavailable") return { elementId: el.id, label: el.label, status: "unavailable_redacted", sentenceIds: validIds, fieldPaths: [], note: m.note };
    return { elementId: el.id, label: el.label, status: m.status, sentenceIds: validIds, fieldPaths: [], note: m.note };
  });
  // N1 (identifying documents): a model "present" must cite a document the person had or presented, or a statement
  // that there were none; a sentence that only mentions a document ("his visa application was denied") is not enough.
  const n1 = elements.find((e) => e.elementId === "N1");
  if (n1 && n1.status === "present" && !n1.fieldPaths.length && !n1.sentenceIds.some((id) => DOCUMENT_RE.test(sentences.find((x) => x.id === id)?.text ?? ""))) {
    Object.assign(n1, { status: "unclear", note: "The cited sentence mentions a document but does not say what identifying documents the person had." });
  }
  // N7 (disposition): a model "present" must cite disposition wording; an arrest is not a disposition.
  const n7 = elements.find((e) => e.elementId === "N7");
  if (n7 && n7.status === "present" && !n7.fieldPaths.length && !n7.sentenceIds.some((id) => DISPOSITION_RE.test(sentences.find((x) => x.id === id)?.text ?? ""))) {
    Object.assign(n7, { status: "absent", sentenceIds: [], note: "No sentence states the action taken (an arrest alone is not a disposition)." });
  }
  // Cross-check E6 (basis for the violation): a verified statement with lack-of-status wording establishes it, so a
  // model "absent"/"unclear" here is not reported (e.g. "asked if he was present illegally, and he advised yes").
  const e6 = elements.find((e) => e.elementId === "E6");
  if (e6 && (e6.status === "absent" || e6.status === "unclear") && factsSettled.ok) {
    const st = statusStatements(sentences, factsSettled.v);
    if (st.length) {
      e6.status = "present";
      e6.sentenceIds = [...new Set(st.map((x) => x.sentenceId!))];
      e6.note = "Lack of lawful status or documents is stated in the narrative (checked by fact extraction).";
    }
  }
  // Cross-check E3 (manner of entry) with the fact extraction: if no form field covers it and no extracted statement
  // says how the subject entered, a model "present" is not trusted.
  const e3 = elements.find((e) => e.elementId === "E3");
  if (e3 && e3.status === "present" && !e3.fieldPaths.length && factsSettled.ok && !hasMannerStatement(sentences, factsSettled.v)) {
    e3.status = "absent";
    e3.note = "No sentence states how the subject entered (checked by fact extraction).";
    e3.sentenceIds = [];
  }
  for (const e of elements) {
    const ref = allElements.find((x) => x.id === e.elementId)! as RequiredElement & { advisory?: boolean };
    if (ref.advisory) continue; // advisory elements appear in the checklist only
    if (e.status === "absent") {
      findings.push({
        id: `M-${e.elementId}`, category: "missing_element", title: `Missing: ${e.label.toLowerCase()}`,
        explanation: `${ref.description} The narrative and form fields reviewed do not state this.${e.note ? " Note: " + e.note : ""}`,
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
    let verified = ev.filter(Boolean) as EvidenceRef[];
    if (verified.length < ev.length || verified.length === 0) {
      discarded.push({ title: iss.title, reason: "Quoted evidence could not be matched to the reviewed text." });
      return;
    }
    // Relevance: an exact quote is necessary but not sufficient. (1) A claim about the U.S. entry fields must not rest on a
    // sentence the extractor identified as entry into another country, a departure, or travel.
    const nonUs = factsSettled.ok ? nonUsEntrySentences(factsSettled.v) : new Set<string>();
    if (iss.type === "inconsistency" && verified.some((v) => v.sentenceId && nonUs.has(v.sentenceId))) {
      discarded.push({ title: iss.title, reason: "The cited sentence describes entry into another country or travel, not the U.S. entry, so it cannot show a conflict about the U.S. entry." });
      return;
    }
    // (1b) A claimed conflict between the form's manner-of-entry code and a narrative sentence the extractor classified in
    // the SAME manner category (e.g. EWI/PWA vs "crossed illegally") is not a conflict.
    const mannerField = verified.find((v) => v.fieldPath === "entry.manner");
    if (iss.type === "inconsistency" && mannerField && factsSettled.ok) {
      const formCat = formMannerCategory(c.facts.find((f) => f.path === "entry.manner")?.value ?? "");
      const byS = usEntryMannerBySentence(sentences, factsSettled.v);
      const cited = verified.filter((v) => v.sentenceId).map((v) => byS.get(v.sentenceId!));
      const otherFields = verified.filter((v) => v.fieldPath && v.fieldPath !== "entry.manner");
      // Also when combined with date/place points: a claim whose manner part is wrong is not a valid conflict.
      if (formCat && cited.length > 0 && cited.every((m) => m === formCat) && (otherFields.length === 0 || /\b(manner|PWA|EWI|AFOOT|on foot|walk|swim|swam|river|cross)/i.test(iss.explanation))) {
        // The manner part is wrong. Keep any date or place part that the cited text itself supports (audit: separate
        // mixed claims rather than discarding a real conflict); drop the claim only if nothing supported remains.
        const citedText = verified.filter((v) => v.sentenceId).map((v) => sentences.find((x) => x.id === v.sentenceId)?.text ?? "").join(" ");
        const parts = otherFields.map((v) => ({ path: v.fieldPath!, text: supportedEntryPart(c, v.fieldPath!, citedText) })).filter((x) => x.text);
        const kept = parts.map((x) => x.text!);
        const note = `The model's manner-of-entry point was withheld: the form code "${mannerField.quote}" and the cited statement describe the same manner of entry.`;
        discarded.push({ title: iss.title, reason: kept.length ? `Manner part only. ${note}` : note });
        if (!kept.length) return;
        verified = verified.filter((v) => !v.fieldPath || parts.some((x) => x.path === v.fieldPath));
        iss = { ...iss, title: kept.length > 1 ? "Entry date and place differ from the form" : /year/.test(kept[0]) ? "Entry date differs from the form" : "Place of entry differs from the form", explanation: `${kept.join(" ")} ${note}` };
      }
    }
    // (1c) In a narrative about several people, a statement whose subject cannot be attributed (redacted names) is not
    // evidence against THIS subject's entry or history fields (same rule as the fact comparison: facts.aboutSubject).
    if (iss.type === "inconsistency" && multiPerson && verified.some((v) => v.fieldPath?.startsWith("history.") || v.fieldPath?.startsWith("entry.")) &&
        verified.every((v) => !v.sentenceId || attribution(sentences.find((x) => x.id === v.sentenceId)!, "unclear") !== "subject") &&
        verified.some((v) => v.sentenceId && attribution(sentences.find((x) => x.id === v.sentenceId)!, "unclear") !== "subject")) {
      discarded.push({ title: iss.title, reason: "Several people are described and the cited statement cannot be attributed to this record's subject, so it cannot contradict this subject's record." });
      return;
    }
    // (2) Dates, years and clock times the claim relies on must appear in the cited evidence.
    const evTexts = verified.map((v) => (v.sentenceId ? sentences.find((x) => x.id === v.sentenceId)?.text ?? "" : v.quote ?? ""));
    const missingValues = unsupportedValues(`${iss.title}. ${iss.explanation}`, evTexts);
    if (missingValues.length) {
      discarded.push({ title: iss.title, reason: `The claim relies on ${missingValues.join(", ")}, which does not appear in the cited evidence.` });
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
      source: "model", severity: iss.type === "inconsistency" ? "high" : "low", sampleAgreement: agreement(outs, iss),
    });
    if (iss.needs_human_review && iss.reason) humanReasons.push(iss.reason);
  });

  // ---- Deterministic comparison of extracted facts. These replace model issues that point at the same sources.
  let factsStatus: "ok" | "failed" = "failed";
  if (factsSettled.ok) {
    factsStatus = "ok";
    const cmp = compareFacts(c, sentences, factsSettled.v, multiPerson);
    for (const ff of cmp.findings) {
      const srcs = new Set(ff.evidence.map((e) => e.sentenceId ?? e.fieldPath));
      for (let i = findings.length - 1; i >= 0; i--) {
        const f = findings[i];
        if (f.source === "model" && (f.category === "inconsistency" || f.category === "unclear") && f.evidence.some((e) => srcs.has(e.sentenceId ?? e.fieldPath))) findings.splice(i, 1);
      }
      findings.push(ff);
    }
    if (cmp.unattributed.length)
      humanReasons.push(`Several people are described with redacted names, and ${cmp.unattributed.join(", ")} may conflict with this record but cannot be attributed to its subject. A person should decide who each statement is about.`);
    if (cmp.dropped) discarded.push({ title: "Extracted entry statements", reason: `${cmp.dropped} quote(s) could not be matched to the text and were ignored.` });
  }

  // ---- Citation check
  let citation: ReviewResult["citation"];
  const citeText = selected.map((s) => s.citation).join("; ");
  const reqs = (charge as { requires?: { entryManner?: string; priorRemoval?: boolean } } | undefined)?.requires;
  // Deterministic pre-check of the charge's core requirement. Uses extracted facts when available, form fields otherwise.
  const req = !rules.citationPrecheck && charge ? checkChargeRequirement(c, sentences, factsSettled.ok ? factsSettled.v : EMPTY_FACTS, reqs, multiPerson) : null;
  if (rules.citationPrecheck) {
    citation = { status: rules.citationPrecheck.status, citation: citeText, explanation: rules.citationPrecheck.explanation, evidence: [] };
  } else {
    let status: ReviewResult["citation"]["status"] = "not_checked";
    let explanation = "The citation check could not run because the model check was unavailable.";
    let evidence: EvidenceRef[] = [];
    if (out) {
      evidence = out.citation.evidence.map((x) => verifyEvidence(x, sentences, c)).filter(Boolean) as EvidenceRef[];
      explanation = stripChargeAdvice(out.citation.explanation, selected.map((s) => s.citation)).text || "See evidence.";
      status = out.citation.status;
      if (status === "insufficient_information" && charge) {
        // The reference exists, so "insufficient" means the record does not establish a key fact for this charge.
        status = "needs_human_review";
        explanation = `The record does not establish a key fact required by the selected charge. ${explanation}`;
      }
      if (req?.status !== "likely_mismatch" && status === "likely_mismatch" && factsSettled.ok && supportsRequirement(sentences, factsSettled.v, reqs, multiPerson)) {
        // The record states the fact the charge depends on; a model "mismatch" here is uncertainty, not a mismatch.
        status = "needs_human_review";
        explanation = `The record states the core fact this charge depends on, but the model raised a concern: ${explanation}`;
      }
      if (req?.status !== "likely_mismatch" && status === "likely_mismatch" && AFFIRMS_SUPPORT_RE.test(out.citation.explanation) && !DENIES_SUPPORT_RE.test(out.citation.explanation)) {
        // The model's own explanation says the narrative supports the charge (F075-X): uncertainty, not a mismatch.
        status = "needs_human_review";
        explanation = `The model reported a concern but also said the narrative supports the selected charge: ${explanation}`;
      }
      if (status === "consistent") {
        // A "consistent" verdict needs verified support (audit item 6): a verified statement of the fact the charge
        // depends on, or, for a charge without a recorded requirement, verified narrative evidence from the model.
        const supported = reqs && factsSettled.ok ? supportsRequirement(sentences, factsSettled.v, reqs, multiPerson)
          : !reqs && evidence.some((e) => e.kind === "sentence");
        if (!supported) {
          status = "needs_human_review";
          explanation = reqs && !factsSettled.ok
            ? "The model reported the charge as consistent, but the fact extraction did not complete, so the fact this charge depends on could not be verified."
            : "The model reported the charge as consistent, but no verified statement of the fact this charge depends on was found. A person should confirm.";
        }
      }
    }
    // The more cautious result wins.
    const rank = { not_checked: -1, consistent: 0, insufficient_information: 1, needs_human_review: 2, likely_mismatch: 3 } as const;
    if (req && rank[req.status] > rank[status]) {
      status = req.status;
      explanation = req.explanation + (out ? "" : " (Checked from form fields and rules; the model check was unavailable.)");
      evidence = req.evidence;
    }
    if (status === "likely_mismatch" && evidence.length === 0) {
      status = "needs_human_review";
      discarded.push({ title: "Citation mismatch", reason: "Mismatch claimed without verifiable evidence; routed to a person instead." });
    }
    citation = { status, citation: citeText, explanation, evidence };
    if (status === "likely_mismatch") {
      findings.push({
        id: "C-1", category: "citation", title: `Possible citation mismatch: ${citeText}`, explanation,
        evidence, referenceIds: charge ? [charge.id] : [], needsHumanReview: true,
        humanReviewReason: "The officer decides the charge; the tool does not select one.", source: req?.status === "likely_mismatch" ? "rule" : "model", severity: "high",
      });
      humanReasons.push("Possible mismatch between the narrative and the selected charge.");
    }
    if (status === "needs_human_review") humanReasons.push(explanation);
  }
  // A charge can only be "consistent with the facts" when the facts it depends on are settled. If the record has an
  // unresolved conflict about the entry, the citation check is not a pass: a person must first decide which account is right.
  const entryConflict = findings.find((f) => f.category === "inconsistency" &&
    (f.referenceIds.some((r) => ["E1", "E2", "E3"].includes(r)) || f.evidence.some((e) => e.fieldPath?.startsWith("entry."))));
  if (entryConflict && citation.status === "consistent") {
    citation = {
      ...citation,
      status: "needs_human_review",
      explanation: `The selected charge fits one account of the facts, but the record has an unresolved conflict about the entry ("${entryConflict.title}"). A person must decide which account is correct before relying on this check.`,
    };
    humanReasons.push("Citation check depends on conflicting entry facts.");
  }
  if (out?.human_review.required) humanReasons.push(...out.human_review.reasons);
  // Completion covers every required check, not only the main model call (audit item 1).
  const completion = computeCompletion({ modelStatus, modelError, calls, elements, citation }, { citationExpected: selected.length > 0 });
  if (completion.status === "partial") humanReasons.push(`This review is partial: ${completion.failed.map((f) => `${f.check} ${f.reason}`).join("; ")}.`);

  // ---- Check summary
  const byCat = (cat: Finding["category"]) => findings.some((f) => f.category === cat);
  const modelOk = modelStatus === "ok";
  const elementsUnchecked = elements.some((e) => e.status === "not_checked");
  const checks: CheckResult[] = [
    { id: "required_elements", label: "Required elements", status: elementsUnchecked ? (modelOk ? "partial" : "partial") : byCat("missing_element") ? "completed_with_findings" : "completed_no_findings",
      note: elementsUnchecked ? (modelOk ? "The model returned no output for some elements; they were not checked." : "Some elements were not checked because the model check was unavailable.") : undefined },
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

  // N6 (traveler's explanation) applies only when this review found a discrepancy.
  const n6 = elements.find((e) => e.elementId === "N6");
  if (n6 && n6.status !== "not_applicable" && n6.status !== "applicability_unclear" && !findings.some((f) => f.category === "inconsistency")) {
    Object.assign(n6, { status: "not_applicable", sentenceIds: [], note: "No discrepancy was found, so no explanation is needed." });
  }
  for (const e of elements) e.sponsorCategory = allElements.find((x) => x.id === e.elementId)?.sponsorCategory;

  // Final pass: no displayed text may name or recommend a charge other than the selected one.
  const sel = selected.map((x) => x.citation);
  const clean = (t: string) => stripChargeAdvice(t, sel).text;
  citation.explanation = clean(citation.explanation) || "See the evidence listed.";
  for (const f of findings) {
    f.title = clean(f.title) || (f.category === "citation" ? "Possible citation mismatch" : "Finding");
    f.explanation = clean(f.explanation) || "See the linked evidence.";
    if (f.humanReviewReason) f.humanReviewReason = clean(f.humanReviewReason) || "A person should review this.";
  }
  for (const e of elements) if (e.note) e.note = clean(e.note);
  const shownReasons = uniqReasons.map(clean).filter(Boolean);

  const perSample = outs.map((o) => o.issues.length);
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
    humanReview: { required, reasons: shownReasons.length ? shownReasons : required ? ["See findings marked for human review."] : [] },
    findings,
    notes: rules.notes,
    caseContext: ctx,
    checklistVersion: (REFERENCES as { checklistVersion?: string }).checklistVersion ?? "v1",
    discarded,
    calls: calls.sort((a, b) => a.role.localeCompare(b.role)),
    completion,
    sampleIssues: { perSample, merged: out?.issues.length ?? 0, inAllSamples: out ? out.issues.filter((i) => agreement(outs, i) === outs.length).length : 0 },
  };
}
