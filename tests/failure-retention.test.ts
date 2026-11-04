// Retaining source-supported findings when model calls fail (branch improve/failure-retention, from 2be23cb).
// Offline: the review samples and the fact call are fakes. The E3 (manner of entry) fallback decides the element from a
// COMPLETED fact extraction, cross-checked against the source, only when the model's checklist answer did not arrive and
// the form's manner field is blank; the review stays partial and says so.
//
// POST-OBSERVATION TESTS: the C003-M3, C037-X1 and F010-D tests use reused cases whose detections were lost in saved runs
// when a model call timed out. They are development tests, not evaluations.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, type FactsOutput } from "../lib/review/facts";
import { ModelError } from "../lib/llm";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const timeout = () => new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1);
const load = (p: string) => JSON.parse(readFileSync(p, "utf8")) as CaseRecord;
type Review = "fail" | "invalid" | "noelements" | { elements: object[] };
const ALL = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8"];
const answered = (status: Record<string, string>) => ({ elements: ALL.map((id) => ({ element_id: id, status: status[id] ?? "present", sentence_ids: [], note: "" })) });
const run = (c: CaseRecord, review: Review, facts: FactsOutput | "fail") => {
  const out = (els: object[]) => JSON.stringify({ elements: els, issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
  const fake: Complete = async (system) => {
    if (system === FACTS_SYSTEM_PROMPT) { if (facts === "fail") throw timeout(); return { text: JSON.stringify(facts), attempts: 1 }; }
    if (review === "fail") throw timeout();
    if (review === "invalid") return { text: "{not json", attempts: 1 };
    return { text: out(review === "noelements" ? [] : review.elements), attempts: 1 };
  };
  return reviewCase(c, fake);
};
const e3 = (r: Awaited<ReturnType<typeof run>>) => r.elements.find((e) => e.elementId === "E3")!;
const hasME3 = (r: Awaited<ReturnType<typeof run>>) => r.findings.some((f) => f.id === "M-E3");
const NONE: FactsOutput = { entry_statements: [], removal_statements: [], status_statements: [] };

// ---- Reused cases (post-observation) ----
const C003M3 = load("eval/cases/C003-M3.json");

test("C003-M3: the missing manner is retained when the review fails, is invalid or omits it, and the review stays partial", async () => {
  // The saved extraction (rc-int-1) completed with no entry statements: the same input here.
  const facts: FactsOutput = { entry_statements: [], removal_statements: [], status_statements: [{ sentence_id: "S24", quote: "if he was present in the United States Illegally, and he advised yes.", person: "unclear" }] } as FactsOutput;
  for (const review of ["fail", "invalid", "noelements"] as const) {
    const r = await run(C003M3, review, facts);
    assert.equal(e3(r).status, "absent", review);
    assert.equal(e3(r).decidedWithoutModel, "fact_extraction");
    assert.ok(hasME3(r), review);
    assert.equal(r.completion?.status, "partial", "the missing model answer is still disclosed");
  }
  const omitted = await run(C003M3, answered({}), facts);
  // An answer for every element except E3: the model completed but omitted it.
  const om = await run(C003M3, { elements: answered({}).elements.filter((e) => (e as { element_id: string }).element_id !== "E3") }, facts);
  assert.ok(hasME3(om));
  assert.match(om.completion!.failed.map((f) => f.reason).join(" "), /E3 decided from the completed fact extraction/);
  assert.equal(omitted.completion?.status, "complete", "a complete model answer is used as before");
});
test("C003-M3: with the fact extraction also failed, the manner stays unresolved (not checked, no finding)", async () => {
  for (const review of ["fail", "noelements"] as const) {
    const r = await run(C003M3, review, "fail");
    assert.equal(e3(r).status, "not_checked", review);
    assert.ok(!hasME3(r));
    assert.equal(r.completion?.status, "partial");
  }
});
test("complete reviews are unchanged: the model's own E3 answer is used, present or absent", async () => {
  assert.equal(e3(await run(C003M3, answered({ E3: "absent" }), NONE)).decidedWithoutModel, undefined);
  assert.ok(hasME3(await run(C003M3, answered({ E3: "absent" }), NONE)));
  // The existing cross-check still applies: a model "present" (citing a sentence) with no extracted manner statement is
  // not trusted.
  const cited = answered({}); (cited.elements.find((e) => (e as { element_id: string }).element_id === "E3") as { sentence_ids: string[] }).sentence_ids = ["S24"];
  assert.equal(e3(await run(C003M3, cited, NONE)).status, "absent");
});
test("F010-D: the missing disposition (N7) is not inferred when the review fails: no completed check covers it", async () => {
  const c = load("eval/fresh/cases/F010-D.json");
  const r = await run(c, "fail", NONE);
  assert.equal(r.elements.find((e) => e.elementId === "N7")!.status, "not_checked");
  assert.ok(!r.findings.some((f) => f.id === "M-N7"));
});
test("C037-X1: the entry-date conflict is kept by the existing source-text fallback when every model call fails (unchanged)", async () => {
  const r = await run(load("eval/cases/C037-X1.json"), "fail", "fail");
  assert.ok(r.findings.some((f) => f.id === "F-ENTRY-DATE" && f.evidence.some((e) => e.sentenceId === "S21")));
});

// ---- Synthetic controls: paraphrases, multi-person, event scope ----
const BASE = load("eval/dev-synthetic/cases/DS05.json");
const blankManner = (entry: string, two = false): CaseRecord => ({
  ...BASE,
  narrative: { ...BASE.narrative, text: `ENCOUNTER:\nOn June 4, 2023, agents encountered ${two ? "two men, the subject and his brother," : "the subject"} near Monroe, Michigan. The subject stated that he is a citizen of Mexico and has no immigration documents.\nENTRY:\n${entry}\nREMOVABILITY:\nThe subject is inadmissible under Section 212(a)(6)(A)(i) of the Immigration and Nationality Act, in that he is present without being admitted or paroled.` },
  facts: BASE.facts.map((f) => (f.path === "entry.manner" ? { ...f, value: "", status: "absent" as const } : f)),
});
const sid = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text).find((s) => s.text.includes(needle))!.id;
const entryFacts = (c: CaseRecord, needle: string, manner: "without_inspection" | "admitted" | "unknown", person = "unclear"): FactsOutput => ({
  entry_statements: [{ sentence_id: sid(c, needle), quote: needle, event: "us_entry", country: "United States", year: null, manner, person: person as "unclear" }],
  removal_statements: [], status_statements: [],
} as FactsOutput);
test("positive control: an entry with no manner stated ('came to the United States in 2015') is missing when the review fails", async () => {
  const c = blankManner("The subject stated that he came to the United States in 2015.");
  const r = await run(c, "fail", entryFacts(c, "came to the United States in 2015", "unknown"));
  assert.equal(e3(r).status, "absent");
  assert.ok(hasME3(r));
});
test("paraphrases and equivalent evidence prevent a false missing manner", async () => {
  const cases: [string, string, "without_inspection" | "admitted" | "unknown"][] = [
    ["The subject stated that he waded across the Rio Grande near Laredo.", "waded across the Rio Grande", "unknown"],
    ["The subject stated that he was smuggled across the border in the trunk of a car.", "smuggled across the border", "unknown"],
    ["The subject stated that he flew into Chicago on a tourist visa.", "flew into Chicago on a tourist visa", "unknown"],
    ["The subject stated that he crossed on a raft in 2015.", "crossed on a raft", "unknown"],
    ["The subject stated that he came into the United States in a truck in 2015.", "came into the United States in a truck", "unknown"],
    ["The subject stated that he did not cross through a designated port of entry.", "did not cross through a designated port of entry", "unknown"],
    ["The subject stated that he got into the United States in 2015.", "got into the United States in 2015", "without_inspection"],
  ];
  for (const [text, needle, manner] of cases) {
    const c = blankManner(text);
    const r = await run(c, "fail", entryFacts(c, needle, manner));
    assert.notEqual(e3(r).status, "absent", text);
    assert.ok(!hasME3(r), text);
  }
});
test("multi-person control: a companion's stated manner leaves the subject's manner unresolved", async () => {
  const c = blankManner("The subject stated that he came to the United States in 2015. His brother stated that he crossed the river illegally.", true);
  const r = await run(c, "fail", { ...entryFacts(c, "came to the United States in 2015", "unknown"),
    entry_statements: [...entryFacts(c, "came to the United States in 2015", "unknown").entry_statements, { sentence_id: sid(c, "crossed the river"), quote: "crossed the river illegally", event: "us_entry", country: "United States", year: null, manner: "without_inspection", person: "other" }] } as FactsOutput);
  assert.equal(e3(r).status, "not_checked");
});
test("event-scope control: a first entry's stated manner leaves the last entry's manner unresolved", async () => {
  const c = blankManner("The subject stated that he first entered the United States by walking across the border in 2005. He came back to the United States in 2015.");
  const r = await run(c, "fail", entryFacts(c, "came back to the United States in 2015", "unknown"));
  assert.equal(e3(r).status, "not_checked");
});
test("field controls: a redacted or 'unknown' manner field is handled as before, not by the fallback", async () => {
  const red = { ...blankManner("The subject stated that he came to the United States in 2015."), facts: blankManner("x").facts.map((f) => (f.path === "entry.manner" ? { ...f, value: "", status: "redacted" as const } : f)) };
  const rr = await run(red, "fail", entryFacts(red, "came to the United States in 2015", "unknown"));
  assert.equal(e3(rr).decidedWithoutModel, undefined, "a redacted field: the fallback does not apply");
  assert.notEqual(e3(rr).status, "absent");
  const unk = { ...blankManner("The subject stated that he came to the United States in 2015."), facts: blankManner("x").facts.map((f) => (f.path === "entry.manner" ? { ...f, value: "UNKNOWN", status: "present" as const } : f)) };
  const ru = await run(unk, "fail", entryFacts(unk, "came to the United States in 2015", "unknown"));
  assert.equal(e3(ru).decidedWithoutModel, undefined);
  assert.notEqual(e3(ru).status, "absent");
});
