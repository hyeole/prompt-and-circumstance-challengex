// Corrections for the defects found by the diag-2 diagnostic of 44a1dae (branch improve/diag2-fixes-1).
// POST-OBSERVATION: the "diag-2 …" reproductions use the locked diag-2 cases (team-authored development cases; the run
// was not an evaluation). The controls are new wordings. Pipeline only (reviewCase and formYear, which exist at 44a1dae),
// so this file can also be run against 44a1dae to record the earlier behaviour. Offline: fake model.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, formYear, type FactsOutput } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

type Entry = FactsOutput["entry_statements"][number];
const load = (id: string) => JSON.parse(readFileSync(`eval/diag-2/cases/${id}.json`, "utf8")) as CaseRecord;
const ALL = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8"];
type Cit = { status: string; explanation: string; evidence?: object[] };
const run = (c: CaseRecord, facts: FactsOutput | string, issues: object[] = [], citation: Cit = { status: "consistent", explanation: "Supported." }) => {
  const elements = ALL.map((id) => ({ element_id: id, status: "present", sentence_ids: [], note: "" }));
  const out = JSON.stringify({ elements, issues, citation: { evidence: [], ...citation }, human_review: { required: false, reasons: [] } });
  const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? (typeof facts === "string" ? facts : JSON.stringify(facts)) : out, attempts: 1 });
  return reviewCase(c, fake);
};
const sent = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text, c.narrative.pageSpans).find((s) => s.text.includes(needle))!;
const ent = (c: CaseRecord, quote: string, year: number | null, manner: Entry["manner"] = "without_inspection"): Entry =>
  ({ sentence_id: sent(c, quote).id, quote, event: "us_entry", country: "United States", year, manner, person: "unclear", uncertainty: "stated" } as Entry);
const F = (entries: Entry[]): FactsOutput => ({ entry_statements: entries, removal_statements: [], status_statements: [] });
const NONE = F([]);
const form = (c: CaseRecord, over: Record<string, string>): CaseRecord => ({ ...c, facts: c.facts.map((f) => (f.path in over ? { ...f, value: over[f.path], status: "present" as const } : f)) });
const text = (c: CaseRecord, from: string, to: string): CaseRecord => ({ ...c, narrative: { ...c.narrative, text: c.narrative.text.replace(from, to) } });
const ids = (r: Awaited<ReturnType<typeof run>>) => r.findings.map((f) => f.id);
const cites = (r: Awaited<ReturnType<typeof run>>, id: string, sid: string, field: string) => r.findings.some((f) => f.id === id && f.evidence.some((e) => e.sentenceId === sid) && f.evidence.some((e) => e.fieldPath === field));

// ---- 1. Partial form dates ----
test("formYear: full, month/year and year-only form dates; unknown values give nothing", () => {
  assert.equal(formYear("03/18/2015"), 2015);
  assert.equal(formYear("09/15/2019 2300"), 2019);
  assert.equal(formYear("04/2018"), 2018);
  assert.equal(formYear("2018"), 2018);
  assert.equal(formYear("Unknown Date, Unknown Time"), undefined);
  assert.equal(formYear("2300"), undefined, "a clock time is not a year");
});
test("diag-2 EG05: a pronoun-linked 2021 entry against a month/year form date (04/2018) is a date conflict", async () => {
  const c = load("EG05");
  const q = "he got across the river near Del Rio, Texas, in the spring of 2021";
  const s = sent(c, q).id;
  const r = await run(c, F([ent(c, q, 2021)]));
  assert.ok(cites(r, "F-ENTRY-DATE", s, "entry.date"));
  assert.ok(r.humanReview.required);
  // Year-only form date
  assert.ok(cites(await run(form(c, { "entry.date": "2018" }), F([ent(c, q, 2021)])), "F-ENTRY-DATE", s, "entry.date"));
});
test("dates: same year at different precision is not a conflict; no month or day is invented; unknown form dates are not compared", async () => {
  const c = load("EG05");
  const q = "he got across the river near Del Rio, Texas, in the spring of 2021";
  for (const v of ["04/2021", "06/2021", "2021", "06/14/2021", "Unknown Date, Unknown Time"])
    assert.ok(!ids(await run(form(c, { "entry.date": v }), F([ent(c, q, 2021)]))).includes("F-ENTRY-DATE"), v);
});
test("dates (ambiguous): two redacted men, years 2012 and 2016, form 07/2012: routed, never a finding", async () => {
  const c = load("UN04");
  const a = "crossed the border near Douglas, Arizona, in July 2012", b = "crossed near Douglas in 2016";
  const r = await run(c, F([ent(c, a, 2012), ent(c, b, 2016)]));
  assert.ok(!ids(r).includes("F-ENTRY-DATE"));
  assert.ok(r.humanReview.accounts?.some((g) => g.sentenceIds.includes(sent(c, b).id)));
});

// ---- 2. Crossing mode ----
test("diag-2 EG02: a crossing hidden in a tractor-trailer against EWI AFOOT, though the extraction quoted only the warehouse release", async () => {
  const c = load("EG02");
  const r = await run(c, F([ent(c, "He was let out at a warehouse in Pharr, Texas, later that night.", 2020)]));
  assert.ok(cites(r, "F-ENTRY-MODE", sent(c, "hid him and four other people").id, "entry.manner"));
  assert.ok(r.humanReview.required);
  // The inspection category agrees: the manner-based charge is not qualified by a mode-only conflict
  assert.equal(r.citation.status, "consistent");
});
test("mode: approach travel, smuggler help and transport after the crossing are not the crossing's mode", async () => {
  for (const id of ["NC01", "EG12", "EG05", "NC08"]) {
    const r = await run(load(id), NONE);
    assert.ok(!ids(r).includes("F-ENTRY-MODE"), id);
  }
});
test("mode: no mode in the form code, or raft vs on foot, is not compared; a vehicle crossing vs AFOOT in another wording is", async () => {
  const c = load("EG02");
  assert.ok(!ids(await run(form(c, { "entry.manner": "EWI" }), NONE)).includes("F-ENTRY-MODE"), "form states no mode");
  const raft = text(c, "who hid him and four other people inside the trailer of a tractor-trailer that was driven across the Pharr International Bridge without the trailer being opened or inspected", "who took him and four other people across the river on a raft at night");
  assert.ok(!ids(await run(raft, NONE)).includes("F-ENTRY-MODE"), "raft vs AFOOT");
  const car = text(c, "who hid him and four other people inside the trailer of a tractor-trailer that was driven across the Pharr International Bridge without the trailer being opened or inspected", "who drove him across the bridge into Texas hidden in the trunk of a car");
  assert.ok(ids(await run(car, NONE)).includes("F-ENTRY-MODE"), "trunk of a car vs AFOOT");
});
test("mode (ambiguous): an unattributable vehicle crossing in a narrative about two men is routed, not a finding", async () => {
  const c = load("UN04");
  const v = text(c, "crossed near Douglas in 2016 with a cousin", "crossed the border near Douglas in 2016 hidden in the trunk of a car");
  const r = await run(v, NONE);
  assert.ok(!ids(r).includes("F-ENTRY-MODE"));
  assert.ok(r.humanReview.accounts?.some((g) => g.fieldPath === "entry.manner"));
});

// ---- 3. Entry place ----
test("diag-2 EG07: a crossing west of Columbus, New Mexico, against a form place near Nogales, AZ", async () => {
  const c = load("EG07");
  const r = await run(c, NONE);
  assert.ok(cites(r, "F-ENTRY-PLACE", sent(c, "west of Columbus, New Mexico").id, "entry.place"));
  assert.ok(r.humanReview.required);
});
test("place: nearby places, the same state in other words, abbreviations, a form place without a state, and later travel are not conflicts", async () => {
  const c = load("EG07");
  const sw = (to: string) => text(c, "through the desert west of Columbus, New Mexico", to);
  assert.ok(!ids(await run(sw("through the desert near Sasabe, Arizona"), NONE)).includes("F-ENTRY-PLACE"), "nearby place, same state");
  assert.ok(!ids(await run(form(c, { "entry.place": "near Columbus, NM" }), NONE)).includes("F-ENTRY-PLACE"), "abbreviation");
  assert.ok(!ids(await run(form(c, { "entry.place": "5 mile(s) W of COL" }), NONE)).includes("F-ENTRY-PLACE"), "form place names no state");
  assert.ok(!ids(await run(form(c, { "entry.place": "0 mile(s) of UNK" }), NONE)).includes("F-ENTRY-PLACE"), "unknown form place");
  assert.ok(!ids(await run(sw("through the desert near Nogales, and that he was later driven to Albuquerque, New Mexico"), NONE)).includes("F-ENTRY-PLACE"), "a state named for travel after the crossing");
  assert.ok(!ids(await run(sw("through the desert near the Arizona and New Mexico state line"), NONE)).includes("F-ENTRY-PLACE"), "two states in the crossing: ambiguous");
});

// ---- 4. Removal requirement (8 U.S.C. 1326) ----
test("diag-2 EG08: an explicitly unexecuted order with a subject-specific no-removal record check and denial is a citation mismatch", async () => {
  const c = load("EG08");
  const r = await run(c, NONE);
  assert.equal(r.citation.status, "likely_mismatch");
  assert.match(r.citation.explanation, /states that it was not executed/);
  assert.ok(ids(r).includes("C-1"));
});
test("removal requirement: an unexecuted order alone stays unresolved; an executed order supports; unknown execution stays unresolved", async () => {
  const c = load("EG08");
  const alone = text(text(c, "A records check revealed no removal, deportation or exclusion of the subject. ", ""), "Asked directly, the subject stated that he has never been deported or sent back to Mexico.", "");
  const ra = await run(alone, NONE);
  assert.equal(ra.citation.status, "needs_human_review");
  assert.match(ra.citation.explanation, /not executed/);
  assert.equal((await run(load("NC03"), NONE)).citation.status, "consistent");
  for (const id of ["UN01", "UN02"]) {
    const r = await run(load(id), NONE);
    assert.equal(r.citation.status, "needs_human_review", id);
    assert.match(r.citation.explanation, /does not state that the order was executed/, id);
  }
});
test("an agency title ('Deportation Officer') is not a prior removal", async () => {
  const c = load("EG08");
  const r = await run(form(c, { "history.immigration_record": "NEGATIVE" }), NONE, [], { status: "consistent", explanation: "Supported." });
  assert.ok(!ids(r).includes("F-HISTORY"));
});

// ---- 5. Event chronology ----
test("diag-2 EG04: an earlier entry that ended in a voluntary return, then a re-entry, is not two accounts of the last entry", async () => {
  const c = load("EG04");
  const r = await run(c, F([ent(c, "In 2014 he was caught by Border Patrol agents shortly after crossing near Eagle Pass, Texas", 2014), ent(c, "He stated that he crossed again on foot near Eagle Pass on 03/18/2015", 2015)]));
  assert.ok(!ids(r).includes("F-ACCOUNT"));
  assert.ok(ids(r).includes("F-HISTORY-3"), "the prior apprehension is still a history item");
});
test("chronology: two genuinely conflicting accounts of the same entry are still reported", async () => {
  const c = load("EG04");
  const v = text(text(c, "In 2014 he was caught by Border Patrol agents shortly after crossing near Eagle Pass, Texas, and was voluntarily returned to Piedras Negras the same day.", "He said that he crossed near Eagle Pass in 2014 and has stayed ever since."),
    "He stated that he crossed again on foot near Eagle Pass on 03/18/2015", "Later he said that he crossed on foot near Eagle Pass on 03/18/2015");
  const r = await run(form(v, { "entry.date": "Unknown Date, Unknown Time" }), NONE);
  assert.ok(ids(r).includes("F-ACCOUNT") || ids(r).includes("F-ENTRY-DATE-2"), ids(r).join(","));
});

// ---- 6. Narrative-to-narrative claims about orders ----
test("diag-2 EG08: 'an order was issued, yet no removal occurred' and 'never deported, yet ordered removed' are withheld", async () => {
  const c = load("EG08");
  const s5 = "On 06/20/2015 an immigration judge in San Antonio, Texas, ordered the subject removed.";
  const s7 = "A records check revealed no removal, deportation or exclusion of the subject.";
  const s8 = "Asked directly, the subject stated that he has never been deported or sent back to Mexico.";
  const claim = (title: string, quotes: string[]) => ({ type: "inconsistency", title, explanation: title, evidence: quotes.map((q) => ({ sentence_id: sent(c, q).id, quote: q })), needs_human_review: true, reason: title });
  const r = await run(c, NONE, [claim("Removal order issued, yet no removal occurred", [s5, s7, s8]), claim("Never deported, yet an immigration judge ordered removal", [s8, s5])]);
  assert.ok(!r.findings.some((f) => f.source === "model" && f.category === "inconsistency"));
  assert.ok(r.discarded.filter((d) => /removal order, not a completed removal/.test(d.reason)).length === 2);
});
test("narrative claims: a completed removal against 'never deported' is still a conflict", async () => {
  const c = text(load("EG08"), "On 06/20/2015 an immigration judge in San Antonio, Texas, ordered the subject removed.", "On 06/20/2015 the subject was removed to Mexico through Laredo, Texas.");
  const s5 = "On 06/20/2015 the subject was removed to Mexico through Laredo, Texas.";
  const s8 = "Asked directly, the subject stated that he has never been deported or sent back to Mexico.";
  const r = await run(c, NONE, [{ type: "inconsistency", title: "Removed, yet never deported", explanation: "S5 says he was removed; S8 says he was never deported.", evidence: [{ sentence_id: sent(c, s5).id, quote: s5 }, { sentence_id: sent(c, s8).id, quote: s8 }], needs_human_review: true, reason: "x" }]);
  assert.ok(!r.discarded.some((d) => /removal order, not a completed removal/.test(d.reason)));
  assert.ok(r.findings.some((f) => f.category === "inconsistency" && f.evidence.some((e) => e.sentenceId === sent(c, s5).id)));
});

// ---- UN01/UN02 wording ----
test("diag-2 UN01/UN02: an unknown manner under 8 U.S.C. 1326 does not claim the charge depends on the manner; under a manner charge it does", async () => {
  for (const id of ["UN01", "UN02"]) {
    const u = (await run(load(id), NONE)).findings.find((f) => f.id === "U-E3");
    assert.ok(u, id);
    assert.doesNotMatch(u!.explanation, /charge depends on this fact/, id);
  }
  const c = load("UN01");
  const m = { ...c, selectedCharges: [{ citation: "INA 212(a)(6)(A)(i)", source: "team-assigned-for-testing" }] } as CaseRecord;
  const u = (await run(m, NONE)).findings.find((f) => f.id === "U-E3");
  assert.match(u!.explanation, /selected charge depends on this fact/);
});
