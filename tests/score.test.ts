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

// ---- Refinement: provenance never lets generic routing count as detecting a specific planted issue ----
test("negative control: a rule-made generic routing finding does not detect a planted inconsistency, element or ambiguity", () => {
  const routing = f({ id: "R-MULTI-CHARGE", category: "human_review" as Finding["category"], source: "rule", title: "Multiple charges selected", explanation: "More than one charge is selected.", evidence: [{ kind: "field", fieldPath: "selectedCharges", verified: true }] });
  assert.equal(matches(r, routing, plant), false);
  assert.equal(matches(r, routing, { type: "missing_element", elementId: "N3" }), false);
  assert.equal(matches(r, routing, { type: "human_review", reason: "ambiguity", anchors: ["May 5, 2014"] }), false);
});

test("negative control: a rule-made finding for one element does not detect a different missing element", () => {
  const n5 = f({ id: "M-N5", category: "missing_element", source: "rule", referenceIds: ["N5"], evidence: [{ kind: "missing", elementId: "N5", verified: true }] });
  assert.equal(matches(r, n5, { type: "missing_element", elementId: "N3" }), false);
  assert.equal(matches(r, n5, { type: "missing_element", elementId: "N5" }), true);
});

// ---- Claim-aware adjudication layer: a verdict is inherited only for an identical claim ----
import { findingClaim } from "../scripts/finding-key";
const claimF = (o: Partial<Finding>) => findingClaim(f(o));
const ent = (attribution: "subject" | "unclear" | "other") => ({ kind: "sentence" as const, sentenceId: "S1", quote: "q", verified: true, context: { attribution, event: "Entry into the U.S." } });

test("claims: an identical finding makes the identical claim", () => {
  const a = { id: "I-1", title: "Entry date conflict", explanation: "The narrative gives 2014, but the form records 2011.", evidence: [ent("subject"), field] };
  assert.equal(claimF(a), claimF({ ...a, id: "I-3" }));
});
test("claims: different wording of the title is not treated as the same claim (manual adjudication needed)", () => {
  assert.notEqual(claimF({ id: "I-1", title: "Encounter time discrepancy", explanation: "Form 0950, narrative 1030." }), claimF({ id: "I-1", title: "Encounter time mismatch", explanation: "Form 0950, narrative 1030." }));
  assert.notEqual(claimF({ id: "I-1", title: "Entry date and place mismatch", explanation: "x" }), claimF({ id: "I-1", title: "Entry place and date mismatch", explanation: "x" }));
});
test("claims: negation, compared values, direction, subject and event are all part of the claim", () => {
  const base = { id: "C-1", title: "Possible citation mismatch", explanation: "The charge requires a prior removal, which the narrative documents.", evidence: [field] };
  assert.notEqual(claimF(base), claimF({ ...base, explanation: "The charge requires a prior removal, which the narrative does not document." }), "negation");
  const d = { id: "F-ENTRY-DATE", title: "Entry date differs from the form", evidence: [ent("subject"), field] };
  assert.notEqual(claimF({ ...d, explanation: "The narrative gives 2014; the form records 2011." }), claimF({ ...d, explanation: "The narrative gives 2012; the form records 2011." }), "values");
  assert.notEqual(claimF({ ...d, explanation: "The narrative gives 2014; the form records 2011." }), claimF({ ...d, explanation: "The form records 2014; the narrative gives 2011." }), "direction and order");
  assert.notEqual(claimF({ ...d, explanation: "x 2014 y 2011", evidence: [ent("subject"), field] }), claimF({ ...d, explanation: "x 2014 y 2011", evidence: [ent("unclear"), field] }), "subject");
  assert.notEqual(claimF({ ...d, explanation: "x", evidence: [{ ...ent("subject"), context: { attribution: "subject", event: "Prior removal" } }] }), claimF({ ...d, explanation: "x", evidence: [ent("subject")] }), "event");
});
test("claims: a missing element and an unclear element are different claims", () => {
  assert.notEqual(claimF({ id: "M-N1", title: "Missing: identifying documents", explanation: "x" }), claimF({ id: "U-N1", title: "Unclear: identifying documents", explanation: "x" }));
});
