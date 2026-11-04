// Crossing polarity, event-scoped (review of df54805): a crossing counts for the mode and place comparisons only when
// the crossing itself is affirmed. New wordings built on the locked diag-2 case EG12 (team-authored development case).
// Pipeline tests import only reviewCase, so this file also runs on df54805 to record the earlier behaviour.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const ALL = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8"];
const run = (c: CaseRecord) => {
  const out = JSON.stringify({ elements: ALL.map((id) => ({ element_id: id, status: "present", sentence_ids: [], note: "" })), issues: [], citation: { evidence: [], status: "consistent", explanation: "Supported." }, human_review: { required: false, reasons: [] } });
  const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? JSON.stringify({ entry_statements: [], removal_statements: [], status_statements: [] }) : out, attempts: 1 });
  return reviewCase(c, fake);
};
// EG12: one person, form "EWI AFOOT", "near Sasabe, AZ".
const EG12 = JSON.parse(readFileSync("eval/diag-2/cases/EG12.json", "utf8")) as CaseRecord;
const ENTRY = "He stated that he crossed the border illegally on foot near Sasabe, Arizona, on 02/14/2017 with a group of five, walked for two nights, and was driven to Phoenix.";
const withEntry = (s: string): CaseRecord => ({ ...EG12, narrative: { ...EG12.narrative, text: EG12.narrative.text.replace(ENTRY, s) } });
const ids = async (s: string) => (await run(withEntry(s))).findings.map((f) => f.id);
const sid = (s: string, needle: string) => splitSentences(withEntry(s).narrative.text).find((x) => x.text.includes(needle))!.id;

test("polarity: contracted, curly-apostrophe and fronted negations deny the truck crossing (no mode conflict with EWI AFOOT)", async () => {
  assert.ok(EG12.narrative.text.includes(ENTRY));
  for (const s of ["The subject didn't cross the border in a truck.", "The subject didn’t cross the border in a truck.", "The subject hasn't crossed the border in a truck.",
    "At no point did the subject cross the border in a truck.", "At no time did he cross the border in a truck.", "Never did he cross the border in a truck.", "Not once did he cross the border in a truck."])
    assert.ok(!(await ids(s)).includes("F-ENTRY-MODE"), s);
});
test("polarity: fronted and contracted negations deny a crossing in another state (no place conflict)", async () => {
  for (const s of ["At no time did he cross near Columbus, New Mexico.", "He didn't cross near Columbus, New Mexico.", "He didn’t cross the border near Columbus, New Mexico."])
    assert.ok(!(await ids(s)).includes("F-ENTRY-PLACE"), s);
});
test("polarity (preserved): affirmed crossings are compared", async () => {
  for (const [s, id] of [["The subject crossed the border near Sasabe, Arizona, on 02/14/2017 hidden in a truck.", "F-ENTRY-MODE"],
    ["He admitted that he crossed the border near Sasabe, Arizona, in the back of a truck on 02/14/2017.", "F-ENTRY-MODE"],
    ["The subject crossed the border on foot west of Columbus, New Mexico, on 02/14/2017.", "F-ENTRY-PLACE"]] as const) {
    const r = await run(withEntry(s));
    assert.ok(r.findings.some((f) => f.id === id && f.evidence.some((e) => e.sentenceId === sid(s, "crossed the border"))), s);
  }
});
test("polarity (preserved): a negated unrelated action does not cancel an affirmed crossing", async () => {
  for (const s of ["He did not apply for a visa and crossed the border in a truck near Sasabe, Arizona.", "He didn't have papers, so he crossed the border in a truck near Sasabe, Arizona.",
    "He has never been inspected but crossed the border in a truck near Sasabe, Arizona."])
    assert.ok((await ids(s)).includes("F-ENTRY-MODE"), s);
  for (const s of ["He has never been inspected but crossed the border on foot near Sasabe, Arizona.", "He has never been inspected and crossed the river on foot near Sasabe, Arizona."])
    assert.ok(!(await ids(s)).some((x) => x === "F-ENTRY-MODE" || x === "F-ENTRY-PLACE"), s);
});
test("polarity (preserved): a denied truck crossing followed by an affirmed crossing on foot agrees with EWI AFOOT", async () => {
  for (const s of ["The subject didn't cross the border in a truck. He stated that he crossed the border on foot near Sasabe, Arizona, on 02/14/2017.",
    "At no point did the subject cross the border in a truck; he walked across near Sasabe, Arizona, on 02/14/2017.",
    "The subject didn’t cross the border in a truck but walked across the border near Sasabe, Arizona."])
    assert.ok(!(await ids(s)).some((x) => x === "F-ENTRY-MODE" || x === "F-ENTRY-PLACE"), s);
});
