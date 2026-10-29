import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeOutputs } from "../lib/review/merge";
import type { ModelOutput } from "../lib/review/schema";

const base = (o: Partial<ModelOutput>): ModelOutput => ({
  elements: [], issues: [], citation: { status: "consistent", explanation: "", evidence: [] }, human_review: { required: false, reasons: [] }, ...o,
});

test("present with sentence references beats absent", () => {
  const m = mergeOutputs([
    base({ elements: [{ element_id: "E3", status: "absent", sentence_ids: [], note: "" }] }),
    base({ elements: [{ element_id: "E3", status: "present", sentence_ids: ["S4"], note: "" }] }),
  ]);
  assert.equal(m.elements[0].status, "present");
});

test("issues are unioned and duplicates with the same evidence removed", () => {
  const iss = { type: "inconsistency" as const, title: "a", explanation: "", evidence: [{ sentence_id: "S1", quote: "x" }, { field_path: "entry.date" }], needs_human_review: true, reason: "" };
  const m = mergeOutputs([base({ issues: [iss] }), base({ issues: [{ ...iss, title: "b" }, { ...iss, type: "unclear", evidence: [{ sentence_id: "S9", quote: "y" }] }] })]);
  assert.equal(m.issues.length, 2);
});

test("the more cautious citation status wins and human review is OR-ed", () => {
  const m = mergeOutputs([base({}), base({ citation: { status: "likely_mismatch", explanation: "e", evidence: [] }, human_review: { required: true, reasons: ["r"] } })]);
  assert.equal(m.citation.status, "likely_mismatch");
  assert.equal(m.human_review.required, true);
});
