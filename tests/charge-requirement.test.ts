// Charge requirements: supported, contradicted or unresolved from subject-specific evidence, and which verdict wins.
// A contradiction the rule establishes cannot be undone by a model "consistent"; a model "mismatch" cannot replace an
// unresolved or unestablished record (an unidentified group member, a statement nobody can attribute, a silent record).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { reviewCase, type Complete } from "../lib/review/review";
import { ModelError } from "../lib/llm";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const load = (id: string) => JSON.parse(readFileSync(["eval/cases", "eval/fresh/cases", "eval/gen-v1/cases", "eval/dev-synthetic/cases"].map((d) => `${d}/${id}.json`).find(existsSync)!, "utf8")) as CaseRecord;
const sents = (c: CaseRecord) => splitSentences(c.narrative.text, c.narrative.pageSpans);
const withText = (c: CaseRecord, from: RegExp | string, to: string) => {
  const text = c.narrative.text.replace(from, to);
  assert.notEqual(text, c.narrative.text, `edit applied: ${from}`);
  return { ...c, narrative: { text } } as CaseRecord;
};
const withField = (c: CaseRecord, path: string, value: string | null) =>
  ({ ...c, facts: value === null ? c.facts.filter((f) => f.path !== path) : c.facts.map((f) => (f.path === path ? { ...f, value } : f)) }) as CaseRecord;
const withCharge = (c: CaseRecord, citation: string, referenceId: string) => ({ ...c, selectedCharges: [{ citation, referenceId }] }) as CaseRecord;

/** A model whose citation verdict is fixed; a "mismatch" cites the first long sentence verbatim. Facts: failed or empty. */
const model = (c: CaseRecord, verdict: "likely_mismatch" | "consistent", facts: "failed" | "empty" = "empty"): Complete => async (system) => {
  if (system === FACTS_SYSTEM_PROMPT) {
    if (facts === "failed") throw new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1);
    return { text: JSON.stringify({ entry_statements: [], removal_statements: [], status_statements: [] }), attempts: 1 };
  }
  const s = sents(c).find((x) => x.text.split(/\s+/).length >= 6)!;
  const citation = verdict === "likely_mismatch"
    ? { status: verdict, explanation: "The narrative does not support the selected charge.", evidence: [{ sentence_id: s.id, quote: s.text.split(/\s+/).slice(0, 6).join(" ") }] }
    : { status: verdict, explanation: "Supported.", evidence: [] };
  return { text: JSON.stringify({ elements: [], issues: [], citation, human_review: { required: false, reasons: [] } }), attempts: 1 };
};
const verdicts = async (c: CaseRecord) => {
  const out: string[] = [];
  for (const v of ["likely_mismatch", "consistent"] as const) for (const f of ["failed", "empty"] as const) out.push((await reviewCase(c, model(c, v, f))).citation.status);
  return [...new Set(out)];
};

// ---- Contradicted by the subject's referenced record (C119-CIT) ----
test("C119-CIT: the record defers to the narrative, whose dated history has no removal and no removal is stated anywhere: likely mismatch from the rule, whatever the model says", async () => {
  const c = load("C119-CIT");
  assert.deepEqual(await verdicts(c), ["likely_mismatch"]);
  const r = await reviewCase(c, model(c, "consistent"));
  const f = r.findings.find((x) => x.id === "C-1")!;
  assert.equal(f.source, "rule");
  const history = sents(c).filter((s) => /Arrived into the United States as a B1|Changed status to H4/.test(s.text)).map((s) => s.id);
  assert.deepEqual(r.citation.evidence.map((e) => e.sentenceId ?? e.fieldPath), ["history.immigration_record", ...history]);
  assert.ok(r.citation.evidence.every((e) => e.verified));
  assert.match(r.citation.explanation, /no removal of anyone is stated anywhere in the narrative/);
});

test("controls for the referenced-record check: any removal wording, no pointer to the narrative, or no dated history → not contradicted", async () => {
  const c = load("C119-CIT");
  // A removal stated anywhere, even of an unidentified other person: whose it is cannot be resolved.
  const removal = withText(c, "Third subject was identified as", "One of the subjects had been deported in 2012. Third subject was identified as");
  assert.deepEqual(await verdicts(removal), ["needs_human_review"]);
  // The record does not defer to the narrative.
  assert.ok(!(await verdicts(withField(c, "history.immigration_record", "POSITIVE"))).includes("likely_mismatch"));
  // No dated immigration history in the narrative.
  const undated = withText(c, /IMMIGRATION HISTORY:[\s\S]*?(?=INADMISIBILITY)/, "IMMIGRATION HISTORY:\n\nSee attached record.\n\n");
  assert.ok(!(await verdicts(undated)).includes("likely_mismatch"));
});

// ---- Supported: a model mismatch does not override it ----
test("C013 (8 U.S.C. 1326, removals documented, 'Subject … being a reinstate case'): supported; a model mismatch is downgraded to a person", async () => {
  const c = load("C013");
  const r = await reviewCase(c, model(c, "likely_mismatch", "failed"));
  assert.equal(r.citation.status, "needs_human_review");
  assert.ok(!r.findings.some((x) => x.id === "C-1"));
  // C013-X1 (record NEGATIVE, the same subject-designated reinstatement): never a mismatch.
  const x1 = load("C013-X1");
  assert.ok(!(await verdicts(x1)).includes("likely_mismatch"));
});

// ---- Unresolved: attribution missing ----
test("F051-C: the only removal is an unidentified group member's; neither model verdict turns it into a mismatch or a pass", async () => {
  assert.deepEqual(await verdicts(load("F051-C")), ["needs_human_review"]);
  const named = withText(load("F051-C"), "one had been ordered removed", "[REDACTED (b)(6), (b)(7)(C)] had been ordered removed");
  assert.deepEqual(await verdicts(named), ["needs_human_review"], "a redacted named person: the same");
});

// ---- Contradicted by an attributable 'IMMIGRATION HISTORY: None' ----
test("a one-person narrative whose record check reports no immigration history contradicts a prior-removal charge; a multi-person one does not", async () => {
  // C037: one person; "IMMIGRATION HISTORY: None"; no history field, so only the narrative can decide.
  const one = withField(withCharge(load("C037"), "8 U.S.C. 1326", "USC-1326"), "history.immigration_record", null);
  assert.deepEqual(await verdicts(one), ["likely_mismatch"]);
  const r = await reviewCase(one, model(one, "consistent"));
  assert.match(r.citation.explanation, /record checks on this subject report no immigration history/);
  // F055: three subjects; "Record checks were ran on [REDACTED] … IMMIGRATION HISTORY: NONE FOUND": not attributable.
  const many = withField(withCharge(load("F055"), "8 U.S.C. 1326", "USC-1326"), "history.immigration_record", null);
  assert.ok(!(await verdicts(many)).includes("likely_mismatch"));
});

// ---- Entry-manner requirement from the source's own statements ----
test("an admission charge contradicted by the subject's own crossing statement, found by the rule even when the extraction fails (C037-CIT)", async () => {
  const c = load("C037-CIT");
  const r = await reviewCase(c, model(c, "consistent", "failed"));
  assert.equal(r.citation.status, "likely_mismatch");
  const s21 = sents(c).find((s) => s.text.includes("crossed the US/MEXICO Border illegally"))!.id;
  assert.deepEqual(r.citation.evidence.map((e) => e.sentenceId ?? e.fieldPath), ["entry.manner", s21]);
});

test("a charge with a recorded requirement and a silent record: a model mismatch goes to a person, a model 'consistent' too", async () => {
  // C037 with an admission charge, no manner field and no manner statement: undetermined.
  const c0 = withField(withCharge(load("C037"), "INA 237(a)(1)(B)", "INA-237a1B"), "entry.manner", null);
  const silent = withText(c0, /crossed the US\/MEXICO Border illegally, into Naco, Arizona/, "reached Naco, Arizona");
  assert.deepEqual(await verdicts(silent), ["needs_human_review"]);
});
