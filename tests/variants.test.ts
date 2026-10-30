// Variants found by the independent review of ccc60d7 + b66a8cc. Each "defect" test fails on b66a8cc; the controls
// pass on both. Offline (fake model).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { runRules } from "../lib/review/rules";
import { FACTS_SYSTEM_PROMPT, accountConflicts, compareFacts, isPriorRemoval, EMPTY_FACTS } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import type { CaseRecord, Sentence } from "../lib/types";

const S = (text: string, id: string): Sentence => ({ id, text, start: 0, end: text.length, page: 1 } as Sentence);
const seq = (...t: string[]) => t.map((x, i) => S(x, `S${i + 1}`));
const template = JSON.parse(readFileSync("eval/cases/C013-X1.json", "utf8")) as CaseRecord;
const record = (text: string, values: Record<string, string> = {}): CaseRecord => ({
  ...template, id: "SYN", narrative: { ...template.narrative, text, pageSpans: undefined } as CaseRecord["narrative"],
  facts: template.facts.map((f) => (f.path in values ? { ...f, value: values[f.path], status: "present" } : f)),
});
const NEG = record("x", { "history.immigration_record": "NEGATIVE" });
const history = (...t: string[]) => compareFacts(NEG, seq(...t), EMPTY_FACTS, false).findings.some((f) => f.id === "F-HISTORY");
const multi = (text: string) => runRules(record(text), splitSentences(text)).notes.length > 0;
const ids = (fs: { id: string }[]) => fs.map((f) => f.id);
const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const EMPTY = JSON.stringify({ entry_statements: [], removal_statements: [] });
const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? EMPTY : REVIEW, attempts: 1 });
const M = "[REDACTED (b)(6), (b)(7)(C)]";
const INTRO = "The subject was interviewed by the officer.", VISA = "He entered the United States on a visa in 2014.";

test("1: present-tense and progressive processing for removal is not a completed prior removal", () => {
  for (const t of ["The subject is processed for expedited removal.", "The subject is being processed for expedited removal.",
    "The subjects are being processed for expedited removal.", "The subject is being processed as an expedited removal."])
    assert.equal(history(t), false, t);
});
test("1 controls: past processing stays excluded; a removal stated beside the processing still counts", () => {
  assert.equal(history("The subject was processed for expedited removal."), false);
  assert.equal(history("The subject has been processed for expedited removal."), false);
  assert.equal(history("The subject is being processed for expedited removal and was removed to Mexico in 2012."), true);
  assert.equal(history("The subject was previously removed to Mexico."), true);
});

test("2: an entry reported for 'the other subject', 'the second subject' or 'another subject' is not the speaker's", () => {
  for (const t of ["He stated that the other subject entered the United States illegally in 2011.", "He stated that the second subject entered the United States illegally in 2011.",
    "He stated that another subject crossed the river illegally in 2011.", `He stated that ${M} crossed the river illegally in 2011.`])
    assert.deepEqual(ids(accountConflicts(seq(INTRO, t, VISA))), [], t);
});
test("2 controls: the speaker's own reported entry, 'the subject', negated and modal verbs, and distributive scope", () => {
  for (const t of ["He stated that he entered the United States illegally in 2011.", "He stated that the subject entered the United States illegally in 2011.",
    "He later told agents that he claims to have crossed the river illegally in 2011.", "He stated that he did not cross through a designated Port of Entry in 2011."])
    assert.deepEqual(ids(accountConflicts(seq(INTRO, t, VISA))), ["F-ACCOUNT"], t);
  assert.equal(history("The other subject was removed to Mexico in 2015."), false);
  assert.equal(history("Both subjects were removed to Mexico in 2015."), true, "distributive: includes the subject");
});

test("3: numeric counts and an encountered companion or relative make a multi-person narrative", async () => {
  for (const t of [`Agents encountered 2 subjects near Laredo. ${M} stated that he was removed to Mexico in 2015.`,
    `Agents apprehended 3 individuals near the river. ${M} stated that he was removed to Mexico in 2015.`,
    `Agents encountered the subject and his companion near Laredo. ${M} was removed to Mexico in 2015.`,
    `Agents encountered ${M} and her brother near Laredo. ${M} was removed to Mexico in 2015.`])
    assert.equal(multi(t), true, t);
  const r = await reviewCase(record(`Agents encountered 2 subjects near Laredo. ${M} stated that he was removed to Mexico in 2015.`, { "history.immigration_record": "NEGATIVE" }), fake);
  assert.ok(!r.findings.some((f) => f.id === "F-HISTORY"));
});
test("3 controls: relatives merely mentioned, officers, '1 subject' and other numbers stay single-person", () => {
  for (const t of ["Agents encountered the subject near Laredo. The subject stated that his wife and children live in Houston.",
    `Agent ${M} and Agent ${M} encountered the subject near Laredo. The subject stated that he entered illegally in 2014.`,
    "Agents encountered the subject near mile marker 2. The subject stated that he entered illegally in 2014.",
    "Agents encountered 1 subject near Laredo. The subject stated that he entered illegally in 2014.",
    `Agents encountered the subject and Agent ${M} transported him. The subject stated that he entered illegally in 2014.`])
    assert.equal(multi(t), false, t);
});

test("4: a removal stated in its own coordinated clause is kept beside a denial; one negation over 'or' stays a denial", () => {
  assert.equal(isPriorRemoval("The subject was not removed to Mexico and was removed to Honduras in 2012."), true);
  assert.equal(history("The subject was not removed to Mexico and was removed to Honduras in 2012."), true);
  assert.equal(isPriorRemoval("The subject has never been arrested or removed."), false);
});
test("4 controls: coordinated denials stay denials; other verbs negated beside a removal", () => {
  for (const t of ["The subject was not removed and was not deported.", "The subject was never deported and was released on his own recognizance.", "The subject was not removed and has no prior deportations."])
    assert.equal(isPriorRemoval(t), false, t);
  for (const t of ["The subject was not arrested and was deported in 2012.", "He did not resist and was removed in 2012."]) assert.equal(isPriorRemoval(t), true, t);
});
