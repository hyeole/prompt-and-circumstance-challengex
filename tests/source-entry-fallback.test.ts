// When the fact extraction does not complete, the entry comparison runs on U.S. entry statements read from the source
// text (person–event analysis) instead of not running at all. Findings are rule-based; attribution rules are unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { FACTS_SYSTEM_PROMPT, sourceEntryStatements } from "../lib/review/facts";
import { reviewCase, type Complete } from "../lib/review/review";
import { ModelError } from "../lib/llm";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const R = "[REDACTED (b)(6), (b)(7)(C)]";
const load = (id: string) => JSON.parse(readFileSync(["eval/cases", "eval/fresh/cases", "eval/gen-v1/cases", "eval/dev-synthetic/cases"].map((d) => `${d}/${id}.json`).find(existsSync)!, "utf8")) as CaseRecord;
const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const timeout: Complete = async (system) => {
  if (system === FACTS_SYSTEM_PROMPT) throw new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1);
  return { text: REVIEW, attempts: 1 };
};
const S = (t: string) => splitSentences(t);
const withText = (c: CaseRecord, from: RegExp | string, to: string) => ({ ...c, narrative: { text: c.narrative.text.replace(from, to) } }) as CaseRecord;

test("C037-X1: the fact call times out, and the entry-date conflict in S21 is still found, by a rule", async () => {
  const c = load("C037-X1");
  const r = await reviewCase(c, timeout);
  const f = r.findings.find((x) => x.id === "F-ENTRY-DATE")!;
  assert.ok(f, "before this change no entry comparison ran without an extraction");
  assert.equal(f.source, "rule");
  const s21 = splitSentences(c.narrative.text, c.narrative.pageSpans).find((x) => x.text.includes("06/15/2012"))!.id;
  assert.deepEqual(f.evidence.map((e) => e.sentenceId ?? e.fieldPath), [s21, "entry.date"]);
  assert.ok(f.evidence.every((e) => e.verified));
  assert.equal(r.completion?.status, "partial", "the review is still reported as partial");
  assert.match(r.completion!.failed[0].reason, /used only statements read from the source text by rules/);
});

test("the same narrative with the form's year in S21: no finding (agreement)", async () => {
  const r = await reviewCase(withText(load("C037-X1"), "06/15/2012", "06/15/2009"), timeout);
  assert.ok(!r.findings.some((x) => x.id.startsWith("F-ENTRY")));
});

test("multi-person narratives: an unattributed account is routed, never a finding (F039-X, F010-X, C001-X1)", async () => {
  for (const id of ["F039-X", "F010-X", "C001-X1"]) {
    const r = await reviewCase(load(id), timeout);
    assert.ok(!r.findings.some((x) => x.id.startsWith("F-ENTRY")), id);
    // F010-X's S34 crosses "the border" without naming the United States: not read as a U.S. entry, so not routed either.
    if (id !== "F010-X") assert.ok(r.humanReview.accounts?.some((a) => a.fieldPath === "entry.date"), `${id}: routed`);
  }
});

test("source statements: first or previous entries, entries elsewhere, denials and third parties are not the last U.S. entry", () => {
  const read = (t: string) => sourceEntryStatements(S(t)).map((e) => [e.sentence_id, e.year, e.person]);
  assert.deepEqual(read("He also stated that he first entered the United States by walking across the border near El Paso, Texas in 2001."), []);
  assert.deepEqual(read("He previously entered the United States in 2003 near Laredo, Texas."), []);
  assert.deepEqual(read("He entered Mexico illegally in 2014 near Tapachula."), []);
  assert.deepEqual(read("He never entered the United States legally."), []);
  assert.deepEqual(read(`${R} stated that his brother entered the United States illegally in 2010.`), [["S1", 2010, "other"]]);
  assert.deepEqual(read("Subject last entered the United States illegally near Nogales, Arizona in 2014."), [["S1", 2014, "subject"]]);
  assert.deepEqual(read(`${R} stated that he crossed the US/MEXICO Border illegally, into Naco, Arizona, on the afternoon of 06/15/2012.`), [["S1", 2012, "unclear"]]);
  // Two years in the clause: the year is not taken.
  assert.deepEqual(read("Subject entered the United States in 2014 after leaving Honduras in 2013."), [["S1", null, "subject"]]);
});

test("a third party's entry year differing from the form is not compared (single-person narrative)", async () => {
  const c = withText(load("C037-X1"), /\[REDACTED[^\]]*\] stated that he and five others crossed/, `${R} stated that his brother crossed`);
  const r = await reviewCase(c, timeout);
  assert.ok(!r.findings.some((x) => x.id === "F-ENTRY-DATE"));
});
