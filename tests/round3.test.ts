// Round 3 regression tests: defects found by the independent offline review of 033a102. Each "defect" test fails on
// 033a102; the controls guard behaviour that must not change. The model is replaced by a fake, so these run offline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, attributeStatement, compareFacts, accountConflicts, fullDates, isPriorRemoval, describesUsEntry, nonUsEntrySentences, eventParticipant, EMPTY_FACTS, type FactsOutput } from "../lib/review/facts";
import { ModelError } from "../lib/llm";
import type { CaseRecord, Sentence } from "../lib/types";

const S = (text: string, id: string): Sentence => ({ id, text, start: 0, end: text.length, page: 1 } as Sentence);
const seq = (...t: string[]) => t.map((x, i) => S(x, `S${i + 1}`));
const template = JSON.parse(readFileSync("eval/cases/C013-X1.json", "utf8")) as CaseRecord;
/** A synthetic record: the template's structure with this narrative and these form values. */
const record = (text: string, values: Record<string, string>): CaseRecord => ({
  ...template, id: "SYN", narrative: { ...template.narrative, text, pageSpans: undefined } as CaseRecord["narrative"],
  facts: template.facts.map((f) => (f.path in values ? { ...f, value: values[f.path], status: "present" } : f)),
});
const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const fake = (facts: string | Error): Complete => async (system) => {
  const v = system === FACTS_SYSTEM_PROMPT ? facts : REVIEW;
  if (v instanceof Error) throw v;
  return { text: v, attempts: 1 };
};
const ids = (fs: { id: string }[]) => fs.map((f) => f.id);
const facts = (f: Partial<FactsOutput>): FactsOutput => ({ ...EMPTY_FACTS, ...f } as FactsOutput);
const TWO = "Agents encountered [REDACTED (b)(6), (b)(7)(C)] and [REDACTED (b)(6), (b)(7)(C)] near the river.";
const EWI_FORM = record("x", { "entry.date": "06/09/2011", "entry.manner": "EWI", "history.immigration_record": "NEGATIVE" });

// ---- 1. Event-scoped attribution; real calendar dates ----
test("1: a full date that belongs to another event in the sentence does not link an unattributed entry to the subject", () => {
  const s = seq(TWO, "[REDACTED (b)(6), (b)(7)(C)] entered illegally in 2014; he was married on June 9, 2011 and was removed in 2010.");
  assert.equal(attributeStatement(s, "S2", true, undefined, EWI_FORM).outcome, "ambiguous");
  const andMarried = seq(TWO, "[REDACTED (b)(6), (b)(7)(C)] crossed the river illegally in 2014 and was married on June 9, 2011.");
  assert.equal(attributeStatement(andMarried, "S2", true, undefined, EWI_FORM).outcome, "ambiguous", "a date after 'and was married' is the marriage's");
  assert.equal(attributeStatement(seq(TWO, "[REDACTED (b)(6), (b)(7)(C)] stated that his wife crossed the river illegally on June 9, 2011."), "S2", true, undefined, EWI_FORM).outcome, "ambiguous", "a relative's entry");
});
// Changed in the accuracy iteration 1 audit: these were positive controls for the exact-entry link (the subject's full
// recorded entry date and manner). That link inferred identity from matching values and was removed; the same
// statements are now ambiguous (routed), and identity needs the text itself (a named subject, one person, or a pronoun
// chain to the subject's designation).
test("1 controls: a statement matching the form's full entry date and manner is not thereby the subject's", () => {
  assert.equal(attributeStatement(seq(TWO, "[REDACTED (b)(6), (b)(7)(C)] entered the United States illegally on June 9, 2011 by wading the river."), "S2", true, undefined, EWI_FORM).outcome, "ambiguous");
  assert.equal(attributeStatement(seq(TWO, "On June 9, 2011, [REDACTED (b)(6), (b)(7)(C)] crossed the river illegally."), "S2", true, undefined, EWI_FORM).outcome, "ambiguous");
  const nim = record("x", { "entry.date": "12/23/2015", "entry.manner": "NIM" });
  assert.equal(attributeStatement(seq(TWO, "[REDACTED (b)(6), (b)(7)(C)] arrived at Miami on 12/23/2015 and was admitted as a B2 Visitor."), "S2", true, undefined, nim).outcome, "ambiguous");
  // Positive controls: the text itself ties the statement to the subject.
  assert.equal(attributeStatement(seq(TWO, "The subject entered the United States illegally on June 9, 2011 by wading the river."), "S2", true, undefined, EWI_FORM).outcome, "supported");
  assert.equal(attributeStatement(seq("[REDACTED (b)(6), (b)(7)(C)] entered the United States illegally on June 9, 2011 by wading the river."), "S1", false, undefined, EWI_FORM).outcome, "supported", "only one person is described");
});
test("1: impossible calendar dates are rejected, not moved to another day", () => {
  assert.deepEqual(fullDates("He entered on 02/30/2011."), []);
  assert.deepEqual(fullDates("He entered on 13/01/2011."), []);
  assert.deepEqual(fullDates("He entered on June 31, 2011."), []);
  assert.deepEqual(fullDates("He entered the day after 02/30/2011."), []);
  assert.deepEqual(fullDates("He entered on 02/29/2011."), [], "2011 is not a leap year");
});
test("1 controls: valid dates, leap days and 'the day after' roll-over", () => {
  assert.deepEqual(fullDates("He entered on 02/29/2012."), ["2012-02-29"]);
  assert.deepEqual(fullDates("He entered the day after 12/31/2011."), ["2012-01-01"]);
  assert.deepEqual(fullDates("He entered the day after 06/08/2011."), ["2011-06-09"]);
  assert.deepEqual(fullDates("He entered on May 5, 2014."), ["2014-05-05"]);
});

// ---- 2. History polarity and chronology ----
test("2: denials with longer auxiliaries are not prior removals and raise no F-HISTORY against NEGATIVE", () => {
  for (const t of ["The subject has not at any time been deported.", "The subject has never at any point been formally removed.", "The subject hasn't been deported.", "There is no record of removal for the subject."])
    assert.equal(isPriorRemoval(t), false, t);
  const c = record("x", { "history.immigration_record": "NEGATIVE" });
  assert.ok(!ids(compareFacts(c, seq("The subject has not at any time been deported."), EMPTY_FACTS, false).findings).includes("F-HISTORY"));
});
test("2: a dated or 'previous' processing action is not a completed prior removal", () => {
  for (const t of ["On 03/04/2019 the subject was processed for expedited removal.", "In 2015 the subject was placed in removal proceedings.", "The subject was previously served with Form I-860 in 2016."])
    assert.equal(isPriorRemoval(t), false, t);
  const c = record("x", { "history.immigration_record": "NEGATIVE" });
  assert.ok(!ids(compareFacts(c, seq("On 03/04/2019 the subject was processed for expedited removal."), EMPTY_FACTS, false).findings).includes("F-HISTORY"));
});
test("2: an affirmative removal in a mixed sentence is kept", () => {
  assert.equal(isPriorRemoval("The subject was not deported in 2015, but he was removed in 2017."), true);
  assert.equal(isPriorRemoval("He has never been deported; however, he was removed to Mexico in 2012."), true);
  const c = record("x", { "history.immigration_record": "NEGATIVE" });
  assert.ok(ids(compareFacts(c, seq("The subject was not deported in 2015, but he was removed in 2017."), EMPTY_FACTS, false).findings).includes("F-HISTORY"));
});
test("2 controls: completed removals and reinstatements still count; negation of another verb is not a denial", () => {
  for (const t of ["Subject was previously removed to Mexico on 03/04/2019.", "Subject was processed for expedited removal and removed to Mexico on 03/04/2019.",
    "Subject did not receive a bond due to him being a reinstate case.", "He did not resist and was removed in 2012.", "He has a prior expedited removal from 2014."])
    assert.equal(isPriorRemoval(t), true, t);
  for (const t of ["He was offered a Stipulated Removal, which he declined.", "He will be processed for expedited removal."]) assert.equal(isPriorRemoval(t), false, t);
});

// ---- 3. Extraction-dependent suppression: the extractor's "other" is checked against the source ----
const EXPLICIT = "Border Patrol Agents encountered the subject and another man near Laredo, Texas. The subject was removed to Mexico on 05/01/2015 and was later processed as a reinstatement. The other man stated he had never been arrested.";
const S2 = "The subject was removed to Mexico on 05/01/2015 and was later processed as a reinstatement.";
const removal = (person: string, id = "S2", quote = S2) => JSON.stringify({ entry_statements: [], removal_statements: [{ sentence_id: id, quote, person }] });
const extractions: [string, string | Error][] = [
  ["accurate", removal("subject")], ["omitted", JSON.stringify({ entry_statements: [], removal_statements: [] })],
  ["misattributed (other)", removal("other")], ["invalid output", "not json"], ["failed (timeout)", new ModelError("timeout", "timeout", 1)],
];
for (const [name, f] of extractions)
  test(`3: an explicitly-subject removal conflicts with NEGATIVE whatever the extraction (${name})`, async () => {
    const r = await reviewCase(record(EXPLICIT, { "history.immigration_record": "NEGATIVE", "entry.date": "Unknown Date, Unknown Time" }), fake(f));
    assert.ok(r.findings.some((x) => x.id === "F-HISTORY" && x.evidence.some((e) => e.sentenceId === "S2")));
  });
test("3 controls: an unattributed removal in a multi-person narrative is never made the subject's, whatever the extractor says", async () => {
  const text = "Border Patrol Agents encountered two subjects near Laredo, Texas. Both subjects were transported to the station. [REDACTED (b)(6), (b)(7)(C)] was removed to Mexico on 05/01/2015.";
  const c = record(text, { "history.immigration_record": "NEGATIVE" });
  for (const person of ["other", "unclear", "subject"]) {
    const r = await reviewCase(c, fake(removal(person, "S3", "was removed to Mexico on 05/01/2015")));
    assert.ok(!r.findings.some((x) => x.id === "F-HISTORY"), person);
  }
});
test("3 controls: the extractor's 'other' stands for a relative named through the subject, and for the other subject", () => {
  const c = record("x", { "history.immigration_record": "NEGATIVE" });
  const rel = seq("The subject's brother was removed to Mexico in 2015.");
  assert.ok(!ids(compareFacts(c, rel, facts({ removal_statements: [{ sentence_id: "S1", quote: rel[0].text, person: "other" }] as never }), false).findings).includes("F-HISTORY"));
  const oth = seq("The other subject was removed to Mexico in 2015.");
  assert.ok(!ids(compareFacts(c, oth, facts({ removal_statements: [{ sentence_id: "S1", quote: oth[0].text, person: "other" }] as never }), false).findings).includes("F-HISTORY"));
});
test("3: an explicitly-subject entry labelled 'other' by the extractor is still compared with the form", () => {
  const c = record("x", { "entry.date": "06/09/2011", "entry.manner": "EWI" });
  const s = seq(TWO, "The subject entered the United States illegally in 2014.");
  const f = facts({ entry_statements: [{ sentence_id: "S2", quote: "The subject entered the United States illegally in 2014.", event: "us_entry", country: "United States", year: 2014, manner: "without_inspection", person: "other" }] as never });
  assert.ok(ids(compareFacts(c, s, f, true).findings).includes("F-ENTRY-DATE"));
});

// ---- 4. Person transitions inside continuous accounts ----
const INTRO = "The subject was interviewed by the officer.";
const VISA = "He entered the United States on a visa in 2014.";
test("4: an entry reported for a relative, a companion or a group is not compared with the speaker's own entry", () => {
  for (const t of ["He stated that his wife entered the United States illegally in 2011.", "He said, \"My brother crossed the river illegally in 2011.\"",
    "He stated that his companion crossed into the United States illegally in 2011.", "He stated that they crossed into the United States illegally in 2011."])
    assert.deepEqual(ids(accountConflicts(seq(INTRO, t, VISA))), [], t);
});
test("4 controls: the speaker's own reported or quoted entry still conflicts within the account", () => {
  for (const t of ["He stated that he entered the United States illegally in 2011.", "He said, \"I crossed the river illegally in 2011.\"", "He stated that he and his wife crossed the river illegally in 2011."])
    assert.deepEqual(ids(accountConflicts(seq(INTRO, t, VISA))), ["F-ACCOUNT"], t);
});
test("4: a sentence naming the subject that reports a relative's removal is not the subject's removal", () => {
  const c = record("x", { "history.immigration_record": "NEGATIVE" });
  assert.ok(!ids(compareFacts(c, seq("Subject stated that his brother was deported in 2012."), EMPTY_FACTS, false).findings).includes("F-HISTORY"));
  assert.equal(attributeStatement(seq("Subject stated that his brother was deported in 2012."), "S1", true).outcome, "other");
  assert.ok(ids(compareFacts(c, seq("Subject stated that he was deported in 2012."), EMPTY_FACTS, false).findings).includes("F-HISTORY"), "control: his own");
});
test("4 controls: participants", () => {
  const p = (t: string, verb: string) => eventParticipant(t, t.indexOf(verb));
  assert.equal(p("He stated that his wife entered illegally.", "entered"), "other");
  assert.equal(p("His companion, [REDACTED (b)(6), (b)(7)(C)], was deported in 2013.", "deported"), "other");
  assert.equal(p("He and his wife crossed the river.", "crossed"), "self");
  assert.equal(p("The subject was removed in 2015.", "removed"), "self");
  assert.equal(p("They crossed the river.", "crossed"), "group");
  assert.equal(p("Records showed that one of the four men had been deported.", "deported"), "unknown", "could be the subject");
  assert.equal(p("[REDACTED (b)(6), (b)(7)(C)] entered illegally.", "entered"), "unknown");
});
test("4 control: an indefinite group member's removal is still routed (it could be the subject's)", () => {
  const c = record("x", { "history.immigration_record": "NEGATIVE" });
  const s = seq("Agents encountered four men near the river.", "All four subjects were transported to the station.", "Records checks showed that one of the four men had been deported to Honduras in 2015.");
  const r = compareFacts(c, s, EMPTY_FACTS, true);
  assert.deepEqual(r.unattributed.map((u) => u.sentenceId), ["S3"]);
  assert.ok(!ids(r.findings).includes("F-HISTORY"));
});

// ---- 5. Direction and destination ----
test("5: leaving the United States, or arriving at a U.S. institution abroad, is not a U.S. entry", () => {
  for (const t of ["He crossed from the United States into France in 2014.", "He arrived at the United States embassy in Paris in 2014.", "He came from the U.S. to Canada in 2016.",
    "He arrived at the U.S. Consulate in Monterrey.", "Agent [REDACTED] identified himself as a United States Border Patrol Agent."])
    assert.equal(describesUsEntry(seq(t)), false, t);
  assert.deepEqual(ids(accountConflicts(seq(INTRO, "He entered the United States illegally in 2011.", "He crossed from the United States into France in 2014."))), []);
  // The extractor's correct foreign-entry or travel label is no longer overridden by the words "United States".
  const ex = (text: string, event: string, country: string) => [...nonUsEntrySentences(facts({ entry_statements: [{ sentence_id: "S1", quote: text, event, country, year: 2014, manner: "unknown", person: "unclear" }] as never }), seq(text))];
  assert.deepEqual(ex("He crossed from the United States into France in 2014.", "other_country_entry", "France"), ["S1"]);
  assert.deepEqual(ex("He arrived at the United States embassy in Paris in 2014.", "travel", "France"), ["S1"]);
});
test("5 controls: entries into the United States are still recognised", () => {
  for (const t of ["He crossed from Mexico into the United States in 2014.", "He came to the United States from Mexico in 2014.", "He crossed the Mexico-United States border at age five.", "He entered the United States near El Paso."])
    assert.equal(describesUsEntry(seq(t)), true, t);
});
test("5 controls: the extractor's departure label stays excluded; a U.S. entry wrongly labelled foreign does not", () => {
  const ex = (text: string, event: string, country: string) => [...nonUsEntrySentences(facts({ entry_statements: [{ sentence_id: "S1", quote: text, event, country, year: 2014, manner: "unknown", person: "unclear" }] as never }), seq(text))];
  assert.deepEqual(ex("He departed the United States for Mexico in 2014.", "departure", "Mexico"), ["S1"]);
  assert.deepEqual(ex("He crossed the river into the United States near Laredo in 2014.", "other_country_entry", "Mexico"), []);
});

// ---- 6. Provenance follows the information the finding needs ----
test("6: history findings decided by the source text and the form are rule-based; entry comparisons that need the extractor stay model-based", () => {
  const c = record("x", { "history.immigration_record": "NEGATIVE", "encounter.date_time": "05/01/2019 1200", "entry.date": "06/09/2011", "entry.manner": "EWI" });
  const src = (r: { findings: { id: string; source: string }[] }, id: string) => r.findings.find((x) => x.id === id)?.source;
  assert.equal(src(compareFacts(c, seq("The subject was removed to Mexico in 2015."), EMPTY_FACTS, false), "F-HISTORY"), "rule");
  const listed = facts({ removal_statements: [{ sentence_id: "S1", quote: "The subject was removed to Mexico in 2015.", person: "subject" }] as never });
  assert.equal(src(compareFacts(c, seq("The subject was removed to Mexico in 2015."), listed, false), "F-HISTORY"), "rule", "the extractor also listing it does not make it required");
  assert.equal(src(compareFacts(c, seq("The subject was previously apprehended by Border Patrol in 2012 and granted voluntary return."), EMPTY_FACTS, false), "F-HISTORY-3"), "rule");
  const pos = record("x", { "history.immigration_record": "POSITIVE - removed 2012" });
  assert.equal(src(compareFacts(pos, seq("The subject was encountered near Laredo."), EMPTY_FACTS, false), "F-HISTORY-2"), "rule");
  const year = facts({ entry_statements: [{ sentence_id: "S1", quote: "The subject entered the United States illegally in 2014.", event: "us_entry", country: "United States", year: 2014, manner: "without_inspection", person: "subject" }] as never });
  assert.equal(src(compareFacts(c, seq("The subject entered the United States illegally in 2014."), year, false), "F-ENTRY-DATE"), "model", "control: needs the extracted year");
});

// ---- 7. The subject's denial alongside a companion's removal ----
test("7: a companion's removal does not suppress the subject's denial against a form that records a removal", () => {
  const c = record("x", { "history.immigration_record": "POSITIVE - removed 2012" });
  const s = seq("Agents encountered the subject and his companion near Laredo.", "The subject stated that he has never been deported.", "His companion, [REDACTED (b)(6), (b)(7)(C)], was deported to Mexico in 2013.");
  assert.ok(ids(compareFacts(c, s, EMPTY_FACTS, true).findings).includes("F-HISTORY-4"));
  // A relative's denial is not the subject's.
  assert.ok(!ids(compareFacts(c, seq("Agents encountered the subject near Laredo.", "The subject stated that his brother has never been deported."), EMPTY_FACTS, false).findings).includes("F-HISTORY-4"));
});
test("7 control: the subject's own removal elsewhere raises no F-HISTORY-4", () => {
  const c = record("x", { "history.immigration_record": "POSITIVE - removed 2012" });
  assert.ok(!ids(compareFacts(c, seq("Agents encountered the subject near Laredo.", "The subject stated that he has never been deported.", "The subject was deported to Mexico in 2013."), EMPTY_FACTS, false).findings).includes("F-HISTORY-4"));
});
