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
import { FACTS_PROMPT_VERSION, FACTS_SYSTEM_PROMPT, FactsOutput, accountConflicts, visaChronologyConflicts, buildFactsPrompt, describesUsEntry, checkChargeRequirement, compareFacts, hasMannerStatement, mannerAbsentFromCompletedExtraction, supportsRequirement, EMPTY_FACTS, statusStatements, nonUsEntrySentences, usEntryMannerBySentence, formMannerCategory, formEntryMode, crossingMode, describesRecordHistory, conflictManner, formYear, normalizeFacts, sourceEntryStatements, withSourceEntries, type Requires } from "./facts";
import { unsupportedValues } from "./support";
import { encounterTimeConflict, narrativeStatesFormDate, timeRoutingReasons, unsupportedTimeClaim } from "./times";
import { applies, caseContext, detect, DISPOSITION_RE, DOCUMENT_RE, locatesEntry, type ChecklistItem } from "./checklist";
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

const FACTS_BUDGET_MS = 55_000;
/** A short reason for invalid model output: which schema paths failed, or that it was not JSON. Never the content. */
function invalidReason(e: unknown): string {
  const issues = (e as { issues?: { path: (string | number)[] }[] }).issues;
  if (issues?.length) return `schema: ${[...new Set(issues.slice(0, 3).map((i) => i.path.join(".") || "(root)"))].join(", ")}`;
  if (e instanceof Error && /^no entry statements/.test(e.message)) return e.message;
  return "not valid JSON";
}

export { to24h } from "./times";
/** The form's encounter date and hour, when recorded. */
const encounterFormValue = (c: CaseRecord) => c.facts.find((f) => f.path === "encounter.date_time" && f.status === "present")?.value;
/** A sentence that says a fact is not known ("does not recall when", "date of entry unknown"). */
const UNKNOWN_STATEMENT_RE = /\b(unknown|not known|does not (know|remember|recall)|did not (know|remember|recall)|(could|can) ?not (recall|remember|say)|cannot (recall|remember|say)|unsure|not sure|no recollection|unable to (recall|remember|say|provide))\b/i;
// A sentence that also gives a date or year states something known, whatever else it calls unknown.
const statesUnknown = (t: string) => UNKNOWN_STATEMENT_RE.test(t) && !/\b(19|20)\d\d\b|\b\d{1,2}\/\d{1,2}\//.test(t);

/**
 * Which record facts a text is about. Each must be qualified as the entry (or encounter-time, or prior-removal) fact:
 * "birth date", "arrest date" or an unqualified "date" are not the entry date.
 */
function factsOf(t: string): Set<string> {
  const f = new Set<string>();
  const entry = "(entry|entered|enter|arriv\\w*|crossing|crossed)";
  if (new RegExp(`\\b${entry}\\b[^;.:]{0,30}\\b(dates?|years?|months?)\\b|\\b(dates?|years?|months?) of (last )?entry\\b|entry\\.date`, "i").test(t)) f.add("entry date");
  if (new RegExp(`\\b${entry}\\b[^;.:]{0,30}\\b(places?|locations?|ports?)\\b|\\b(place|location|port) of (last )?entry\\b|entry\\.place`, "i").test(t)) f.add("entry place");
  if (new RegExp(`\\b${entry}\\b[^;.:]{0,30}\\bmanners?\\b|\\bmanner of (last )?entry\\b|entry\\.manner`, "i").test(t)) f.add("entry manner");
  if (/\b(encounter|arrest|apprehension) times?\b|\btimes? of (the )?(encounter|arrest|apprehension)\b|encounter\.date_time/i.test(t)) f.add("encounter time");
  if (/\b(prior|previous) (removal|deportation)s?\b|\bimmigration (history|record)\b|history\.immigration/i.test(t)) f.add("immigration history");
  return f;
}
const CONFLICT_RE = /\b(conflict\w*|mismatch\w*|discrepan\w*|inconsisten\w*|differ\w*|contradict\w*)\b/i;
// Words that carry no concern of their own in a routing reason: conflict wording, the two sources, and filler.
const GENERIC = new Set("conflict conflicts conflicting mismatch mismatches mismatched discrepancy discrepancies inconsistent inconsistency inconsistencies differ differs different difference differences contradict contradicts contradiction contradictory between form forms field fields narrative narratives information info record records the and with for from regarding about data value values listed lists list reported reports states stated says said shows indicates entry entries last potential possible apparent noted noted there this that these those its their his her are was were has have had".split(" "));
// A generic follow-on with no concern of its own: it only says that some conflict matters.
const FOLLOW_ON = new Set("need needs needed resolve resolved determine determined determining which what source sources accurate correct correctly impact impacts potential potentially charge charging determination decision decide one version account accounts verify verified verification confirm confirmed review reviewed officer officers human should must".split(" "));
const words = (t: string) => (t.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []);
/**
 * The model's own routing reasons, minus parts shown to depend on one specific claim the code withheld as invalid.
 * Each reason is split into its parts (";", ":" and sentence breaks). A part is dependent on an invalid claim only when:
 * it describes a conflict; it names at least one qualified record fact (entry date, place or manner, encounter time,
 * immigration history) and every fact it names was the subject of that SAME claim; no kept finding or routed account
 * is about any of those facts; it does not mention a person, subject or attribution; and every other word it uses
 * appears in that claim or is generic conflict wording. A shared keyword is never enough: "Birth date conflict between
 * passport and form" names no entry fact and has its own words, so it stays. Independent parts of a mixed reason are
 * kept ("Entry date conflict; identity cannot be determined" keeps "identity cannot be determined"). A reason whose
 * only content is a generic follow-on ("Potential impact on charge determination") goes only when a dependent part was
 * removed and nothing else about a conflict remains: no kept finding or account, and no kept conflict reason.
 */
export function modelRoutingReasons(reasons: string[], invalidClaims: string[], standing: string[]): { reasons: string[]; removed: string[] } {
  const stand = new Set(standing.flatMap((t) => [...factsOf(t)]));
  const claims = invalidClaims.map((t) => ({ facts: factsOf(t), words: new Set(words(t)) }));
  const PERSON = /\b(person|people|subjects?|who|whom|whose|attribut\w*|individuals?|identity|identit\w*)\b/i;
  const dependent = (part: string) => {
    if (!CONFLICT_RE.test(part) || PERSON.test(part)) return false;
    const f = [...factsOf(part)];
    if (!f.length || f.some((x) => stand.has(x))) return false;
    return claims.some((c) => f.every((x) => c.facts.has(x)) && words(part).every((w) => GENERIC.has(w) || c.words.has(w) || ["date", "dates", "place", "places", "location", "manner", "time", "encounter", "history", "immigration", "prior", "removal", "year"].includes(w)));
  };
  const followOn = (part: string) => !CONFLICT_RE.test(part) && words(part).length > 0 && words(part).every((w) => FOLLOW_ON.has(w) || GENERIC.has(w));
  const removed: string[] = [];
  const kept: string[] = [];
  const pendingFollowOns: string[] = [];
  for (const r of reasons) {
    const parts = r.split(/\s*;\s*|:\s+|\.\s+(?=[A-Z])/).map((x) => x.trim().replace(/\.$/, "")).filter(Boolean);
    const dep = parts.filter(dependent);
    if (!dep.length) { (parts.every(followOn) ? pendingFollowOns : kept).push(r); continue; }
    const rest = parts.filter((x) => !dep.includes(x));
    if (rest.every(followOn)) { removed.push(r); continue; } // the whole reason is the withheld claim plus "this matters"
    removed.push(...dep);
    kept.push(rest.join("; "));
  }
  // A follow-on depends on the conflict it qualifies; that dependence is established only when a dependent part was
  // removed and no other conflict remains anywhere in the review.
  const otherConflict = standing.length > 0 || kept.some((r) => CONFLICT_RE.test(r) || factsOf(r).size > 0);
  if (removed.length && !otherConflict) removed.push(...pendingFollowOns);
  else kept.push(...pendingFollowOns);
  return { reasons: kept, removed };
}/**
 * Whether a citation explanation says the record supports the charge or THIS charge's requirement. A support verb
 * alone is not enough ("the narrative states the subject entered without inspection" opposes an admission charge):
 * the supported thing must be the charge itself or the specific requirement, and it must not be negated.
 */
function claimsRequirementSupport(text: string, reqs?: Requires): boolean {
  if (/\b(narrative|record|facts?) (clearly |also )?(supports?|is consistent with|are consistent with) (the |this )?(selected )?charge\b/i.test(text)) return true;
  const req = reqs?.priorRemoval ? "(prior )?(removal|removed|deport\\w*|reinstat\\w*)"
    : reqs?.applicationForAdmission ? "appl(ied|ication) for admission"
    : reqs?.entryManner === "without_inspection" ? "(entry )?without (being )?inspect\\w*|illegal(ly)? (entry|entered|crossed|crossing)|EWI"
    : reqs?.entryManner === "admitted" ? "(lawful )?admi(tted|ssion)|inspected and admitted|paroled" : null;
  if (!req) return false;
  const verb = "(supports?|documents?|establish(es)?|shows?|states?|describes?|confirms?)";
  const after = new RegExp(`\\b(narrative|record) ${verb}\\b[^.;]{0,30}\\b(${req})`, "i");
  const before = new RegExp(`\\b(${req})\\b[^.;]{0,40}\\bwhich (the )?(narrative|record) ${verb}\\b`, "i");
  // Negation counts only inside the clause that states the support: "which the narrative documents, but the form indicates
  // no prior removal" is support from the narrative; the "no" belongs to the form's clause (C013-X1).
  const negated = new RegExp(`\\b(no|not|never|without any)\\b[^.;]{0,15}\\b(${req})|\\b(does not|doesn't|did not|fails? to) ${verb}`, "i");
  const clauseOf = (m: RegExpExecArray) => {
    const head = text.slice(0, m.index);
    const start = Math.max(head.lastIndexOf("."), head.lastIndexOf(";"), head.search(/\b(but|while|whereas|however|although)\b(?![\s\S]*\b(but|while|whereas|however|although)\b)/i));
    const tail = text.slice(m.index + m[0].length).match(/^[^.;]*?(?=\b(but|while|whereas|however|although)\b|[.;]|$)/i)?.[0] ?? "";
    return text.slice(start + 1, m.index) + m[0] + tail;
  };
  return [after, before].some((re) => {
    const m = re.exec(text);
    return !!m && !negated.test(clauseOf(m));
  });
}
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
    // Output length (characters only, never content) for latency analysis of slow calls.
    // Output length (characters only, never content) and token counts reported by the endpoint, for latency analysis.
    (v) => {
      const u = (v as { usage?: { completion_tokens?: number; prompt_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } } }).usage;
      log.push({ role, status: "ok", ms: Date.now() - t0, attempts: v.attempts, chars: (v as { text?: string }).text?.length,
        ...(u ? { tokens: { prompt: u.prompt_tokens, completion: u.completion_tokens, reasoning: u.completion_tokens_details?.reasoning_tokens } } : {}) });
      return v;
    },
    (e) => {
      const cancelled = e instanceof ModelError && /cancelled/i.test(e.message);
      log.push({ role, status: cancelled ? "cancelled" : "failed", ms: Date.now() - t0, attempts: e instanceof ModelError ? e.attempts : 1, error: e instanceof ModelError ? e.kind : "error" });
      throw e;
    },
  );
}

/**
 * Whether a model's charge concern names only facts the charge's requirement does not depend on: for a manner-based charge,
 * the entry place, date or time, with no wording about the manner, inspection, admission or documents of entry.
 */
function concernsOnlyOtherFacts(explanation: string, reqs?: Requires): boolean {
  if (!reqs?.entryManner) return false;
  const other = /\b(?:place|location|located|city|state|date|year|month|time|hour|when)\b/i.test(explanation);
  const manner = /\b(?:manner|inspect\w*|admi\w*|parole\w*|visa|illegal\w*|without|EWI|port of entry|crossed|crossing|walk\w*|wad\w*|swim|swam|document\w*|status|overstay\w*)\b/i.test(explanation);
  return other && !manner;
}

export async function reviewCase(c: CaseRecord, completeFn: Complete = completeJSON, cancel?: AbortSignal): Promise<ReviewResult> {
  // A cancelled request aborts every model call it started.
  const complete: Complete = cancel ? (system, user, budget, signal) => completeFn(system, user, budget, signal ? AbortSignal.any([signal, cancel]) : cancel) : completeFn;
  const calls: CallLog[] = [];
  const t0 = Date.now();
  const sentences = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const rules = runRules(c, sentences);
  // Several people described (redacted names): only explicitly-"subject" statements count for or against this record.
  const multiPerson = rules.notes.length > 0;
  const accounts: { sentenceIds: string[]; fieldPath?: string; detail: string }[] = [];
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
  // Invalid output is retried once if enough of the time budget remains; the reason is logged (never the content).
  const factsStart = Date.now();
  const parseFacts = (role: string) => (r: { text: string }) => {
    try {
      const facts = normalizeFacts(FactsOutput.parse(extractJSON(r.text)));
      // Valid but empty: the entry comparison would silently not happen. Treated like invalid output (retried within the
      // remaining budget, otherwise the check is reported as not completed).
      if (!facts.entry_statements.length && describesUsEntry(sentences)) throw new Error("no entry statements although the narrative describes an entry into the United States");
      return facts;
    } catch (e) {
      const last = calls.find((x) => x.role === role);
      if (last) Object.assign(last, { status: "invalid_output", error: invalidReason(e) });
      throw e;
    }
  };
  const factsCall = logged(calls, "facts", complete(FACTS_SYSTEM_PROMPT, buildFactsPrompt(sentences))).then(parseFacts("facts")).catch((e) => {
    const remaining = FACTS_BUDGET_MS - (Date.now() - factsStart);
    if (calls.find((x) => x.role === "facts")?.status !== "invalid_output" || remaining < 15_000 || cancel?.aborted) throw e;
    return logged(calls, "facts-retry", complete(FACTS_SYSTEM_PROMPT, buildFactsPrompt(sentences), remaining)).then(parseFacts("facts-retry"));
  });
  const [settled, factsSettled] = await Promise.all([
    samplesWithGrace(SAMPLES, (signal, i) => logged(calls, `review-${i + 1}`, complete(SYSTEM_PROMPT, user, undefined, signal))),
    // The failure reason is kept for the review record (never the model's text: invalid output is described, not stored).
    factsCall.then((v) => ({ ok: true as const, v }), (e) => ({ ok: false as const, reason: e instanceof ModelError ? e.message : invalidReason(e) })),
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
  // Elements decided by deterministic detectors or form-field rules, without the model: their findings are rule findings.
  const ruleDecided = new Set<string>();
  const elements: ElementResult[] = allElements.map((el): ElementResult => {
    const ap = applicability.get(el.id);
    if (ap === false) return { elementId: el.id, label: el.label, status: "not_applicable", sentenceIds: [], fieldPaths: [], note: `Applies only in: ${(el.appliesIn ?? []).join(", ").replace(/_/g, " ")}.` };
    if (ap === "unclear") return { elementId: el.id, label: el.label, status: "applicability_unclear", sentenceIds: [], fieldPaths: [], note: `Applies in ${(el.appliesIn ?? []).join(", ").replace(/_/g, " ")}; this case's context could not be determined.` };
    const det = detected.get(el.id);
    if (det) { ruleDecided.add(el.id); return det; }
    const fromField = rules.elementsFromFields.get(el.id);
    // Fully known form fields settle the element. Fields recorded as unknown (or partly unknown) are documented but
    // not established, so the narrative is still checked; if it does not state the fact, the qualified field result stands.
    if (fromField?.status === "present" && !fromField.qualifier) { ruleDecided.add(el.id); return fromField; }
    const m = out?.elements.find((x) => x.element_id === el.id);
    const validIds = (m?.sentence_ids ?? []).filter((id) => sentences.some((s) => s.id === id));
    if (fromField?.status === "present") {
      if (m?.status === "present" && validIds.length) {
        const unknownOnly = validIds.every((id) => statesUnknown(sentences.find((s) => s.id === id)!.text));
        return unknownOnly ? { ...fromField, sentenceIds: validIds, qualifier: "recorded_unknown", note: "The form and the narrative both record this as unknown. It is documented, but not established." }
          : { elementId: el.id, label: el.label, status: "present", sentenceIds: validIds, fieldPaths: fromField.fieldPaths, note: `Stated in the narrative. ${fromField.note}` };
      }
      // The manner of entry is the fact charges depend on. A form that records it only as unknown, with a narrative
      // that was checked and does not state it, leaves it unestablished: unclear for a person, not "present" (G09). It
      // is not "absent" either, since the officer did record it as unknown. Other elements recorded as unknown keep
      // the documented-unknown result. A failed or invalid extraction is not evidence that the narrative lacks the
      // manner: the field result stands, and the review is already reported as partial.
      if (el.id === "E3" && fromField.qualifier === "recorded_unknown" && m && factsSettled.ok && !hasMannerStatement(sentences, factsSettled.v))
        return { elementId: el.id, label: el.label, status: "unclear", sentenceIds: [], fieldPaths: fromField.fieldPaths,
          note: "The form records the manner of entry as unknown, and the narrative does not state how the subject entered. The charge depends on this fact, so a person should confirm it." };
      return fromField;
    }
    // The manner of entry (E3) is also covered by the fact extraction, which classifies the manner of every entry
    // statement. When the model's checklist answer did not arrive (failed, invalid or omitted), the form's manner field
    // is blank, and that extraction completed and shows no manner stated for anyone (cross-checked against the source),
    // the element is absent. The review still reports the missing model answer (completion). Anything less (an
    // extraction that did not complete, a manner stated for a companion or for a first entry) stays not checked.
    if (!m && el.id === "E3" && !fromField && factsSettled.ok && mannerAbsentFromCompletedExtraction(sentences, factsSettled.v))
      return { elementId: el.id, label: el.label, status: "absent", sentenceIds: [], fieldPaths: [], decidedWithoutModel: "fact_extraction",
        note: "The model's checklist answer for this element did not arrive. The completed fact extraction, checked against the source text, finds no statement of how anyone entered, and the form's manner field is blank." };
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
  // E2 (place of entry): a model "present" must cite a sentence that describes the subject's entry and locates it
  // (C012-M2: "crossing the border illegally via a river" names no place). Form-field results are untouched.
  const e2 = elements.find((e) => e.elementId === "E2");
  if (e2 && e2.status === "present" && !e2.fieldPaths.length && !e2.sentenceIds.some((id) => locatesEntry(sentences.find((x) => x.id === id)?.text ?? ""))) {
    Object.assign(e2, { status: "absent", sentenceIds: [], note: "No cited sentence says where the subject entered (an arrest or encounter location, or a generic river, border or desert, does not place the entry)." });
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
        needsHumanReview: false, source: ruleDecided.has(e.elementId) ? "rule" : "model", severity: ref.severity as Finding["severity"],
      });
    } else if (e.status === "unclear") {
      const ev: EvidenceRef[] = e.sentenceIds.map((id) => { const s = sentences.find((x) => x.id === id)!; return { kind: "sentence", sentenceId: id, quote: s.text, start: s.start, end: s.end, page: s.page, verified: true }; });
      findings.push({
        id: `U-${e.elementId}`, category: "unclear", title: `Unclear: ${e.label.toLowerCase()}`,
        explanation: `${e.note || "The narrative touches on this element but does not state it clearly."}`,
        evidence: ev.length ? ev : [{ kind: "missing", elementId: e.elementId, verified: true }], referenceIds: [e.elementId],
        needsHumanReview: false, source: ruleDecided.has(e.elementId) ? "rule" : "model", severity: "low",
      });
    }
  }

  // ---- Model issues, kept only with verified evidence
  // Model claims withheld because they were shown invalid (not merely unverifiable or unattributable): their facts, so
  // that a model routing reason that only repeats one of them is not kept as a reason to route.
  const invalidClaims: string[] = [];
  // Whether a model claim about a time conflict was withheld as unsupported (see timeRoutingReasons).
  let withheldTime = false;
  const invalidate = (iss: { title: string; explanation: string }, ev: EvidenceRef[]) => invalidClaims.push(`${iss.title} ${iss.explanation} ${ev.map((v) => v.fieldPath ?? "").join(" ")}`);
  out?.issues.forEach((iss, i) => {
    const ev = iss.evidence.map((x) => verifyEvidence(x, sentences, c));
    let verified = ev.filter(Boolean) as EvidenceRef[];
    if (verified.length < ev.length || verified.length === 0) {
      discarded.push({ title: iss.title, reason: "Quoted evidence could not be matched to the reviewed text." });
      return;
    }
    // Relevance: an exact quote is necessary but not sufficient. (1) A claim about the U.S. entry fields must not rest on a
    // sentence the extractor identified as entry into another country, a departure, or travel.
    const nonUs = factsSettled.ok ? nonUsEntrySentences(factsSettled.v, sentences) : new Set<string>();
    if (iss.type === "inconsistency" && verified.some((v) => v.sentenceId && nonUs.has(v.sentenceId))) {
      discarded.push({ title: iss.title, reason: "The cited sentence describes entry into another country or travel, not the U.S. entry, so it cannot show a conflict about the U.S. entry." });
      invalidate(iss, verified);
      return;
    }
    // (1b) A claimed conflict between the form's manner-of-entry code and a narrative sentence the extractor classified in
    // the SAME manner category (e.g. EWI/PWA vs "crossed illegally") is not a conflict.
    // Generalised (live verification of 286d42d, C037-X1: "smuggler-assisted crossing, whereas form lists EWI AFOOT"):
    // the form's manner code carries separate attributes, compared independently: the inspection category (without
    // inspection vs admitted) and, when the code states one, the mode of travel (AFOOT, vehicle, boat, air). Help from a
    // smuggler or guide is neither; it is compatible with every code. A manner conflict needs a cited statement that
    // asserts an incompatible category or an incompatible mode; a statement whose category matches the form, or states
    // none, does not contradict it.
    const mannerField = verified.find((v) => v.fieldPath === "entry.manner");
    if (iss.type === "inconsistency" && mannerField) {
      const formValue = c.facts.find((f) => f.path === "entry.manner")?.value ?? "";
      const formCat = formMannerCategory(formValue);
      const byS = factsSettled.ok ? usEntryMannerBySentence(sentences, factsSettled.v) : new Map<string, string>();
      const citedS = verified.filter((v) => v.sentenceId).map((v) => sentences.find((x) => x.id === v.sentenceId)!);
      const cited = citedS.map((s) => conflictManner(s.text, byS.get(s.id) as "without_inspection" | "admitted" | undefined));
      const fMode = formEntryMode(formValue);
      const incompatible = cited.some((m) => !!m && m !== formCat) || (!!fMode && citedS.some((s) => { const m = crossingMode(s.text); return !!m && m !== fMode; }));
      const otherFields = verified.filter((v) => v.fieldPath && v.fieldPath !== "entry.manner");
      // Also when combined with date/place points: a claim whose manner part is wrong is not a valid conflict.
      if (formCat && cited.length > 0 && !incompatible && (otherFields.length === 0 || /\b(manner|PWA|EWI|AFOOT|on foot|walk|swim|swam|river|cross|smuggl|guide)/i.test(iss.explanation))) {
        // The manner part is wrong. Keep any date or place part that the cited text itself supports (audit: separate
        // mixed claims rather than discarding a real conflict); drop the claim only if nothing supported remains.
        const citedText = verified.filter((v) => v.sentenceId).map((v) => sentences.find((x) => x.id === v.sentenceId)?.text ?? "").join(" ");
        const parts = otherFields.map((v) => ({ path: v.fieldPath!, text: supportedEntryPart(c, v.fieldPath!, citedText) })).filter((x) => x.text);
        const kept = parts.map((x) => x.text!);
        const note = cited.every((m) => m === formCat)
          ? `The model's manner-of-entry point was withheld: the form code "${mannerField.quote}" and the cited statement describe the same manner of entry.`
          : `The model's manner-of-entry point was withheld: the cited statement does not state a manner of entry or mode of travel incompatible with the form code "${mannerField.quote}" (help from a smuggler or guide is compatible with any manner).`;
        discarded.push({ title: iss.title, reason: kept.length ? `Manner part only. ${note}` : note });
        if (!kept.length) { invalidate(iss, verified); return; }
        verified = verified.filter((v) => !v.fieldPath || parts.some((x) => x.path === v.fieldPath));
        iss = { ...iss, title: kept.length > 1 ? "Entry date and place differ from the form" : /year/.test(kept[0]) ? "Entry date differs from the form" : "Place of entry differs from the form", explanation: `${kept.join(" ")} ${note}` };
      }
    }
    // (1f) A conflict with a NEGATIVE immigration record must rest on immigration history that the record covers (live
    // verification of 286d42d, C021-X1: "NEGATIVE but narrative documents prior admission and overstay"). The field's
    // scope, as the review instructions (prompt B) and the deterministic history rules use it: prior removals or
    // deportations, removal orders, and prior immigration arrests, apprehensions or returns. A lawful admission, a visa,
    // or an overstay is not such history (an overstay is the status the current charge rests on). Claims citing
    // in-scope history are kept and go on to the attribution checks below; only claims with none are withheld.
    const immField = verified.find((v) => v.fieldPath === "history.immigration_record");
    if (iss.type === "inconsistency" && immField && /^\s*NEGATIVE\b/i.test(immField.quote ?? "")) {
      const encYear = Number(c.facts.find((f) => f.path === "encounter.date_time")?.value.match(/\b(19|20)\d\d\b/)?.[0] ?? 0);
      const citedS = verified.filter((v) => v.sentenceId).map((v) => sentences.find((x) => x.id === v.sentenceId)!);
      if (citedS.length && !citedS.some((s) => describesRecordHistory(s.text, encYear))) {
        discarded.push({ title: iss.title, reason: `The cited statement describes no prior removal, removal order, or prior immigration arrest, apprehension or return; an admission, a visa or an overstay is not history that the immigration record "${immField.quote}" denies.` });
        invalidate(iss, verified);
        return;
      }
    }
    // (1c) In a narrative about several people, a statement whose subject cannot be attributed (redacted names) is not
    // evidence against THIS subject's entry or history fields (same rule as the fact comparison: facts.aboutSubject).
    // Values matching the subject's form (entry month and day, place, manner) do not attribute a statement.
    const unlinked = (v: EvidenceRef) => attribution(sentences.find((x) => x.id === v.sentenceId)!, "unclear", v.quote) !== "subject";
    if (iss.type === "inconsistency" && multiPerson && verified.some((v) => v.fieldPath?.startsWith("history.") || v.fieldPath?.startsWith("entry.")) &&
        verified.every((v) => !v.sentenceId || unlinked(v)) && verified.some((v) => v.sentenceId && unlinked(v))) {
      discarded.push({ title: iss.title, reason: "Several people are described and the cited statement cannot be attributed to this record's subject, so it cannot contradict this subject's record." });
      // A form field recorded as unknown has nothing to conflict with: an unattributed statement against it is a
      // documentation gap, not an account a person must attribute (F055). Route only when a cited form value is known.
      const knownField = verified.some((v) => v.fieldPath && fieldQuality(c.facts.find((f) => f.path === v.fieldPath && f.status === "present")?.value ?? "") !== "unknown");
      if (!knownField) { invalidate(iss, verified); return; }
      accounts.push({ sentenceIds: verified.filter((v) => v.sentenceId && unlinked(v)).map((v) => v.sentenceId!), fieldPath: verified.find((v) => v.fieldPath)?.fieldPath,
        detail: `The model reported: "${stripChargeAdvice(iss.explanation, selected.map((x) => x.citation)).text}"` });
      return;
    }
    // (1d) Two narrative statements compared with each other: in a multi-person narrative they may be about two
    // different people (dev-synthetic DS06), so the claim is routed unless both are about this subject.
    const citedSentences = verified.filter((v) => v.sentenceId).map((v) => sentences.find((x) => x.id === v.sentenceId)!);
    if (iss.type === "inconsistency" && multiPerson && !verified.some((v) => v.fieldPath) && citedSentences.length >= 2 &&
        citedSentences.some((x) => attribution(x, "unclear") !== "subject")) {
      discarded.push({ title: iss.title, reason: "Several people are described and the compared statements may be about different people, so they cannot show a contradiction." });
      humanReasons.push(`Several people are described with redacted names, and ${citedSentences.map((x) => x.id).join(" and ")} may be about different people. A person should decide whether they conflict.`);
      accounts.push({ sentenceIds: citedSentences.map((x) => x.id), detail: `${citedSentences.map((x) => x.id).join(" and ")} give different accounts (the model reported: "${stripChargeAdvice(iss.explanation, selected.map((x) => x.citation)).text}"), and they may be about different people.` });
      return;
    }
    // (1e) A time conflict must compare the same event (lib/review/times.ts): the form's encounter hour only with a time
    // the narrative states for the encounter itself, and two narrative times only when they are one event's. A call,
    // request, arrival, arrest or processing time is not the encounter time unless the source ties them ("Upon arrival at
    // 0900 hours, agents encountered …", "encountered and arrested … at 0900 hours"); sharing a sentence does not. A
    // narrative that never states the encounter time leaves it unresolved, not in conflict.
    // Applies to "unclear" items too when they assert a time conflict; a missing-time observation is left alone.
    {
      const citesForm = verified.some((v) => v.fieldPath === "encounter.date_time");
      const cited = verified.filter((v) => v.sentenceId).map((v) => sentences.find((x) => x.id === v.sentenceId)!);
      const why = (citesForm || cited.length >= 2) ? unsupportedTimeClaim(`${iss.title}. ${iss.explanation}`, cited, citesForm, encounterFormValue(c), sentences) : null;
      if (why) {
        discarded.push({ title: iss.title, reason: why.reason });
        // Shown wrong: withheld, and reasons resting on it are not kept. Unresolved (a differing time the narrative ties to
        // no event): withheld as a finding, but the question goes to a person.
        if (why.invalid) { invalidate(iss, verified); withheldTime = true; }
        else if (why.routeReason) humanReasons.push(why.routeReason);
        return;
      }
    }
    // (2) Dates, years and clock times the claim relies on must appear in the cited evidence.
    const evTexts = verified.map((v) => (v.sentenceId ? sentences.find((x) => x.id === v.sentenceId)?.text ?? "" : v.quote ?? ""));
    const missingValues = unsupportedValues(`${iss.title}. ${iss.explanation}`, evTexts);
    if (missingValues.length) {
      discarded.push({ title: iss.title, reason: `The claim relies on ${missingValues.join(", ")}, which does not appear in the cited evidence.` });
      invalidate(iss, verified);
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
  // The comparison also runs when extraction failed, with no extracted statements: its source-text checks (prior
  // removals and encounters stated in the narrative) still apply. The review stays partial (completion below).
  {
    if (factsSettled.ok) factsStatus = "ok";
    // Without an extraction, the entry statements are read from the source text (person–event analysis). Every
    // finding is then rule-based: no model output is used.
    const cmp = compareFacts(c, sentences, factsSettled.ok ? withSourceEntries(sentences, factsSettled.v) : { ...EMPTY_FACTS, entry_statements: sourceEntryStatements(sentences) }, multiPerson);
    if (!factsSettled.ok) for (const ff of cmp.findings) ff.source = "rule";
    for (const ff of cmp.findings) {
      const srcs = new Set(ff.evidence.map((e) => e.sentenceId ?? e.fieldPath));
      for (let i = findings.length - 1; i >= 0; i--) {
        const f = findings[i];
        if (f.source === "model" && (f.category === "inconsistency" || f.category === "unclear") && f.evidence.some((e) => srcs.has(e.sentenceId ?? e.fieldPath))) findings.splice(i, 1);
      }
      findings.push(ff);
    }
    if (cmp.unattributed.length)
      humanReasons.push(`Several people are described with redacted names, and ${[...new Set(cmp.unattributed.map((u) => u.sentenceId))].join(", ")} may conflict with this record but cannot be attributed to its subject. A person should decide who each statement is about.`);
    // The fact comparison's accounts come first: they state the conflicting values themselves.
    accounts.unshift(...cmp.unattributed.map((u) => ({ sentenceIds: [u.sentenceId], fieldPath: u.fieldPath, detail: u.detail })));
    if (cmp.dropped) discarded.push({ title: "Extracted entry statements", reason: `${cmp.dropped} quote(s) could not be matched to the text and were ignored.` });
  }

  // Conflicts within one person's continuous account (deterministic; no comparison with the form and no claim that the
  // account is this subject's). A model inconsistency citing the same sentences is superseded; rule findings are kept.
  // A chronology concern (an entry dated after the stated expiry of the visa used for it) is handled the same way.
  for (const af of [...accountConflicts(sentences, factsSettled.ok ? nonUsEntrySentences(factsSettled.v, sentences) : new Set<string>()), ...visaChronologyConflicts(sentences)]) {
    const ids = af.evidence.map((e) => e.sentenceId);
    // A rule or fact-comparison finding (F-…) about the same sentences already says more (it is tied to this subject or
    // the form): keep it and skip this one. Only free-text model issues citing the same sentences are superseded.
    const cites = (f: Finding) => f.evidence.some((e) => e.sentenceId && ids.includes(e.sentenceId));
    if (findings.some((f) => f.category === "inconsistency" && (f.source !== "model" || /^F-/.test(f.id)) && cites(f))) continue;
    for (let i = findings.length - 1; i >= 0; i--) {
      const f = findings[i];
      if (f.source === "model" && !/^F-/.test(f.id) && f.category === "inconsistency" && cites(f)) findings.splice(i, 1);
    }
    findings.push(af);
  }

  // Accounts that may conflict with this record but cannot be attributed to its subject: routing items for a person,
  // grouped by the fact they concern, each showing the conflicting account. Not findings (no contradiction is
  // claimed), and never listed for a statement an existing finding already cites.
  // A visa-chronology concern (F-ACCOUNT-VISA, F-ACCOUNT-VISA-2, …) compares an entry with its visa's expiry, not with the form, so it does not
  // replace the account item comparing that entry with the form (or the citation qualification that item carries).
  const citedByFinding = new Set(findings.filter((f) => !f.id.startsWith("F-ACCOUNT-VISA")).flatMap((f) => f.evidence.map((e) => e.sentenceId).filter(Boolean)));
  const accountGroups = new Map<string, { fieldPath?: string; sentenceIds: string[]; details: string[] }>();
  for (const a of accounts) {
    const ids = a.sentenceIds.filter((id) => sentences.some((x) => x.id === id) && !citedByFinding.has(id));
    if (!ids.length) continue;
    const g = accountGroups.get(a.fieldPath ?? "narrative") ?? { fieldPath: a.fieldPath, sentenceIds: [], details: [] };
    if (ids.every((id) => g.sentenceIds.includes(id))) continue;
    g.sentenceIds.push(...ids.filter((id) => !g.sentenceIds.includes(id)));
    g.details.push(a.detail);
    accountGroups.set(a.fieldPath ?? "narrative", g);
  }
  const routedAccounts = [...accountGroups.values()];


  // ---- Citation check
  let citation: ReviewResult["citation"];
  const citeText = selected.map((s) => s.citation).join("; ");
  const reqs = (charge as { requires?: Requires } | undefined)?.requires;
  // Deterministic pre-check of the charge's core requirement. Uses extracted facts when available, form fields otherwise.
  const req = !rules.citationPrecheck && charge ? checkChargeRequirement(c, sentences, factsSettled.ok ? factsSettled.v : EMPTY_FACTS, reqs, multiPerson) : null;
  if (rules.citationPrecheck) {
    citation = { status: rules.citationPrecheck.status, citation: citeText, explanation: rules.citationPrecheck.explanation, evidence: [] };
  } else {
    let status: ReviewResult["citation"]["status"] = "not_checked";
    let unsupportedConsistent = false;
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
      // Source-supported support settles it even without an extraction (the form record, or a removal the source attributes).
      if (req?.status !== "likely_mismatch" && status === "likely_mismatch" && supportsRequirement(c, sentences, factsSettled.ok ? factsSettled.v : EMPTY_FACTS, reqs, multiPerson)) {
        // The record states the fact the charge depends on; a model "mismatch" here is uncertainty, not a mismatch. When
        // the model's only stated concern is a fact this charge does not depend on (an entry place or date for a
        // manner-based charge: diag-1 DG10), the check stays consistent; that conflict is reported as its own finding.
        if (concernsOnlyOtherFacts(out.citation.explanation, reqs)) {
          status = "consistent";
          explanation = `The record states the fact this charge depends on. The model's concern is about a fact this charge does not depend on, and is reported as its own finding if supported. Model explanation: ${explanation}`;
        } else {
          status = "needs_human_review";
          explanation = `The record states the core fact this charge depends on, but the model raised a concern: ${explanation}`;
        }
      }
      if (req?.status !== "likely_mismatch" && status === "likely_mismatch" && claimsRequirementSupport(out.citation.explanation, reqs)) {
        // The verdict and the model's own explanation disagree (F075-X, C013-X1). The wording is not support: the
        // record establishes the requirement only through verified evidence (checked just above). Without it, unresolved.
        status = "needs_human_review";
        explanation = `Unresolved: the model's verdict is "likely mismatch", but its own explanation says the record supports or documents what the charge requires, and no verified statement in the record establishes that requirement. A person must decide. Model explanation: ${explanation}`;
      }
      if (req?.outcome === "unresolved" && status === "likely_mismatch") {
        // The record cannot say whose the deciding statements are (several people with redacted names, or an
        // unidentified member of a group). A model "mismatch" cannot settle that: the case stays with a person.
        status = "needs_human_review";
        explanation = `${req.explanation} The model's "likely mismatch" verdict is not adopted, because the record does not resolve this. Model explanation: ${explanation}`;
      }
      if (reqs && status === "likely_mismatch" && req?.status !== "likely_mismatch") {
        // For a charge whose requirement the references record, a mismatch needs a contradiction established from
        // subject-specific evidence (the rule above). Without one, the record neither establishes nor contradicts the
        // requirement as far as the code can attribute it: the model's concern goes to a person, not into a verdict.
        status = "needs_human_review";
        explanation = `Unresolved: the model's verdict is "likely mismatch", but no statement or form value attributable to this subject contradicts what the charge requires. A person should decide. Model explanation: ${explanation}`;
      }
      if (status === "consistent") {
        // A "consistent" verdict needs verified support (audit item 6): a verified statement of the fact the charge
        // depends on, or, for a charge without a recorded requirement, verified narrative evidence from the model.
        const supported = reqs ? supportsRequirement(c, sentences, factsSettled.ok ? factsSettled.v : EMPTY_FACTS, reqs, multiPerson)
          : evidence.some((e) => e.kind === "sentence");
        if (!supported) {
          status = "needs_human_review";
          explanation = reqs && !factsSettled.ok
            ? "The model reported the charge as consistent, but the fact extraction did not complete, so the fact this charge depends on could not be verified."
            : "The model reported the charge as consistent, but no verified statement of the fact this charge depends on was found. A person should confirm.";
          unsupportedConsistent = factsSettled.ok || !reqs;
        }
      }
    }
    // The more cautious result wins.
    const rank = { not_checked: -1, consistent: 0, insufficient_information: 1, needs_human_review: 2, likely_mismatch: 3 } as const;
    // On an equal verdict, the rule's verified evidence replaces model evidence that could not be verified (C037-CIT:
    // the model said "mismatch" without verifiable evidence while the rule established it from the form).
    // A contradiction the rule established from subject-specific evidence is reported with that evidence, whatever the
    // model's own verdict and evidence were, so the same record always yields the same verdict and basis.
    // A model "consistent" verdict downgraded for lack of verified support says only that; when the requirement check
    // reached the same verdict with its own reason (diag-1 DU03: a removal order whose execution is not documented), that
    // reason and its evidence are the more specific explanation. The extraction-failure disclosure is never replaced.
    if (req && unsupportedConsistent && req.status === status && req.explanation) {
      explanation = `${req.explanation} (The model reported the charge as consistent; that is not adopted without verified support.)`;
      if (req.evidence.length) evidence = req.evidence;
    }
    if (req && (rank[req.status] > rank[status] || (req.status === status && evidence.length === 0 && req.evidence.length > 0) || (req.outcome === "contradicted" && status === "likely_mismatch"))) {
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
  // Only facts the selected charge depends on qualify the verdict: the entry for entry-manner charges, the entry and
  // history for reentry after removal, nothing about a past entry for an applicant for admission.
  // For a charge whose requirement is the manner of entry, only the manner qualifies it: a conflicting entry date or place
  // is its own finding with its own routing (diag-1 DG01, DG09, DG10).
  const relevant = !charge ? ["entry."] : reqs?.priorRemoval ? ["entry.", "history."] : reqs?.applicationForAdmission ? [] : reqs?.entryManner ? ["entry.manner"] : ["entry."];
  const refsFor = relevant.includes("entry.") ? ["E1", "E2", "E3"] : relevant.includes("entry.manner") ? ["E3"] : [];
  const touches = (f: Finding) => f.evidence.some((e) => relevant.some((p) => e.fieldPath?.startsWith(p))) || f.referenceIds.some((r) => refsFor.includes(r));
  const entryConflict = findings.find((f) => f.category === "inconsistency" && touches(f));
  const openAccount = routedAccounts.find((g) => relevant.some((p) => (g.fieldPath ?? (relevant.includes("entry.manner") ? "entry.manner" : "entry.")).startsWith(p)));
  if ((entryConflict || openAccount) && citation.status === "consistent") {
    const what = relevant.includes("history.") ? "the entry or immigration history" : "the entry";
    citation = {
      ...citation,
      status: "needs_human_review",
      explanation: entryConflict
        ? `The selected charge fits one account of the facts, but the record has an unresolved conflict about ${what}, which this charge depends on ("${entryConflict.title}"). A person must decide which account is correct before relying on this check.`
        : `The selected charge fits the record, but the narrative contains an account that may conflict with it about ${what}, which this charge depends on, and that account cannot be attributed (${openAccount!.sentenceIds.join(", ")}). Consistency is qualified until a person decides whose account it is.`,
    };
    humanReasons.push(entryConflict ? "Citation check depends on conflicting facts the charge relies on." : "Citation check depends on an unattributed account about facts the charge relies on.");
  }
  if (out?.human_review.required) {
    const kept = modelRoutingReasons(out.human_review.reasons, invalidClaims, [
      ...findings.filter((f) => f.category === "inconsistency" || f.category === "unclear").map((f) => `${f.title} ${f.explanation} ${f.evidence.map((e) => e.fieldPath ?? "").join(" ")}`),
      ...routedAccounts.map((g) => `${g.fieldPath ?? "entry.date entry.place entry.manner"} ${g.details.join(" ")}`),
    ]);
    for (const r of kept.removed) discarded.push({ title: "Model routing reason", reason: `"${r}" depends only on a claim that was withheld as invalid, so it is not a reason to route.` });
    // Encounter-time concerns the source does not support (event-scoped; lib/review/times.ts).
    const timeSupported = !!encounterTimeConflict(sentences, encounterFormValue(c), true) ||
      findings.some((f) => f.evidence.some((e) => e.fieldPath === "encounter.date_time") && (f.category === "inconsistency" || f.category === "unclear"));
    const timed = timeRoutingReasons(kept.reasons, timeSupported, withheldTime, narrativeStatesFormDate(sentences, encounterFormValue(c)));
    for (const r of timed.removed) discarded.push({ title: "Model routing reason", reason: `"${r}" is about an encounter-time conflict the narrative does not support (it does not state an encounter time that differs from the form's, or an arrest before it), so it is not a reason to route.` });
    humanReasons.push(...timed.reasons);
  }
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
    humanReview: { required: required || routedAccounts.length > 0, reasons: shownReasons.length ? shownReasons : required ? ["See findings marked for human review."] : [],
      ...(routedAccounts.length ? { accounts: routedAccounts.map((g) => ({ ...g, details: g.details.map(clean) })) } : {}) },
    findings,
    notes: rules.notes,
    caseContext: ctx,
    checklistVersion: (REFERENCES as { checklistVersion?: string }).checklistVersion ?? "v1",
    discarded,
    calls: calls.sort((a, b) => a.role.localeCompare(b.role)),
    // Review evidence: the extraction that passed validation (schema and the empty-extraction guard), exactly as the
    // comparison used it, or why it did not. Recording only; no check reads it.
    factsExtraction: factsSettled.ok ? { status: "valid", output: factsSettled.v } : { status: "failed", reason: factsSettled.reason },
    completion,
    sampleIssues: { perSample, merged: out?.issues.length ?? 0, inAllSamples: out ? out.issues.filter((i) => agreement(outs, i) === outs.length).length : 0 },
  };
}
