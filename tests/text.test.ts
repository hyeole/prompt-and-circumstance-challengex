import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { splitSentences, locateQuote, locatePartial } from "../lib/text";
import { runRules } from "../lib/review/rules";
import type { CaseRecord } from "../lib/types";

const c001 = JSON.parse(readFileSync("data/cases/C001.json", "utf8")) as CaseRecord;

test("sentence offsets index the exact narrative text", () => {
  const ss = splitSentences(c001.narrative.text, c001.narrative.pageSpans);
  assert.ok(ss.length > 30);
  for (const s of ss) assert.equal(c001.narrative.text.slice(s.start, s.end), s.text);
});

test("abbreviations and decimals do not split sentences", () => {
  const ss = splitSentences("He was stopped by the U.S. Border Patrol. He had $1,339.00 in cash. Done.");
  assert.deepEqual(ss.map((s) => s.text), ["He was stopped by the U.S. Border Patrol.", "He had $1,339.00 in cash.", "Done."]);
});

test("headings become their own segment", () => {
  const ss = splitSentences("TRAVEL:\n\nHe walked north. Then he stopped.");
  assert.equal(ss[0].text, "TRAVEL:");
  assert.equal(ss.length, 3);
});

test("sentences carry source PDF page numbers", () => {
  const ss = splitSentences(c001.narrative.text, c001.narrative.pageSpans);
  const rio = ss.find((s) => s.text.includes("Rio Grande"));
  assert.equal(rio?.page, 3);
  const gangs = ss.find((s) => s.text.includes("street gangs"));
  assert.equal(gangs?.page, 4);
});

test("quote location tolerates whitespace and case, rejects invented text", () => {
  const [s] = splitSentences("The subjects  were travelling from New York to California.");
  const loc = locateQuote(s, "travelling from new york");
  assert.ok(loc);
  assert.equal(s.text.slice(loc!.start - s.start, loc!.end - s.start), "travelling from New York");
  assert.equal(locateQuote(s, "travelling from Texas"), null);
});

test("C001 rules: fields cover entry elements; time difference flagged; multiple people is a note, not a flag", () => {
  const ss = splitSentences(c001.narrative.text, c001.narrative.pageSpans);
  const r = runRules(c001, ss);
  for (const id of ["E1", "E2", "E3", "E4", "E5"]) assert.equal(r.elementsFromFields.get(id)?.status, "present", id);
  const ids = r.findings.map((f) => f.id);
  assert.ok(!ids.includes("R-MULTI-SUBJECT"));
  assert.equal(r.notes.length, 1);
  assert.equal(r.humanReviewReasons.length, 0);
  assert.ok(ids.includes("R-TIME-MISMATCH"));
  const t = r.findings.find((f) => f.id === "R-TIME-MISMATCH")!;
  assert.equal(t.evidence.length, 2);
  assert.match(t.evidence[0].quote!, /1330 hours/);
});

test("multiple selected charges always route to human review", () => {
  const multi = { ...c001, selectedCharges: [...c001.selectedCharges, { citation: "8 U.S.C. 1325(a)", source: "officer-selected" as const }] };
  const r = runRules(multi, splitSentences(multi.narrative.text));
  assert.equal(r.citationPrecheck?.status, "needs_human_review");
  assert.ok(r.findings.some((f) => f.id === "R-MULTI-CHARGE" && f.needsHumanReview));
});

test("redacted field is unavailable, not missing", () => {
  const red = { ...c001, facts: c001.facts.map((f) => (f.path === "entry.manner" ? { ...f, value: "", status: "redacted" as const } : f)) };
  const r = runRules(red, splitSentences(red.narrative.text));
  assert.equal(r.elementsFromFields.get("E3")?.status, "unavailable_redacted");
});

test("time rule ignores transport times", () => {
  const ss = splitSentences("The subjects were arrested and transported to the station at 2145 hours by the agent.");
  const c = { ...c001, narrative: { text: ss[0].text }, facts: c001.facts.map((f) => (f.path === "encounter.date_time" ? { ...f, value: "04/08/2017 2040" } : f)) };
  assert.ok(!runRules(c, ss).findings.some((f) => f.id === "R-TIME-MISMATCH"));
});

test("redaction markers written differently by the model still match exactly, showing source text", () => {
  const [s] = splitSentences("He last entered the United States on February 21, 2015 through the Port of [REDACTED (b)(7)(E)] Entry in Laredo, Texas.");
  for (const q of ["through the Port of [REDACTED] Entry in Laredo", "through the Port of (b) (7)(E) Entry in Laredo", "through the Port of REDACTED Entry in Laredo"]) {
    const loc = locateQuote(s, q);
    assert.ok(loc, q);
    assert.equal(loc!.match, "exact");
    assert.equal(s.text.slice(loc!.start - s.start, loc!.end - s.start), "through the Port of [REDACTED (b)(7)(E)] Entry in Laredo");
  }
});

test("a quote that silently drops a redaction is not an exact match", () => {
  const [s] = splitSentences("He last entered the United States on February 21, 2015 through the Port of [REDACTED (b)(7)(E)] Entry in Laredo, Texas.");
  assert.equal(locateQuote(s, "entered the United States on February 21, 2015 through the Port of Entry in Laredo"), null);
});

test("partial matches are accepted only when the source fragment contains the material fact", () => {
  const [s] = splitSentences("He last entered the United States on February 21, 2015 through the Port of [REDACTED (b)(7)(E)] Entry in Laredo, Texas.");
  const q = "entered the United States on February 21, 2015 through the Port of Entry in Laredo";
  const hit = locatePartial(s, q, ["2015"]);
  assert.equal(hit?.match, "partial");
  assert.ok(s.text.slice(hit!.start - s.start, hit!.end - s.start).includes("2015"));
  assert.equal(locatePartial(s, q, ["2016"]), null, "fragment must contain the fact being compared");
  assert.equal(locatePartial(s, q, []), null, "no material fact, no partial match");
});

// Changed in improve/accuracy-iter-1: C003's arrest (1030) is after the form's encounter hour (0950), the normal
// sequence, so it is no longer flagged (it was adjudicated a valid observation under the earlier rule; that record is
// kept unchanged). The word order this test guards ("At approximately 1030 hours, X was placed under arrest") is still
// read, and flagged when the arrest is before the recorded encounter.
test("bug: time rule missed 'At approximately 1030 hours, X was placed under arrest' (C003)", () => {
  const c003 = JSON.parse(readFileSync("eval/cases/C003.json", "utf8")) as CaseRecord;
  const ss3 = splitSentences(c003.narrative.text, c003.narrative.pageSpans);
  assert.ok(!runRules(c003, ss3).findings.some((x) => x.id === "R-TIME-MISMATCH"), "an arrest 40 minutes after the recorded encounter is not a conflict");
  const before = { ...c003, facts: c003.facts.map((x) => (x.path === "encounter.date_time" ? { ...x, value: "03/27/2017 1130" } : x)) };
  const f = runRules(before, ss3).findings.find((x) => x.id === "R-TIME-MISMATCH");
  assert.ok(f, "form 1130 vs an arrest at 1030 should be flagged");
  assert.match(f!.evidence[0].quote!, /1030 hours/);
  const ss = splitSentences("At approximately 2145 hours the subjects were transported to the station and arrested later.");
  assert.ok(!runRules({ ...c003, narrative: { text: ss[0].text } }, ss).findings.some((x) => x.id === "R-TIME-MISMATCH"), "transport times stay excluded");
});

test("time rule ignores heading words and call/request times (C012 'Facts of Arrest: ... 2000 hours, a Trooper requested')", () => {
  const c012 = JSON.parse(readFileSync("eval/cases/C012.json", "utf8")) as CaseRecord;
  assert.ok(!runRules(c012, splitSentences(c012.narrative.text, c012.narrative.pageSpans)).findings.some((x) => x.id === "R-TIME-MISMATCH"));
});
