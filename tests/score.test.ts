// Scoring policy v2.3 (scripts/score-match.ts): sharing a field or sentence with a planted issue is not detection.
import { test } from "node:test";
import assert from "node:assert/strict";
import { matches, isComplete, type Plant } from "../scripts/score-match";
import type { Finding, ReviewResult } from "../lib/types";

const r = {
  sentences: [{ id: "S1", text: "The subject crossed the river on May 5, 2014, near Hidalgo, Texas." }, { id: "S2", text: "He was arrested at 0900 hours." }],
  modelStatus: "ok", calls: [{ role: "facts", status: "ok" }], elements: [], citation: { status: "consistent" },
} as unknown as ReviewResult;
const plant: Plant = { type: "inconsistency", anchors: ["May 5, 2014"], fieldPaths: ["entry.date"] };
const f = (o: Partial<Finding>): Finding => ({ id: "I-1", category: "inconsistency", title: "", explanation: "", evidence: [], referenceIds: [], needsHumanReview: true, source: "model", severity: "high", ...o } as Finding);
const field = { kind: "field" as const, fieldPath: "entry.date", verified: true };
const s1 = { kind: "sentence" as const, sentenceId: "S1", quote: "May 5, 2014", verified: true };
const s2 = { kind: "sentence" as const, sentenceId: "S2", quote: "0900 hours", verified: true };

test("negative control: a fabricated legibility complaint citing the planted field is not detection (F010-X audit case)", () => {
  assert.equal(matches(r, f({ title: "Entry date unreadable", explanation: "The entry date font is unreadable and does not match the expected format.", evidence: [field] }), plant), false);
});

test("negative control: a finding about another fact that shares the field is not detection", () => {
  assert.equal(matches(r, f({ title: "Arrest time conflict", explanation: "The arrest time differs from the time on the form.", evidence: [s2, field] }), plant), false);
});

test("negative control: citing the planted field without naming the planted value is not detection", () => {
  assert.equal(matches(r, f({ title: "Entry date conflict", explanation: "The entry date in the narrative differs from the form.", evidence: [field] }), plant), false);
});

test("negative control: citing the planted sentence without describing any discrepancy is not detection", () => {
  assert.equal(matches(r, f({ title: "Entry date", explanation: "The narrative gives an entry date.", evidence: [s1] }), plant), false);
});

test("a finding that cites the planted sentence and names the conflict is detection", () => {
  assert.equal(matches(r, f({ title: "Entry date differs from the form", explanation: "The narrative gives 2014, but the form records 2011.", evidence: [s1, field] }), plant), true);
});

test("a field-only finding that names the planted year is detection", () => {
  assert.equal(matches(r, f({ title: "Entry year conflict", explanation: "Narrative says 2014 while the form lists 05/05/2011.", evidence: [field] }), plant), true);
});

test("a failed fact-extraction call makes an older review partial even if the model review succeeded", () => {
  assert.equal(isComplete(r), true);
  assert.equal(isComplete({ ...r, calls: [{ role: "facts", status: "failed", ms: 55000, attempts: 1 }] } as ReviewResult), false);
});
