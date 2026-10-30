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

test("fact schema: a year given as text is parsed when it has one 4-digit year, otherwise unknown (runs 04-38-25 / 04-48-10)", async () => {
  const { FactsOutput } = await import("../lib/review/facts");
  const parse = (year: unknown) => FactsOutput.parse({ entry_statements: [{ sentence_id: "S1", quote: "q", year, manner: "unknown", person: "unclear" }], removal_statements: [] }).entry_statements[0].year;
  assert.equal(parse("2004"), 2004);
  assert.equal(parse("around 2004"), 2004);
  assert.equal(parse("2004 or 2005"), null);
  assert.equal(parse("unknown"), null);
  assert.equal(parse(2011), 2011);
});

// ---- Refinement: "subject" wording is resolved by its scope, each form tested separately ----
import { attribution } from "../lib/review/facts";
const att = (text: string) => attribution({ id: "S1", text, start: 0, end: text.length } as never, "unclear");
test("scope: 'the subject' and a bare 'Subject' are this record's subject", () => {
  assert.equal(att("The subject stated that he entered in 2015."), "subject");
  assert.equal(att("Subject arrived at Miami on 12/23/2015."), "subject");
});
test("scope: 'each subject' and 'every subject' include this subject", () => {
  assert.equal(att("Each subject was previously removed to Mexico."), "subject");
  assert.equal(att("Every subject stated that he crossed illegally."), "subject");
});
test("scope: 'both subjects', 'all three subjects' and 'each of the subjects' include this subject", () => {
  assert.equal(att("Both subjects stated that they entered illegally in 2015."), "subject");
  assert.equal(att("All three subjects were deported in 2012."), "subject");
  assert.equal(att("Each of the subjects had been ordered removed."), "subject");
});
test("scope: 'one subject', 'a subject' and 'one of the subjects' are unclear", () => {
  assert.equal(att("One subject had been ordered removed."), "unclear");
  assert.equal(att("A subject stated he was deported."), "unclear");
  assert.equal(att("One of the subjects was removed in 2012."), "unclear");
});
test("scope: 'the last subject' and 'the second subject' are list members: unclear", () => {
  assert.equal(att("Checks showed one had been ordered removed and the last subject was in status."), "unclear");
  assert.equal(att("The second subject was removed in 2010."), "unclear");
});
test("scope: 'the other subject' is someone else; 'the subject' in the same sentence still counts", () => {
  assert.equal(att("The other subject was deported in 2012."), "other");
  assert.equal(att("The subject said the other subject was deported."), "subject");
});

// ---- Refinement: arrests, apprehensions, voluntary returns and removals stay distinct ----
import { isPriorRemoval } from "../lib/review/facts";
test("history: removals are removals; arrests, apprehensions, NTAs and voluntary returns are not", () => {
  assert.equal(isPriorRemoval("He was previously removed to Mexico on 03/02/2018."), true);
  assert.equal(isPriorRemoval("A 06/08/2005 he was arrested by Border Patrol and received an Expedited Removal."), true);
  assert.equal(isPriorRemoval("He was deported to Honduras in 2019."), true);
  assert.equal(isPriorRemoval("The second event resulted in a Voluntary Return."), false);
  assert.equal(isPriorRemoval("He was previously arrested by U.S. Border Patrol on two separate occasions."), false);
  assert.equal(isPriorRemoval("He was apprehended near Nogales in 2010."), false);
  assert.equal(isPriorRemoval("The disposition of the 12/20/2004 apprehension was a Notice to Appear."), false);
  assert.equal(isPriorRemoval("He was permitted to voluntarily depart in 2012."), false);
  assert.equal(isPriorRemoval("The subject was processed for expedited removal and was served Form I-860."), false);
});
test("history: an offered or declined removal did not happen", () => {
  assert.equal(isPriorRemoval("Subject was offered a Stipulated Removal, which he declined."), false);
  assert.equal(isPriorRemoval("He will be held pending removal proceedings."), false);
});

// ---- Fix 6: prior immigration encounters, kept distinct from removals ----
import { isPriorImmigrationEncounter } from "../lib/review/facts";
test("prior immigration encounters: Border Patrol arrests, voluntary returns and earlier NTAs count", () => {
  assert.equal(isPriorImmigrationEncounter("He was previously arrested by U.S. Border Patrol on two separate occasions."), true);
  assert.equal(isPriorImmigrationEncounter("The second event resulted in a Voluntary Return.", 2017), false, "no past marker and no earlier date");
  assert.equal(isPriorImmigrationEncounter("On 04/28/1999 he was processed as a VR by USBP Douglas, AZ.", 2017), true);
  assert.equal(isPriorImmigrationEncounter("The disposition of the apprehension on 12/20/2004 was a Notice to Appear.", 2017), true);
});
test("prior immigration encounters: the current arrest, criminal arrests and 'no prior' statements do not count", () => {
  assert.equal(isPriorImmigrationEncounter("Agents placed him under arrest at 1330 hours and he was served a Notice to Appear.", 2017), false);
  assert.equal(isPriorImmigrationEncounter("He was previously arrested by the Detroit Police Department for driving under the influence."), false);
  assert.equal(isPriorImmigrationEncounter("Records showed no prior apprehensions by Border Patrol."), false);
});
