// Event occurrences for clock times (branch improve/accuracy-iter-1, from a465773). Each stated time belongs to its own
// event occurrence; sharing a sentence or clause does not make two events simultaneous, and the form's encounter hour
// is compared with the encounter's own time (or with an arrest stated before it), never with a later arrest.
//
// POST-OBSERVATION TESTS: the two "user example" tests restate examples given in review of a465773, which compared an
// arrival time and a later arrest time with the form's encounter hour. Offline: a fake model returns the claims.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { statedTimes } from "../lib/review/times";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const BASE = JSON.parse(readFileSync("eval/dev-synthetic/cases/DS05.json", "utf8")) as CaseRecord;
const caseWith = (sentence: string, formHour: string): CaseRecord => ({
  ...BASE,
  narrative: { ...BASE.narrative, text: `ENCOUNTER:\nOn June 4, 2023, Border Patrol agents were on patrol near Monroe, Michigan. ${sentence} The subject stated that he is a citizen of Mexico.` },
  facts: BASE.facts.map((f) => (f.path === "encounter.date_time" ? { ...f, value: `06/04/2023 ${formHour}`, status: "present" as const } : f)),
});
// The model claims a conflict between the form's encounter hour and the time `t`, and asks for review because of it.
async function review(c: CaseRecord, t: string) {
  const s = splitSentences(c.narrative.text).find((x) => x.text.includes(t))!;
  const issue = { type: "inconsistency", title: "Encounter time discrepancy", explanation: `The narrative gives ${t} hours, but the form records a different encounter hour.`,
    evidence: [{ sentence_id: s.id, quote: `${t} hours` }, { field_path: "encounter.date_time" }], needs_human_review: true, reason: "The times differ." };
  const out = JSON.stringify({ elements: [], issues: [issue], citation: { status: "consistent", explanation: "Supported.", evidence: [] },
    human_review: { required: true, reasons: ["Encounter time discrepancy between narrative and form."] } });
  const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? JSON.stringify({ entry_statements: [], removal_statements: [], status_statements: [] }) : out, attempts: 1 });
  const r = await reviewCase(c, fake);
  return {
    r,
    timeFindings: r.findings.filter((f) => f.evidence.some((e) => e.fieldPath === "encounter.date_time")).map((f) => f.id),
    timeReasons: r.humanReview.reasons.filter((x) => /\btimes?\b/i.test(x)),
  };
}
const events = (sentence: string) => statedTimes(splitSentences(sentence)).map((x) => `${x.hhmm}:${x.event}`);

// ---- The user's examples (post-observation reproductions) ----
test("user example 1: an arrival at 0900 and an encounter at 1000 do not conflict with a form hour of 1000", async () => {
  const s = "Agents arrived at 0900 hours and encountered the subject at 1000 hours.";
  assert.deepEqual(events(s), ["0900:arrival", "1000:encounter"]);
  const { r, timeFindings, timeReasons } = await review(caseWith(s, "1000"), "0900");
  assert.deepEqual(timeFindings, []);
  assert.deepEqual(timeReasons, []);
  assert.ok(r.discarded.some((d) => /0900 hours as the time of an agent's or officer's arrival, not the encounter.*states the encounter at 1000 hours/.test(d.reason)));
});
test("user example 2: an encounter at 0900 and an arrest at 1100 do not conflict with a form hour of 0900", async () => {
  const s = "The subject was encountered at 0900 hours and was arrested at 1100 hours.";
  assert.deepEqual(events(s), ["0900:encounter", "1100:arrest"]);
  const { r, timeFindings, timeReasons } = await review(caseWith(s, "0900"), "1100");
  assert.deepEqual(timeFindings, []);
  assert.deepEqual(timeReasons, []);
  assert.ok(r.discarded.some((d) => /1100 hours as the arrest.*normal sequence/.test(d.reason)));
});
test("user example 2, arrest in its own sentence: the time rule does not compare the later arrest either", async () => {
  const { timeFindings } = await review(caseWith("The subject was encountered at 0900 hours. He was placed under arrest at 1100 hours.", "0900"), "1100");
  assert.deepEqual(timeFindings, []);
});

// ---- Binding: each time to its own occurrence ----
test("event occurrences: simultaneity must be stated; a sequence or a separate occurrence is not", () => {
  assert.deepEqual(events("Agent X arrived at approximately 0900 hours and encountered the subject."), ["0900:arrival"]);
  assert.deepEqual(events("Upon arrival at approximately 0900 hours, agents encountered the subject."), ["0900:encounter"]);
  assert.deepEqual(events("Agents arrived at 0900 hours and immediately encountered the subject."), ["0900:encounter"]);
  assert.deepEqual(events("Agents encountered and arrested the subject at 0900 hours."), ["0900:encounter"]);
  assert.deepEqual(events("The subject was encountered and placed under arrest at 0900 hours."), ["0900:encounter"]);
  assert.deepEqual(events("Agents encountered the subject and placed him under arrest at 1100 hours."), ["1100:arrest"]);
  assert.deepEqual(events("Agents encountered the subject near the river, then arrested him at 1100 hours."), ["1100:arrest"]);
  assert.deepEqual(events("Upon arrival at 0900 hours, agents encountered the subject at 0930 hours."), ["0900:arrival", "0930:encounter"], "an encounter with its own time is never borrowed");
  // Found in the replay of this change (F051 S3): watching another officer's stop is not the agents' encounter.
  assert.notDeepEqual(events("At approximately 12:30 p.m., BPAs observed an Escanaba Police officer conduct a traffic stop."), ["1230:encounter"]);
  assert.deepEqual(events("At approximately 8:45p.m., both Agents observed the subject leaving that grocery store."), ["2045:encounter"]);
});

// ---- Negative controls: genuine conflicts are kept ----
test("control: a stated encounter time differing by the tolerance or more is a conflict (model claim and time rule)", async () => {
  const { timeFindings } = await review(caseWith("The subject was encountered at 0900 hours.", "1000"), "0900");
  assert.ok(timeFindings.includes("R-TIME-MISMATCH"));
  assert.ok(timeFindings.some((id) => /^I-\d+$/.test(id)), "the model's supported claim is kept");
});
test("control: the configured tolerance (30 minutes) is unchanged", async () => {
  assert.ok((await review(caseWith("The subject was encountered at 0930 hours.", "1000"), "0930")).timeFindings.includes("R-TIME-MISMATCH"), "30 minutes: a conflict");
  assert.deepEqual((await review(caseWith("The subject was encountered at 0940 hours.", "1000"), "0940")).timeFindings, [], "20 minutes: not a conflict");
});
test("control: explicit simultaneity links an arrival or arrest time to the encounter", async () => {
  assert.ok((await review(caseWith("Upon arrival at 0900 hours, agents encountered the subject.", "1000"), "0900")).timeFindings.includes("R-TIME-MISMATCH"));
  assert.ok((await review(caseWith("Agents encountered and arrested the subject at 0900 hours.", "1000"), "0900")).timeFindings.includes("R-TIME-MISMATCH"));
});
test("control: an arrest stated before the recorded encounter conflicts with it; a later arrest or a midnight wrap does not", async () => {
  const before = await review(caseWith("Agents placed the subject under arrest at 0800 hours.", "0900"), "0800");
  assert.ok(before.timeFindings.includes("R-TIME-MISMATCH"));
  assert.match(before.r.findings.find((f) => f.id === "R-TIME-MISMATCH")!.explanation, /the arrest cannot come before it/);
  assert.deepEqual((await review(caseWith("Agents placed the subject under arrest at 1000 hours.", "0900"), "1000")).timeFindings, []);
  assert.deepEqual((await review(caseWith("Agents placed the subject under arrest at 0010 hours.", "2350"), "0010")).timeFindings, [], "20 minutes after, across midnight");
});
test("control: a missing encounter time is not a contradiction, and an untied differing time stays a question for a person", async () => {
  const arrival = await review(caseWith("Agents arrived at 0900 hours.", "1000"), "0900");
  assert.deepEqual(arrival.timeFindings, []);
  const untied = await review(caseWith("At approximately 0815 hours, the vehicle was on Interstate 75.", "1000"), "0815");
  assert.deepEqual(untied.timeFindings, []);
  assert.ok(untied.r.humanReview.reasons.some((x) => /0815 hours without saying which event it is/.test(x)));
});
