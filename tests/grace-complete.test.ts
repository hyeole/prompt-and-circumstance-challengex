// grace-complete-1: the second review sample must not be cancelled while the first answer omits checklist items it was
// asked about (live retry-check-1 C003-M3: sample 1 answered at 6.2 s without N4/N6; sample 2 was cancelled at 18.2 s by
// the 12 s grace; the review was partial "no output for N4, N6"). Offline: a fake model whose cancelled samples reject
// asynchronously, as the real client does. Each test waits past the 12 s grace, so they take ~13 s.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { ModelError } from "../lib/llm";
import type { CaseRecord } from "../lib/types";

const ALL = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8"];
const review = (omit: string[] = []) => JSON.stringify({
  elements: ALL.filter((id) => !omit.includes(id)).map((id) => ({ element_id: id, status: "present", sentence_ids: [], note: "" })),
  issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const FACTS = JSON.stringify({ entry_statements: [], removal_statements: [], status_statements: [] });
type Plan = { after: number; text?: string; fail?: boolean };
/** Review sample i follows plans[i]; a cancelled sample rejects (asynchronously) with the client's cancellation error. */
const fake = (plans: Plan[]): Complete => {
  let n = 0;
  return (system, _user, _budget, signal) => {
    if (system === FACTS_SYSTEM_PROMPT) return Promise.resolve({ text: FACTS, attempts: 1 });
    const p = plans[n++];
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => p.fail ? reject(new ModelError("The model endpoint did not answer within the time limit.", "timeout", 2)) : resolve({ text: p.text!, attempts: 1 }), p.after);
      signal?.addEventListener("abort", () => { clearTimeout(t); setTimeout(() => reject(new ModelError("Sample cancelled after the grace period; another sample was used.", "timeout", 1)), 5); }, { once: true });
    });
  };
};
const C003M3 = JSON.parse(readFileSync("eval/cases/C003-M3.json", "utf8")) as CaseRecord;
const missing = (r: Awaited<ReturnType<typeof reviewCase>>) => (r.completion?.failed ?? []).find((f) => f.check === "Required elements")?.reason;
const status = (r: Awaited<ReturnType<typeof reviewCase>>, id: string) => r.elements.find((e) => e.elementId === id)?.status;
const call = (r: Awaited<ReturnType<typeof reviewCase>>, role: string) => r.calls.find((c) => c.role === role)?.status;

test("C003-M3 reproduction: a first answer that omits N4/N6 does not cancel the twin; its answer completes the checklist", async () => {
  const r = await reviewCase(C003M3, fake([{ after: 50, text: review(["N4", "N6"]) }, { after: 13_000, text: review() }]));
  assert.equal(call(r, "review-2"), "ok", "the pending twin is not cancelled");
  assert.equal(missing(r), undefined, "no required element is left without output");
  // The fake answers "present" without a sentence reference, which the existing rule reports as "unclear": answered, not unchecked.
  assert.notEqual(status(r, "N4"), "not_checked", "N4 is answered by the twin");
});
test("control: a complete first answer still cancels a slow twin after the grace period (unchanged)", async () => {
  const r = await reviewCase(C003M3, fake([{ after: 50, text: review() }, { after: 20_000, text: review() }]));
  assert.equal(call(r, "review-2"), "cancelled");
  assert.equal(missing(r), undefined);
});
test("control: when both answers omit N4/N6, the review stays partial and nothing is invented", async () => {
  const r = await reviewCase(C003M3, fake([{ after: 50, text: review(["N4", "N6"]) }, { after: 13_000, text: review(["N4", "N6"]) }]));
  assert.equal(call(r, "review-2"), "ok", "the twin was waited for");
  assert.match(missing(r) ?? "", /\bN4\b/, "the omitted item is still reported as without model output");
  assert.equal(status(r, "N4"), "not_checked", "no status is invented for the omitted item");
  assert.equal(r.completion?.status, "partial");
});
test("control: when the twin fails, the omitted items stay unchecked and the review is partial", async () => {
  const r = await reviewCase(C003M3, fake([{ after: 50, text: review(["N4", "N6"]) }, { after: 13_000, fail: true }]));
  assert.equal(call(r, "review-2"), "failed", "the twin ran to its own outcome instead of being cancelled at the grace period");
  assert.match(missing(r) ?? "", /\bN4\b/);
  assert.equal(status(r, "N4"), "not_checked");
  assert.equal(r.completion?.status, "partial");
});
test("same rule: an unusable (invalid) first answer does not cancel a pending twin that gives a usable one", async () => {
  const r = await reviewCase(C003M3, fake([{ after: 50, text: "not json" }, { after: 13_000, text: review() }]));
  assert.equal(call(r, "review-2"), "ok");
  assert.equal(r.modelStatus, "ok");
  assert.equal(missing(r), undefined);
});
