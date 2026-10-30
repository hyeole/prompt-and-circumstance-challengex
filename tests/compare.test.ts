import { test } from "node:test";
import assert from "node:assert/strict";
import { compareFindings, wordDiff } from "../lib/compare";
import type { Finding, ReviewResult } from "../lib/types";
import { splitSentences } from "../lib/text";

const result = (text: string, findings: Finding[], o: Partial<ReviewResult> = {}): ReviewResult => ({
  sentences: splitSentences(text), findings, modelStatus: "ok", promptVersion: "p1", referenceVersion: "r1", ...o,
} as unknown as ReviewResult);
const finding = (id: string, category: Finding["category"], sentenceId?: string, elementId?: string): Finding => ({
  id, category, title: id, explanation: "", referenceIds: [], needsHumanReview: false, source: "model", severity: "low",
  evidence: [sentenceId ? { kind: "sentence", sentenceId, verified: true } : { kind: "missing", elementId, verified: true }],
});

test("word diff marks officer edits", () => {
  const d = wordDiff("He crossed via a river.", "He crossed via a river near Laredo, Texas.");
  assert.ok(d.some((x) => x.kind === "added" && /Laredo/.test(x.text)));
  assert.ok(!d.some((x) => x.kind === "removed"));
});

test("resolved, added and persisting findings when the cited text is unchanged", () => {
  const before = result("Alpha one. Beta two. Gamma three.", [finding("M-E2", "missing_element", undefined, "E2"), finding("I-1", "inconsistency", "S1")]);
  const after = result("Alpha one. Beta two. Gamma three. Delta four.", [finding("I-1", "inconsistency", "S1"), finding("Q-1", "unclear", "S2")]);
  const c = compareFindings(before, after);
  assert.ok(c.available);
  assert.deepEqual(c.resolved.map((f) => f.id), ["M-E2"]);
  assert.deepEqual(c.persisting.map((f) => f.id), ["I-1"]);
  assert.deepEqual(c.added.map((f) => f.id), ["Q-1"]);
});

test("findings whose cited sentence was edited are not guessed", () => {
  const before = result("He entered in 2013. Other.", [finding("I-1", "inconsistency", "S1")]);
  const after = result("He entered in 2014. Other.", [finding("I-1", "inconsistency", "S1")]);
  const c = compareFindings(before, after);
  assert.equal(c.persisting.length, 0);
  assert.equal(c.unmatched.length, 2);
});

test("comparison unavailable across partial reviews or different prompt versions", () => {
  assert.equal(compareFindings(result("A.", []), result("A.", [], { modelStatus: "failed" })).available, false);
  assert.equal(compareFindings(result("A.", []), result("A.", [], { promptVersion: "p2" })).available, false);
});
