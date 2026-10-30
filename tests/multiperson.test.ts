// Multi-person detection: clearly distinct people establish a multi-person narrative even when group wording appears in
// only one sentence (or not at all); officials' names, repeated redaction markers, boilerplate plurals and relatives
// mentioned do not. Each "defect" test fails on ccc60d7; the controls pass on both. Offline (fake model).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { runRules } from "../lib/review/rules";
import { FACTS_SYSTEM_PROMPT, statesSeveralPeople } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const template = JSON.parse(readFileSync("eval/cases/C013-X1.json", "utf8")) as CaseRecord;
const record = (text: string, values: Record<string, string> = {}): CaseRecord => ({
  ...template, id: "SYN", narrative: { ...template.narrative, text, pageSpans: undefined } as CaseRecord["narrative"],
  facts: template.facts.map((f) => (f.path in values ? { ...f, value: values[f.path], status: "present" } : f)),
});
const multi = (text: string) => runRules(record(text), splitSentences(text)).notes.length > 0;
const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const EMPTY = JSON.stringify({ entry_statements: [], removal_statements: [] });
const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? EMPTY : REVIEW, attempts: 1 });
const M = "[REDACTED (b)(6), (b)(7)(C)]";

test("distinct people stated in one sentence make a multi-person narrative", () => {
  for (const t of [
    `Border Patrol Agents encountered two subjects near Laredo, Texas. ${M} stated that he was removed to Mexico in 2015.`,
    `Agents apprehended ${M} and ${M} near the river. ${M} stated that he was removed to Mexico in 2015.`,
    `Agents encountered the subject near Laredo. The other subject stated that he entered illegally in 2014.`,
    `Agents apprehended a man and a woman near the river. ${M} stated that he was removed to Mexico in 2015.`,
    `Agents stopped a vehicle near Laredo. Both of them were transported to the station. ${M} was removed to Mexico in 2015.`,
    `Agents responded to a sensor near Laredo. One of the subjects ran south. ${M} was removed to Mexico in 2015.`,
  ]) assert.equal(multi(t), true, t);
});
test("controls: officials, repeated markers, boilerplate plurals, relatives and the subject's own details stay single-person", () => {
  for (const t of [
    `Agent ${M} and Agent ${M} arrested the subject near Laredo. The subject stated that he entered illegally in 2014.`,
    `Agents ${M} and ${M} arrested the subject near Laredo. The subject stated that he entered illegally in 2014.`,
    `${M} was encountered near Laredo. ${M} stated that he entered illegally in 2014. ${M} was transported to the station.`,
    `Subjects encountered at the checkpoint are screened for medical issues. The subject stated that he entered illegally in 2014.`,
    `Agents encountered the subject near Laredo. The subject stated that his wife lives in Houston.`,
    `Agents encountered ${M} (A# ${M}, DOB ${M}) near Laredo. ${M} stated that he entered illegally in 2014.`,
  ]) assert.equal(multi(t), false, t);
  assert.equal(multi(`Agents encountered several subjects near Laredo. All subjects were transported to the station.`), true, "the existing two-sentence rule still applies");
});
test("statesSeveralPeople: coordination between a person of interest and an official, or officials only, is not several people", () => {
  assert.equal(statesSeveralPeople(`Agent ${M} arrested ${M} near the river.`), false, "not coordinated");
  assert.equal(statesSeveralPeople(`SBPA ${M}, and ${M} approved the processing.`), false, "both officials");
  assert.equal(statesSeveralPeople(`Agents found ${M}, ${M} and ${M} hiding in the brush.`), true);
});
test("an unattributed removal in a two-subject narrative is routed, not counted for the subject", async () => {
  const r = await reviewCase(record(`Border Patrol Agents encountered two subjects near Laredo, Texas. ${M} stated that he was removed to Mexico in 2015.`, { "history.immigration_record": "NEGATIVE" }), fake);
  assert.ok(!r.findings.some((f) => f.id === "F-HISTORY"));
  assert.ok(r.humanReview.accounts?.some((u) => u.sentenceIds.includes("S2")));
});
test("control: an explicitly-subject removal in a two-subject narrative still conflicts with NEGATIVE", async () => {
  const r = await reviewCase(record(`Border Patrol Agents encountered two subjects near Laredo, Texas. The subject stated that he was removed to Mexico in 2015.`, { "history.immigration_record": "NEGATIVE" }), fake);
  assert.ok(r.findings.some((f) => f.id === "F-HISTORY"));
});
