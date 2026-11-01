// Event-scoped validation of encounter-time claims and the routing reasons that depend on them (branch
// improve/encounter-time, from be71a16). Offline: a fake model returns the claims and reasons.
//
// POST-OBSERVATION TESTS: the "reproduction" tests restate model output saved in the capability-1 run (2026-11-01):
// the model compared the form's encounter hour (0910) with the Trooper's request time (0815) or the agent's arrival
// time (0900), although the narrative never states the encounter time. They are development tests on reused cases.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { statedTimes, timeRoutingReasons, unsupportedTimeClaim } from "../lib/review/times";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const R = "[REDACTED (b)(6), (b)(7)(C)]";
const BASE = JSON.parse(readFileSync("eval/gen-v1/cases/G06.json", "utf8")) as CaseRecord;
const REQUEST = "On March 12, 2024, at approximately 0815 hours, a Michigan State Police Trooper requested Border Patrol assistance with a traffic stop near Monroe, Michigan.";
const ARRIVAL = `Border Patrol Agent ${R} arrived at approximately 0900 hours.`;
const REST = `Agent ${R} questioned the subject as to his citizenship. The subject stated that he is a citizen and national of Mexico. Agent ${R} placed the subject under arrest.`;
const TEMPLATE = `ENCOUNTER:\n${REQUEST} ${ARRIVAL} ${REST}`;
const withText = (text: string, formTime = "03/12/2024 0910"): CaseRecord => ({
  ...BASE, narrative: { ...BASE.narrative, text, pageSpans: undefined } as CaseRecord["narrative"],
  facts: BASE.facts.map((f) => (f.path === "encounter.date_time" ? { ...f, value: formTime, status: "present" as const } : f)),
});
type Issue = { type: string; title: string; explanation: string; evidence: object[]; needs_human_review: boolean; reason: string };
const run = (c: CaseRecord, issues: Issue[], reasons: string[] = []) => {
  // Every checklist element answered, so that a partial review does not route on its own.
  const elements = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8"].map((id) => ({ element_id: id, status: "present", sentence_ids: ["S2"], note: "" }));
  const review = JSON.stringify({ elements, issues, citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: reasons.length > 0, reasons } });
  const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? JSON.stringify({ entry_statements: [], removal_statements: [], status_statements: [] }) : review, attempts: 1 });
  return reviewCase(c, fake);
};
const sid = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text).find((s) => s.text.includes(needle))!.id;
const claim = (title: string, explanation: string, ev: object[], reason = ""): Issue => ({ type: "inconsistency", title, explanation, evidence: [...ev, { field_path: "encounter.date_time" }], needs_human_review: true, reason });
const timeFindings = (r: Awaited<ReturnType<typeof run>>) => r.findings.filter((f) => f.evidence.some((e) => e.fieldPath === "encounter.date_time"));

// ---- The time reader ----
test("each stated time is read with its own event", () => {
  const ev = (t: string) => statedTimes(splitSentences(t)).map((x) => `${x.hhmm}:${x.event}`);
  assert.deepEqual(ev(REQUEST), ["0815:request"]);
  assert.deepEqual(ev(ARRIVAL), ["0900:arrival"]);
  assert.deepEqual(ev(`Agent ${R} placed the subject under arrest at 1330 hours.`), ["1330:arrest"]);
  assert.deepEqual(ev("At approximately 0910 hours, agents encountered two men near the highway."), ["0910:encounter"]);
  assert.deepEqual(ev("The subjects were arrested and transported to the station at 2145 hours."), ["2145:processing"], "the transport's time, not the arrest's");
  assert.deepEqual(ev(`Agent ${R} arrived at approximately 0900 hours and encountered the subject.`), ["0900:encounter"], "the clause links the arrival to the encounter");
  assert.deepEqual(ev(`Agent ${R} arrived at approximately 0900 hours and found two occupants.`), ["0900:arrival"], "\"found\" alone is not a stated encounter");
  assert.deepEqual(ev("Facts of Arrest: On April 8, 2017, at approximately 2000 hours, a Trooper requested assistance."), ["2000:request"], "a heading's word is not the clause's event");
  assert.deepEqual(ev("At 0412 am, Sector Dispatch requested assistance."), ["0412:request"]);
  assert.deepEqual(ev("At 9:10 AM, agents stopped the vehicle."), ["0910:encounter"]);
  assert.deepEqual(ev("The vehicle was registered at 1234 Main Street."), [], "an address is not a time");
});

// ---- Reproductions (post-observation) ----
test("reproduction (CAP-B1N/B2N, verified engine I-1): the agent's arrival time is not the encounter time", async () => {
  const c = withText(TEMPLATE);
  const r = await run(c, [claim("Encounter time discrepancy", "The narrative states the agent arrived at approximately 0900 hours, while the form field lists the encounter date and hour as 03/12/2024 0910.", [{ sentence_id: sid(c, "arrived"), quote: "arrived at approximately 0900 hours" }], "The difference in times could affect the accuracy of the encounter record and may require clarification.")],
    ["Encounter time discrepancy between narrative and form field.", "Potential impact on the accuracy of the encounter record."]);
  assert.deepEqual(timeFindings(r), []);
  assert.ok(r.discarded.some((d) => /0900 hours as the time of an agent's or officer's arrival, not the encounter/.test(d.reason)));
  assert.ok(!r.humanReview.reasons.some((x) => /encounter (time|record)/i.test(x)), JSON.stringify(r.humanReview.reasons));
  assert.equal(r.humanReview.required, false, "nothing else routes this review");
});

test("reproduction (CAP-B1N/C1P/B1P, I-2): a request time and an arrival time together are not the encounter time", async () => {
  const c = withText(TEMPLATE);
  const r = await run(c, [claim("Encounter time mismatch", "The narrative indicates the encounter began at 0815 and the agent arrived at 0900, while the form field lists 0910.", [{ sentence_id: sid(c, "requested"), quote: "at approximately 0815 hours" }, { sentence_id: sid(c, "arrived"), quote: "arrived at approximately 0900 hours" }])],
    ["Encounter date/time conflict between form field and narrative.", "The conflicting times could affect the determination of the encounter's circumstances."]);
  assert.deepEqual(timeFindings(r), []);
  assert.ok(r.discarded.some((d) => /0815 hours as the time of a call or request and 0900 hours as the time of an agent's or officer's arrival, not the encounter/.test(d.reason)));
  assert.equal(r.humanReview.required, false, JSON.stringify(r.humanReview.reasons));
});

test("reproduction (CAP-A1N/C1N/C2N/D1N/D2N/E2P, candidate): routing reasons alone, after the claim was withheld or never verified", async () => {
  const c = withText(TEMPLATE);
  // A1N: the claim is withheld (request time); the model's "verify" reason rests on it.
  const a = await run(c, [claim("Encounter time mismatch", "Narrative reports 0815 hours while form lists 0910.", [{ sentence_id: sid(c, "requested"), quote: "at approximately 0815 hours" }])], ["Potential need to verify correct encounter time."]);
  assert.equal(a.humanReview.required, false, JSON.stringify(a.humanReview.reasons));
  // C1P: the claim's quote could not be matched (not withheld as invalid); the reason still asserts a conflict the
  // narrative does not support.
  const b = await run(c, [claim("Encounter time discrepancy", "x", [{ sentence_id: "S2", quote: "text that is not in the narrative" }])], ["Conflicting encounter times."]);
  assert.equal(b.humanReview.required, false, JSON.stringify(b.humanReview.reasons));
  // D1N/D2N/E2P: reasons with no claim at all.
  for (const reason of ["Encounter date/time conflict between narrative and form field.", "Encounter time inconsistency requires verification to ensure accurate record of the event.", "Conflicting encounter times"]) {
    const r = await run(c, [], [reason]);
    assert.equal(r.humanReview.required, false, reason);
    assert.ok(r.discarded.some((d) => d.title === "Model routing reason" && /does not support/.test(d.reason)), reason);
  }
});

// ---- Genuine conflicts and independent uncertainty are kept ----
test("control: a stated encounter time 30+ minutes from the form's is a conflict; claim and reason are kept", async () => {
  const c = withText(`ENCOUNTER:\n${REQUEST} At approximately 0815 hours, agents encountered the subject near Monroe, Michigan. ${REST}`);
  const r = await run(c, [claim("Encounter time discrepancy", "The narrative states agents encountered the subject at 0815 hours, while the form lists 0910.", [{ sentence_id: sid(c, "encountered"), quote: "At approximately 0815 hours, agents encountered the subject" }])], ["Conflicting encounter time"]);
  assert.equal(timeFindings(r).filter((f) => f.source === "model").length, 1);
  assert.ok(r.findings.some((f) => f.id === "R-TIME-MISMATCH"), "the time rule finds it too");
  assert.ok(r.humanReview.reasons.includes("Conflicting encounter time"));
});

test("control: an arrival the source links to the encounter, or an arrest time, is compared", async () => {
  const linked = withText(`ENCOUNTER:\n${REQUEST} Border Patrol Agent ${R} arrived at approximately 0815 hours and encountered the subject. ${REST}`);
  const r1 = await run(linked, [claim("Encounter time discrepancy", "Narrative gives 0815 hours; form lists 0910.", [{ sentence_id: sid(linked, "arrived"), quote: "arrived at approximately 0815 hours and encountered the subject" }])]);
  assert.equal(timeFindings(r1).filter((f) => f.source === "model").length, 1);
  const arrest = withText(`ENCOUNTER:\n${REQUEST} ${ARRIVAL} Agent ${R} placed the subject under arrest at 1030 hours.`);
  const r2 = await run(arrest, [claim("Encounter time discrepancy", "Narrative gives 1030 hours for the arrest; form lists 0910.", [{ sentence_id: sid(arrest, "under arrest at 1030"), quote: "placed the subject under arrest at 1030 hours" }])]);
  assert.ok(timeFindings(r2).some((f) => f.source === "model"));
  assert.ok(r2.findings.some((f) => f.id === "R-TIME-MISMATCH"), "the time rule's own finding is unchanged");
});

test("control: an encounter time within 30 minutes of the form's is not a conflict (the time rule's threshold)", async () => {
  const c = withText(`ENCOUNTER:\n${REQUEST} At approximately 0900 hours, agents encountered the subject near Monroe, Michigan. ${REST}`);
  const r = await run(c, [claim("Encounter time mismatch", "Narrative gives 0900 hours for the encounter; form lists 0910.", [{ sentence_id: sid(c, "encountered"), quote: "At approximately 0900 hours, agents encountered the subject" }])]);
  assert.deepEqual(timeFindings(r), []);
  assert.ok(r.discarded.some((d) => /within 30 minutes/.test(d.reason)));
});

test("independent uncertainty is kept: a missing-time observation, an unresolved differing time, mixed and other reasons", async () => {
  const c = withText(TEMPLATE);
  const r = await run(c, [], ["The narrative does not state the encounter time.", "Conflicting entry dates and encounter times need adjudication", "Multiple charges could apply to these facts", "Potential need to verify correct encounter time."]);
  for (const x of ["The narrative does not state the encounter time.", "Conflicting entry dates and encounter times need adjudication", "Multiple charges could apply to these facts"]) assert.ok(r.humanReview.reasons.includes(x), x);
  assert.ok(r.humanReview.reasons.includes("Potential need to verify correct encounter time."), "no time claim was withheld here, so a request to verify is the model's own uncertainty");
  // A differing time the narrative ties to no event: not a finding (no evidence it is the encounter), but a reason to route.
  const u = withText(`ENCOUNTER:\n${REQUEST} At approximately 1030 hours, the vehicle was on Interstate 75 near Monroe, Michigan. ${REST}`);
  const r2 = await run(u, [claim("Encounter time discrepancy", "Narrative gives 1030 hours; form lists 0910.", [{ sentence_id: sid(u, "Interstate"), quote: "At approximately 1030 hours, the vehicle was on Interstate 75" }])], ["Conflicting encounter times"]);
  assert.deepEqual(timeFindings(r2), []);
  assert.ok(r2.humanReview.reasons.includes("Conflicting encounter times"), "the source leaves a conflict possible");
  assert.ok(r2.humanReview.reasons.some((x) => /gives 1030 hours without saying which event it is; the form records the encounter at 0910 hours/.test(x)), "the code routes the unresolved time itself");
  // ... and when the model gave no reason of its own, the code's reason alone still routes it.
  const r3 = await run(u, [claim("Encounter time discrepancy", "Narrative gives 1030 hours; form lists 0910.", [{ sentence_id: sid(u, "Interstate"), quote: "At approximately 1030 hours, the vehicle was on Interstate 75" }])]);
  assert.equal(r3.humanReview.required, true);
  // A model clarification that the time is not stated is not a conflict claim and is kept.
  const q = await run(c, [{ type: "unclear", title: "Encounter time not stated", explanation: "The narrative gives the request (0815) and arrival (0900) times but not the encounter time.", evidence: [{ sentence_id: sid(c, "arrived"), quote: "arrived at approximately 0900 hours" }], needs_human_review: false, reason: "" }]);
  assert.ok(q.findings.some((f) => f.title === "Encounter time not stated"));
});

test("narrative-only comparisons: two events' times do not conflict; two times for one event do", () => {
  const ss = splitSentences(`${REQUEST} ${ARRIVAL}`);
  assert.match(unsupportedTimeClaim("Times conflict: the stop at 0815 versus arrival at 0900.", ss, false, undefined)?.reason ?? "", /different events/);
  const two = splitSentences("At approximately 0815 hours, agents encountered the subject. Later the report says agents encountered the subject at 0930 hours.");
  assert.equal(unsupportedTimeClaim("The encounter time differs: 0815 versus 0930.", two, false, undefined), null);
});

test("timeRoutingReasons: a supported conflict keeps every reason; a mixed reason keeps its other parts", () => {
  assert.deepEqual(timeRoutingReasons(["Conflicting encounter times"], true, true).reasons, ["Conflicting encounter times"]);
  const r = timeRoutingReasons(["Encounter time discrepancy; identity of the driver cannot be determined"], false, false);
  assert.deepEqual(r.reasons, ["identity of the driver cannot be determined"]);
  assert.deepEqual(r.removed, ["Encounter time discrepancy"]);
});

test("out of scope, kept: a model observation that the time is not stated (C001-M3 pattern) and encounter-date concerns", async () => {
  const c = withText(TEMPLATE);
  // An "unclear" item that cites only the form field and says the narrative does not give the time: not a conflict claim.
  const gap = { type: "unclear", title: "Encounter date/time not stated", explanation: "The narrative does not specify the date or time of the encounter, whereas the form field encounter.date_time is 03/12/2024 0910.", evidence: [{ field_path: "encounter.date_time" }], needs_human_review: true, reason: "Without a narrative date, it is unclear whether the encounter details match the recorded date." };
  const r = await run(c, [gap]);
  assert.ok(r.findings.some((f) => f.title === "Encounter date/time not stated"));
  // Encounter DATE concerns are a different fact: never removed by the time check.
  const d = await run(c, [], ["Encounter date conflict", "Conflicting encounter dates; need to determine correct date"]);
  assert.ok(d.humanReview.reasons.includes("Encounter date conflict"));
  assert.ok(d.humanReview.reasons.includes("Conflicting encounter dates; need to determine correct date"));
  // "date/time" counts as a time concern only when the narrative states the form's own encounter date.
  const other = withText(TEMPLATE, "03/14/2024 0910");
  const o = await run(other, [], ["Encounter date/time conflict between narrative and form field."]);
  assert.ok(o.humanReview.reasons.includes("Encounter date/time conflict between narrative and form field."), "the dates differ (March 12 vs 03/14): kept");
});
