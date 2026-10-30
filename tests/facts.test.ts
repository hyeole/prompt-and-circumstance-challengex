import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compareFacts, formMannerCategory, formYear } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const load = (id: string) => JSON.parse(readFileSync(`eval/cases/${id}.json`, "utf8")) as CaseRecord;
const sid = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text, c.narrative.pageSpans).find((s) => s.text.includes(needle))!.id;

test("form code helpers", () => {
  assert.equal(formMannerCategory("EWI AFOOT"), "without_inspection");
  assert.equal(formMannerCategory("PWA (AFOOT)"), "without_inspection");
  assert.equal(formMannerCategory("NIM"), "admitted");
  assert.equal(formMannerCategory("H2B"), "admitted");
  assert.equal(formMannerCategory("OA"), undefined);
  assert.equal(formYear("05/15/2014, 2200"), 2014);
  assert.equal(formYear("Unknown Date, Unknown Time"), undefined);
});

test("entry year conflicting with the form is flagged with both sources", () => {
  const c = load("C037-X1");
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const r = compareFacts(c, ss, { status_statements: [], entry_statements: [{ sentence_id: sid(c, "06/15/2012"), quote: "on the afternoon of 06/15/2012", year: 2012, manner: "without_inspection", person: "subject" }], removal_statements: [] });
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].id, "F-ENTRY-DATE");
  assert.deepEqual(r.findings[0].evidence.map((e) => e.kind), ["sentence", "field"]);
  assert.ok(r.findings[0].needsHumanReview);
});

test("same year as the form is not flagged", () => {
  const c = load("C037");
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const r = compareFacts(c, ss, { status_statements: [], entry_statements: [{ sentence_id: sid(c, "06/15/2009."), quote: "on the afternoon of 06/15/2009", year: 2009, manner: "without_inspection", person: "subject" }], removal_statements: [] });
  assert.equal(r.findings.length, 0);
});

test("admission account conflicts with an EWI form code", () => {
  const c = load("C003-AMB");
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const r = compareFacts(c, ss, { status_statements: [], entry_statements: [{ sentence_id: sid(c, "border crossing card"), quote: "entered at the Nogales port of entry using a border crossing card", year: null, manner: "admitted", person: "subject" }], removal_statements: [] });
  assert.equal(r.findings[0]?.id, "F-ENTRY-MANNER");
});

test("statements about another person and unverifiable quotes are ignored", () => {
  const c = load("C037-X1");
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const r = compareFacts(c, ss, { status_statements: [], entry_statements: [
    { sentence_id: sid(c, "06/15/2012"), quote: "on the afternoon of 06/15/2012", year: 2012, manner: "without_inspection", person: "other" },
    { sentence_id: sid(c, "06/15/2012"), quote: "words that are not in the sentence", year: 2012, manner: "admitted", person: "subject" },
  ], removal_statements: [] });
  assert.equal(r.findings.length, 0);
  assert.equal(r.dropped, 1);
});

test("prior removal vs NEGATIVE immigration record", () => {
  const c = load("C013-X1");
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const r = compareFacts(c, ss, { status_statements: [], entry_statements: [], removal_statements: [{ sentence_id: sid(c, "received an Expedited Removal"), quote: "received an Expedited Removal", person: "subject" }] });
  assert.equal(r.findings[0]?.id, "F-HISTORY");
});

import { checkChargeRequirement } from "../lib/review/facts";

test("overstay charge on an EWI record is a likely mismatch; EWI charge is not", () => {
  const c = load("C001-CIT");
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const none = { status_statements: [], entry_statements: [], removal_statements: [] };
  const r = checkChargeRequirement(c, ss, none, { entryManner: "admitted" });
  assert.ok(r);
  assert.equal(r!.evidence[0].fieldPath, "entry.manner");
  assert.equal(checkChargeRequirement(c, ss, none, { entryManner: "without_inspection" }), null);
});

test("reentry-after-removal charge needs a prior removal", () => {
  const c = load("C003-CIT");
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
  assert.ok(checkChargeRequirement(c, ss, { status_statements: [], entry_statements: [], removal_statements: [] }, { priorRemoval: true }));
  const c13 = load("C013");
  const s13 = splitSentences(c13.narrative.text, c13.narrative.pageSpans);
  const id = s13.find((s) => s.text.includes("received an Expedited Removal"))!.id;
  assert.equal(checkChargeRequirement(c13, s13, { status_statements: [], entry_statements: [], removal_statements: [{ sentence_id: id, quote: "received an Expedited Removal", person: "subject" }] }, { priorRemoval: true }), null);
});

test("a supporting narrative statement prevents a mismatch even if another statement conflicts", () => {
  const c = load("C003-AMB");
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const crossed = ss.find((s) => s.text.includes("crossed the Mexico-United States border"))!.id;
  const card = ss.find((s) => s.text.includes("border crossing card"))!.id;
  const facts = { status_statements: [], entry_statements: [
    { sentence_id: crossed, quote: "crossed the Mexico-United States border", year: null, manner: "without_inspection" as const, person: "subject" as const },
    { sentence_id: card, quote: "using a border crossing card", year: null, manner: "admitted" as const, person: "subject" as const },
  ], removal_statements: [] };
  assert.equal(checkChargeRequirement(c, ss, facts, { entryManner: "without_inspection" }), null);
});
