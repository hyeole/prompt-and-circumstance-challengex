// Round 2 regression tests (branch improve/round2). Each "defect" test failed on rc-closeout (7efb231); the controls
// guard behaviour that must not change. The model is replaced by a fake, so these run offline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, attributeStatement, isPriorRemoval, isPriorImmigrationEncounter, nonUsEntrySentences, accountConflicts, fullDates } from "../lib/review/facts";
import { ModelError } from "../lib/llm";
import { splitSentences } from "../lib/text";
import type { CaseRecord, Sentence } from "../lib/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8")) as CaseRecord;
const ss = (c: CaseRecord) => splitSentences(c.narrative.text, c.narrative.pageSpans);
const sid = (c: CaseRecord, needle: string) => ss(c).find((s) => s.text.includes(needle))!.id;
const S = (text: string, id: string): Sentence => ({ id, text, start: 0, end: text.length, page: 1 } as Sentence);
const seq = (...t: string[]) => t.map((x, i) => S(x, `S${i + 1}`));
const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const fake = (facts: string | Error): Complete => async (system) => {
  const v = system === FACTS_SYSTEM_PROMPT ? facts : REVIEW;
  if (v instanceof Error) throw v;
  return { text: v, attempts: 1 };
};
const EMPTY = JSON.stringify({ entry_statements: [], removal_statements: [] });
const factsFailed = (r: { completion?: { failed: { check: string }[] } }) => !!r.completion?.failed.some((f) => f.check === "Fact extraction");

// ---- Fix 1: extraction must not override direct source evidence (C003-AMB) ----
const amb = load("eval/cases/C003-AMB.json");
const s41 = sid(amb, "at the age of five"), s42 = sid(amb, "border crossing card");
const ent = (id: string, quote: string, country: string, event = "us_entry") => ({ sentence_id: id, quote, event, country, year: null, manner: "unknown", person: "unclear" });
const scenarios: [string, string | Error, boolean][] = [
  ["accurate extraction", JSON.stringify({ entry_statements: [ent(s41, "claims to have crossed the Mexico-United States border", "United States"), ent(s42, "he entered at the Nogales port of entry using a border crossing card", "United States")] }), false],
  // An extraction with no entry statement for a narrative that describes an entry is an incomplete check (round 2).
  ["incomplete extraction", EMPTY, true],
  ["incorrect non-U.S. classification", JSON.stringify({ entry_statements: [ent(s41, "claims to have crossed the Mexico-United States border", "Mexico", "other_country_entry"), ent(s42, "he entered at the Nogales port of entry using a border crossing card", "United States")] }), false],
  ["invalid extraction output", "not json", true],
  ["extraction timeout", new ModelError("timeout", "timeout", 1), true],
];
for (const [name, facts, failed] of scenarios) {
  test(`fix 1 (${name}): the within-account contradiction is kept, and completion reflects the fact call`, async () => {
    const r = await reviewCase(amb, fake(facts));
    assert.equal(r.findings.filter((f) => f.id === "F-ACCOUNT").length, 1);
    assert.equal(factsFailed(r), failed, "a failed extraction still makes the review partial; a successful one does not add that failure");
    if (failed) assert.equal(r.completion?.status, "partial");
  });
}
test("fix 1 control: an extracted entry into another country that the source confirms stays excluded", () => {
  const sentences = seq("[REDACTED (b)(6), (b)(7)(C)] crossed into Mexico from Guatemala on foot.", "He crossed the river into the United States near Laredo.");
  const facts = { entry_statements: [{ sentence_id: "S1", quote: "crossed into Mexico from Guatemala", event: "other_country_entry", country: "Mexico", year: null, manner: "unknown", person: "unclear" }], removal_statements: [], status_statements: [] };
  assert.deepEqual([...nonUsEntrySentences(facts as never, sentences)], ["S1"]);
  const wrong = { ...facts, entry_statements: [{ ...facts.entry_statements[0], sentence_id: "S2" }] };
  assert.deepEqual([...nonUsEntrySentences(wrong as never, sentences)], [], "a U.S. entry wrongly labelled non-U.S. is not excluded");
});

// ---- Fix 2: removals stated in the source; history checks without extraction ----
const x1 = load("eval/cases/C013-X1.json");
const s38 = sid(x1, "reinstate case");
test("fix 2: an explicitly-subject reinstatement in the source conflicts with a NEGATIVE record even if the extractor omits it (C013-X1 S38)", async () => {
  const r = await reviewCase(x1, fake(EMPTY));
  const f = r.findings.find((x) => x.id === "F-HISTORY");
  assert.ok(f && f.evidence.some((e) => e.sentenceId === s38));
});
test("fix 2: the source-text history check runs when extraction times out, and the review stays partial", async () => {
  const r = await reviewCase(x1, fake(new ModelError("timeout", "timeout", 1)));
  assert.ok(r.findings.some((x) => x.id === "F-HISTORY"));
  assert.equal(r.completion?.status, "partial");
});
test("fix 2: negated, offered, declined and current-processing removals are not prior removals", () => {
  for (const t of ["He has never been deported.", "He has not been previously deported.", "There are no prior removals.", "He was offered a stipulated removal, which he declined.", "Supervisory CBP Officer [REDACTED] reviewed and approved the expedited removal.", "The subject was processed for expedited removal."])
    assert.equal(isPriorRemoval(t), false, t);
  for (const t of ["He was removed to Mexico on 03/02/2018.", "He had been ordered removed in 2012.", "Subject did not receive a bond and being a reinstate case."])
    assert.equal(isPriorRemoval(t), true, t);
});
test("fix 2 controls: should-not-flag and clean records gain no history finding (DS09 approval, DS10 processing, FS10 group member)", async () => {
  for (const p of ["eval/dev-synthetic/cases/DS09.json", "eval/dev-synthetic/cases/DS10.json", "eval/fresh/cases/FS10.json"]) {
    for (const facts of [EMPTY, new ModelError("timeout", "timeout", 1)]) {
      const r = await reviewCase(load(p), fake(facts));
      assert.ok(!r.findings.some((f) => /^F-HISTORY/.test(f.id)), p);
    }
  }
});

// ---- Fix 3: structured attribution, continuity and the exact-entry link ----
test("fix 3: a statement giving the subject's exact recorded entry date and manner is the subject's; its voluntary return is a prior encounter (F075-H S22)", async () => {
  const c = load("eval/fresh/cases/F075-H.json");
  const s22 = sid(c, "day after returning to Mexico");
  const out = attributeStatement(ss(c), s22, true, undefined, c);
  assert.equal(out.outcome, "supported");
  assert.match(out.rationale, /recorded entry date in full/);
  const r = await reviewCase(c, fake(EMPTY));
  assert.ok(r.findings.some((f) => f.id === "F-HISTORY-3" && f.evidence.some((e) => e.sentenceId === s22)));
});
test("fix 3 control: the same statement when its year differs from the form stays ambiguous and routed (F075-X)", async () => {
  const c = load("eval/fresh/cases/F075-X.json");
  const s22 = sid(c, "day after returning to Mexico");
  assert.equal(attributeStatement(ss(c), s22, true, undefined, c).outcome, "ambiguous");
  const r = await reviewCase(c, fake(EMPTY));
  assert.ok(!r.findings.some((f) => f.category === "inconsistency" && f.evidence.some((e) => e.sentenceId === s22)));
});
test("fix 3 controls: a companion stating the same full date, or a group entry in the account, blocks the exact-entry link", () => {
  const c = { facts: [{ path: "entry.date", status: "present", value: "05/05/2011, 1400" }, { path: "entry.manner", status: "present", value: "EWI AFOOT" }] } as CaseRecord;
  const a = seq("Two subjects were encountered.", "[REDACTED (b)(6), (b)(7)(C)] crossed the river illegally on May 5, 2011.", "[REDACTED (b)(6), (b)(7)(C)] also crossed illegally on 05/05/2011.");
  assert.equal(attributeStatement(a, "S2", true, undefined, c).outcome, "ambiguous");
  const b = seq("Two subjects were encountered.", "[REDACTED (b)(6), (b)(7)(C)] crossed the river illegally with three other individuals on May 5, 2011.");
  assert.equal(attributeStatement(b, "S2", true, undefined, c).outcome, "ambiguous");
  const ok = seq("Two subjects were encountered.", "[REDACTED (b)(6), (b)(7)(C)] crossed the river illegally on May 5, 2011.");
  assert.equal(attributeStatement(ok, "S2", true, undefined, c).outcome, "supported");
});
test("fix 3: attribution outcomes for pronoun continuity, transitions, mixed clauses, scope words and sections", () => {
  const cont = seq("Two subjects were encountered.", "The subject stated he crossed in 2014.", "He later said he used a visa.");
  const o = attributeStatement(cont, "S3", true);
  assert.equal(o.outcome, "supported");
  assert.deepEqual(o.sentenceIds, ["S2", "S3"]);
  assert.equal(attributeStatement(seq("Both subjects were arrested.", "He said he entered in 2014."), "S2", true).outcome, "ambiguous", "pronoun after a group");
  assert.equal(attributeStatement(seq("The subject stated he crossed in 2014.", "[REDACTED (b)(6), (b)(7)(C)] said he used a visa."), "S2", true).outcome, "ambiguous", "a new person is introduced");
  assert.equal(attributeStatement(seq("The subject stated he crossed in 2014.", "ENTRY:", "He used a visa."), "S3", true).outcome, "ambiguous", "a section heading ends the account");
  assert.equal(attributeStatement(seq("Both subjects were interviewed; one subject said he entered in 2014."), "S1", true, "he entered in 2014").outcome, "ambiguous", "mixed-person clauses");
  assert.equal(attributeStatement(seq("Each subject stated that he entered illegally."), "S1", true, "entered illegally").outcome, "supported", "each subject");
  assert.equal(attributeStatement(seq("One subject stated that he entered illegally."), "S1", true, "entered illegally").outcome, "ambiguous", "one subject");
  assert.equal(attributeStatement(seq("The last subject was in status."), "S1", true, "was in status").outcome, "ambiguous", "the last subject");
  assert.equal(attributeStatement(seq("The other subject was deported in 2012."), "S1", true, "was deported").outcome, "other", "the other subject");
  assert.equal(attributeStatement(seq("[REDACTED (b)(6), (b)(7)(C)] is a citizen of Mexico.", "[REDACTED (b)(6), (b)(7)(C)] crossed on May 5."), "S2", true).outcome, "ambiguous", "identical redaction markers are not one person");
});
test("fix 3 control: companions sharing a month and day, place and manner stay ambiguous (DS06)", async () => {
  const d = load("eval/dev-synthetic/cases/DS06.json");
  const r = await reviewCase(d, fake(EMPTY));
  assert.ok(!r.findings.some((f) => f.category === "inconsistency"));
});
test("full dates: explicit, month-name and 'the day after' forms", () => {
  assert.deepEqual(fullDates("the day after returning on 06/08/2011"), ["2011-06-09"]);
  assert.deepEqual(fullDates("on or about May 5, 2014"), ["2014-05-05"]);
  assert.deepEqual(fullDates("in May of 2014"), []);
});

// ---- Fix 4: history distinctions within one account and against the form ----
test("fix 4: one account that affirms and denies a prior removal is a within-account contradiction", () => {
  const f = accountConflicts(seq("[REDACTED (b)(6), (b)(7)(C)] was deported to Honduras in 2012.", "He stated that he has never been deported."));
  assert.equal(f.length, 1);
  assert.equal(f[0].id, "F-ACCOUNT-HISTORY");
});
test("fix 4: a form removal against the subject's affirmative denial is a conflict; an omission stays a clarity gap", async () => {
  const base = load("eval/fresh/cases/F055-H.json");
  const denial = { ...base, narrative: { text: `${base.narrative.text} The subject stated that he has never been deported.` } } as CaseRecord;
  const r1 = await reviewCase(denial, fake(EMPTY));
  assert.ok(r1.findings.some((f) => f.id === "F-HISTORY-4" && f.category === "inconsistency"));
  const r2 = await reviewCase(base, fake(EMPTY));
  assert.ok(r2.findings.some((f) => f.id === "F-HISTORY-2" && f.category === "unclear"));
  assert.ok(!r2.findings.some((f) => f.id === "F-HISTORY-4"));
});
test("fix 4 controls: a criminal arrest by police is not a prior immigration encounter; a voluntary return is not a removal", () => {
  assert.equal(isPriorImmigrationEncounter("He was previously arrested by the Detroit Police Department for theft.", 2017), false);
  assert.equal(isPriorRemoval("He was granted a voluntary return to Mexico in 2010."), false);
  assert.equal(isPriorImmigrationEncounter("He was granted a voluntary return to Mexico in 2010.", 2017), true);
});

// ---- Fact-call reliability: a valid but empty extraction is not a completed check ----
test("reliability: an empty extraction for a narrative that describes a U.S. entry is retried within the budget", async () => {
  let n = 0;
  const good = JSON.stringify({ entry_statements: [ent(s41, "claims to have crossed the Mexico-United States border", "United States")] });
  const complete: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? (n++ === 0 ? EMPTY : good) : REVIEW, attempts: 1 });
  const r = await reviewCase(amb, complete);
  const first = r.calls.find((x) => x.role === "facts")!;
  assert.equal(first.status, "invalid_output");
  assert.match(first.error ?? "", /no entry statements/);
  assert.equal(r.calls.find((x) => x.role === "facts-retry")?.status, "ok");
  assert.ok(!factsFailed(r));
});
test("reliability: if the retry is empty too, the check is reported as not completed, never as complete", async () => {
  const r = await reviewCase(amb, fake(EMPTY));
  assert.ok(factsFailed(r));
  assert.equal(r.completion?.status, "partial");
});
test("reliability control: an empty extraction is complete when the narrative describes no entry into the United States", async () => {
  const c0 = load("eval/dev-synthetic/cases/DS09.json");
  const r = await reviewCase(c0, fake(EMPTY));
  assert.ok(!factsFailed(r), "a port-of-entry application with no entry wording needs no entry statement");
});
