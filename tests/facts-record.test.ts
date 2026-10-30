// The review result records the fact extraction as validated (or why it failed) for review evidence. Recording only:
// no check reads it. Offline (fake model).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { ModelError } from "../lib/llm";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const G09 = JSON.parse(readFileSync("eval/gen-v1/cases/G09.json", "utf8")) as CaseRecord;
const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const fake = (facts: string | Error): Complete => async (system) => {
  if (system !== FACTS_SYSTEM_PROMPT) return { text: REVIEW, attempts: 1 };
  if (facts instanceof Error) throw facts;
  return { text: facts, attempts: 1 };
};
const came = splitSentences(G09.narrative.text).find((s) => s.text.includes("came to the United States"))!.id;
const VALID = { entry_statements: [{ sentence_id: came, quote: "he came to the United States several years ago", event: "us_entry", country: "United States", year: null, manner: "unknown", person: "subject" }], removal_statements: [] };

test("a validated extraction is recorded as used by the comparison (schema defaults applied)", async () => {
  const r = await reviewCase(G09, fake(JSON.stringify(VALID)));
  assert.equal(r.factsExtraction?.status, "valid");
  const out = (r.factsExtraction as { output: { entry_statements: { sentence_id: string }[]; status_statements: unknown[] } }).output;
  assert.equal(out.entry_statements[0].sentence_id, came);
  assert.deepEqual(out.status_statements, [], "schema default");
  assert.equal(r.modelConfig?.factsStatus, "ok");
});
test("failed and invalid extractions record a reason, never the model's text", async () => {
  const cases: [string | Error, RegExp][] = [
    [new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1), /time limit/],
    ["not json at all", /^not valid JSON$/],
    [JSON.stringify({ entry_statements: [], removal_statements: [] }), /^no entry statements/],
    [JSON.stringify({ entry_statements: [{ sentence_id: 5 }] }), /^schema: /],
  ];
  for (const [facts, reason] of cases) {
    const r = await reviewCase(G09, fake(facts));
    assert.equal(r.factsExtraction?.status, "failed");
    const why = (r.factsExtraction as { reason: string }).reason;
    assert.match(why, reason);
    assert.ok(!why.includes("not json at all"));
    assert.equal(r.modelConfig?.factsStatus, "failed");
  }
});
