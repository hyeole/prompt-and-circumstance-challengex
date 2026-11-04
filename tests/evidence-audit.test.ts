// Evidence audit of accuracy iteration 1 (branch improve/accuracy-iter-1). Offline: a fake model returns the claims.
// 1. Attribution: identity never comes from values matching the subject's form (a full or partial entry date, a manner,
//    a place) or from repeated redaction markers; only the text itself (the subject named, one person described, a
//    pronoun chain to the subject's designation) attributes a statement. C119-X1 S25 is a reused case: its credited
//    detection rested on such a match (POST-OBSERVATION test).
// 2. Times: an encounter or arrest time is compared with the form's At/Near date and hour only when the source
//    establishes the person, the occurrence, the date and the agency (times.eventContext); otherwise it is a question.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, attributeStatement } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const R = "[REDACTED (b)(6), (b)(7)(C)]";
const load = (p: string) => JSON.parse(readFileSync(p, "utf8")) as CaseRecord;
const BASE = load("eval/dev-synthetic/cases/DS05.json");
const ss = (c: CaseRecord) => splitSentences(c.narrative.text, c.narrative.pageSpans);
const sid = (c: CaseRecord, needle: string) => ss(c).find((s) => s.text.includes(needle))!.id;
const withNarrative = (text: string, facts: Record<string, string> = {}): CaseRecord => ({
  ...BASE, narrative: { ...BASE.narrative, text },
  facts: BASE.facts.map((f) => (f.path in facts ? { ...f, value: facts[f.path], status: "present" as const } : f)),
});
type Entry = { sentence_id: string; quote: string; event: string; year: number; manner: string; person: string };
const review = (c: CaseRecord, entries: Entry[] = [], issues: object[] = []): Promise<Awaited<ReturnType<typeof reviewCase>>> => {
  const out = JSON.stringify({ elements: [], issues, citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: issues.length > 0, reasons: [] } });
  const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? JSON.stringify({ entry_statements: entries, removal_statements: [], status_statements: [] }) : out, attempts: 1 });
  return reviewCase(c, fake);
};

// ---- 1. Attribution ----
test("C119-X1 (post-observation): S25 matches the form's entry month, day and manner but names no one; it is routed, not attributed", async () => {
  const c = load("eval/cases/C119-X1.json");
  const s25 = ss(c).find((s) => s.id === "S25")!;
  assert.match(s25.text, /^8\/11\/2009 Arrived into the United States as a B1 Visitor Visa/);
  assert.equal(attributeStatement(ss(c), "S25", true, undefined, c).outcome, "ambiguous");
  const r = await review(c, [{ sentence_id: "S25", quote: s25.text, event: "us_entry", year: 2009, manner: "admitted", person: "unclear" }]);
  assert.ok(!r.findings.some((f) => f.id === "F-ENTRY-DATE"), "no finding from value matching");
  assert.ok((r.humanReview.accounts ?? []).some((g) => g.fieldPath === "entry.date" && g.sentenceIds.includes("S25")), "human review retained, naming S25");
});
const TWO = `ENCOUNTER:\nOn June 4, 2023, agents stopped a vehicle with two occupants, ${R} and ${R}, near Monroe, Michigan. Both subjects were arrested.\nENTRY:\n`;
const FORM = { "entry.date": "03/10/2018", "entry.manner": "EWI AFOOT", "entry.place": "near Nogales, AZ" };
test("attribution, negative controls: a matching full date and manner, a matching place, or a repeated marker does not attribute", () => {
  const exact = withNarrative(`${TWO}${R} stated that he entered the United States illegally on March 10, 2018 by walking across the border.`, FORM);
  assert.equal(attributeStatement(ss(exact), sid(exact, "March 10, 2018"), true, undefined, exact).outcome, "ambiguous", "full date and manner match");
  const place = withNarrative(`${TWO}${R} stated that he crossed near Nogales, Arizona in 2015.`, FORM);
  assert.equal(attributeStatement(ss(place), sid(place, "Nogales"), true, undefined, place).outcome, "ambiguous", "place match");
  const marker = withNarrative(`${TWO}${R} is a citizen of Mexico. ${R} stated that he crossed the border in 2015.`, FORM);
  assert.equal(attributeStatement(ss(marker), sid(marker, "in 2015"), true, undefined, marker).outcome, "ambiguous", "the same marker as an earlier sentence");
});
test("attribution, positive controls: the subject named, one person described, or a pronoun chain to the subject still attributes", async () => {
  const named = withNarrative(`${TWO}The subject stated that he entered the United States illegally in 2015 by walking across the border.`, FORM);
  const r = await review(named, [{ sentence_id: sid(named, "in 2015"), quote: "The subject stated that he entered the United States illegally in 2015 by walking across the border", event: "us_entry", year: 2015, manner: "without_inspection", person: "subject" }]);
  assert.ok(r.findings.some((f) => f.id === "F-ENTRY-DATE"), "named subject: the year conflict is kept");
  const one = withNarrative(`ENCOUNTER:\nOn June 4, 2023, agents encountered ${R} near Monroe, Michigan.\nENTRY:\n${R} stated that he entered the United States illegally in 2015.`, FORM);
  assert.equal(attributeStatement(ss(one), sid(one, "in 2015"), false, undefined, one).outcome, "supported", "one person described");
  const chain = withNarrative(`${TWO}The subject stated that he is a citizen of Mexico. He stated that he entered the United States illegally in 2015.`, FORM);
  const out = attributeStatement(ss(chain), sid(chain, "in 2015"), true, undefined, chain);
  assert.equal(out.outcome, "supported");
  assert.equal(out.basis, "account", "a pronoun chain to the subject's designation");
});

// ---- 2. Times: person, occurrence, date and agency ----
const ONE = (s: string) => `ENCOUNTER:\nOn June 4, 2023, Border Patrol agents were on patrol near Monroe, Michigan. ${s} The subject stated that he is a citizen of Mexico.`;
const timeCase = (text: string, hour: string, date = "06/04/2023") => withNarrative(text, { "encounter.date_time": `${date} ${hour}` });
const ruleTime = async (c: CaseRecord) => {
  const r = await review(c);
  return { finding: r.findings.some((f) => f.id === "R-TIME-MISMATCH"), questions: r.humanReview.reasons.filter((x) => /At\/Near date and hour/.test(x)) };
};
test("times, negative controls: another agency's earlier arrest or stop does not conflict with the agents' recorded hour", async () => {
  assert.deepEqual(await ruleTime(timeCase(ONE("An Ohio State Trooper arrested the subject at 1300 hours."), "1435")), { finding: false, questions: [] });
  assert.deepEqual(await ruleTime(timeCase(ONE("The subject was arrested by the Rocky River Police Department at 1300 hours."), "1435")), { finding: false, questions: [] });
  assert.deepEqual(await ruleTime(timeCase(ONE("Police stopped the vehicle at 1200 hours. Agents encountered the subject at 1435 hours."), "1435")), { finding: false, questions: [] }, "a later agency encounter");
});
test("times, negative controls: an earlier occurrence, another date, an unstated agency, or an unidentified person is a question at most", async () => {
  const prior = await ruleTime(timeCase(ONE("The subject was previously arrested by Border Patrol agents at 1100 hours."), "1435"));
  assert.equal(prior.finding, false);
  const otherDate = await ruleTime(timeCase(ONE("On June 3, 2023, agents arrested the subject at 0800 hours."), "0900"));
  assert.equal(otherDate.finding, false);
  assert.match(otherDate.questions[0] ?? "", /dates it 2023-06-03, not the form's date \(2023-06-04\)/);
  const passive = await ruleTime(timeCase(ONE("The subject was placed under arrest at 0800 hours."), "0900"));
  assert.equal(passive.finding, false);
  assert.match(passive.questions[0] ?? "", /does not say which agency made the arrest/);
  const someone = await ruleTime(timeCase(`${TWO.replace("Both subjects were arrested.", "")}Agents arrested ${R} at 0800 hours.`, "0900"));
  assert.equal(someone.finding, false);
  assert.match(someone.questions[0] ?? "", /does not say this subject was among those arrested/);
});
test("times, positive controls: an established same-event conflict is kept (arrest before the hour; the encounter's own time)", async () => {
  assert.equal((await ruleTime(timeCase(ONE("Agents placed the subject under arrest at 0800 hours."), "0900"))).finding, true, "one person, agents, form's date");
  assert.equal((await ruleTime(timeCase(`${TWO.replace("Both subjects were arrested.", "")}Agents arrested both subjects at 0800 hours.`, "0900"))).finding, true, "both subjects include the subject");
  assert.equal((await ruleTime(timeCase(ONE("Agents encountered the subject at 0800 hours."), "0900"))).finding, true);
  const multiEnc = await ruleTime(timeCase(`${TWO.replace("Both subjects were arrested.", "")}At 0800 hours agents encountered ${R} near the river.`, "0900"));
  assert.equal(multiEnc.finding, false, "among several people the encounter must include the subject");
  assert.match(multiEnc.questions[0] ?? "", /0800 hours for an encounter/);
});
test("times: a later, fully established arrest with no stated encounter time is a question about the field's meaning; with an agreeing encounter time, nothing", async () => {
  const later = await ruleTime(timeCase(ONE("Agents placed the subject under arrest at 1100 hours."), "0900"));
  assert.equal(later.finding, false);
  assert.match(later.questions[0] ?? "", /If that field records the first contact, the arrest followed it; if it records the apprehension, the two differ/);
  assert.deepEqual(await ruleTime(timeCase(ONE("Agents encountered the subject at 0900 hours and placed him under arrest at 1100 hours."), "0900")), { finding: false, questions: [] });
});
