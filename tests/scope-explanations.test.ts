// Model claims respect event scope; explanations and routing reasons agree with accepted evidence; charge qualification
// follows the configured requirement (branch improve/scope-explanations-1, from 452dcb8). POST-OBSERVATION: the
// reproductions restate model output seen in the live verification of 452dcb8 (reused development cases; not an
// evaluation). Pipeline only (reviewCase), so this file also runs on 452dcb8 to record the earlier behaviour.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, type FactsOutput } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

type Entry = FactsOutput["entry_statements"][number];
const load = (p: string) => JSON.parse(readFileSync(p, "utf8")) as CaseRecord;
const D2 = (id: string) => load(`eval/diag-2/cases/${id}.json`);
const ALL = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8"];
type Cit = { status: string; explanation: string; evidence?: object[] };
const run = (c: CaseRecord, o: { facts?: Entry[]; issues?: object[]; citation?: Cit; reasons?: string[] } = {}) => {
  const out = JSON.stringify({ elements: ALL.map((id) => ({ element_id: id, status: "present", sentence_ids: [], note: "" })), issues: o.issues ?? [],
    citation: { evidence: [], ...(o.citation ?? { status: "consistent", explanation: "Supported." }) }, human_review: { required: !!o.reasons?.length, reasons: o.reasons ?? [] } });
  const facts = { entry_statements: o.facts ?? [], removal_statements: [], status_statements: [] };
  const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? JSON.stringify(facts) : out, attempts: 1 });
  return reviewCase(c, fake);
};
const sent = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text, c.narrative.pageSpans).find((s) => s.text.includes(needle))!;
const ent = (c: CaseRecord, quote: string, year: number | null, manner: Entry["manner"]): Entry =>
  ({ sentence_id: sent(c, quote).id, quote, event: "us_entry", country: "United States", year, manner, person: "unclear", uncertainty: "stated" } as Entry);
const ev = (c: CaseRecord, q: string) => ({ sentence_id: sent(c, q).id, quote: q });
const text = (c: CaseRecord, from: string, to: string): CaseRecord => ({ ...c, narrative: { ...c.narrative, text: c.narrative.text.replace(from, to) } });
const form = (c: CaseRecord, over: Record<string, string>): CaseRecord => ({ ...c, facts: c.facts.map((f) => (f.path in over ? { ...f, value: over[f.path], status: "present" as const } : f)) });
const cites = (r: Awaited<ReturnType<typeof run>>, sid: string, field: string) => r.findings.some((f) => f.category === "inconsistency" && f.evidence.some((e) => e.sentenceId === sid) && f.evidence.some((e) => e.fieldPath === field));

// ---- 1. Event scope for model claims (EG09) ----
const EG09 = D2("EG09");
const S5 = "first entered the United States illegally near Calexico, California, in 2005";
const S6 = "On 07/09/2019 he flew from Guadalajara to Houston, presented his passport and a valid B1/B2 visa, and was admitted as a visitor until 01/08/2020.";
const firstEntryClaim = (c: CaseRecord, extra: object[] = []) => ({ type: "inconsistency", title: "Entry facts conflict with form fields",
  explanation: "The narrative states the subject entered illegally in 2005, while the form fields record a 2019 entry with a B2 visa.",
  evidence: [ev(c, S5), { field_path: "entry.date" }, { field_path: "entry.place" }, { field_path: "entry.manner" }, ...extra], needs_human_review: true, reason: "Entry facts conflict" });
test("live EG09: a model claim comparing the explicitly FIRST entry with the form's last-entry fields is withheld", async () => {
  const r = await run(EG09, { facts: [ent(EG09, S5, 2005, "without_inspection"), ent(EG09, S6, 2019, "admitted")], issues: [firstEntryClaim(EG09)] });
  assert.ok(!r.findings.some((f) => f.source === "model" && f.evidence.some((e) => e.sentenceId === sent(EG09, S5).id)));
  assert.ok(r.discarded.some((d) => /earlier \(first or previous\) entry/.test(d.reason)));
  assert.equal(r.citation.status, "likely_mismatch", "the charge mismatch (last entry admitted) is kept");
});
test("scope: a genuine last-entry conflict is kept; a mixed claim keeps only its last-entry part; a 'first and only' entry is the last", async () => {
  const s6b = S6.replace("07/09/2019", "07/09/2017");
  const c = text(EG09, S6, s6b);
  const q6 = "On 07/09/2017 he flew from Guadalajara to Houston";
  const mixed = { ...firstEntryClaim(c, [ev(c, q6)]), explanation: "S5 says 2005 and illegal entry; S6 says 2017; the form records 2019 and B2." };
  const r = await run(c, { facts: [ent(c, S5, 2005, "without_inspection"), ent(c, q6, 2017, "admitted")], issues: [mixed] });
  assert.ok(cites(r, sent(c, q6).id, "entry.date"), "the 2017 last entry vs form 2019 is kept");
  // S5 may still be cited as the sentence that identifies "he" as the subject; no finding compares its 2005 entry.
  assert.ok(!r.findings.some((f) => f.category === "inconsistency" && /2005/.test(f.explanation)));
  // "first and only": the first entry is also the last, so the comparison is valid
  const S5full = sent(EG09, S5).text;
  const q = "first and only entered the United States illegally near Calexico, California, in 2005";
  const only = text(text(EG09, S5full, `The subject stated that he ${q} and has not left since.`), S6, "");
  const r2 = await run(only, { facts: [ent(only, q, 2005, "without_inspection")], issues: [{ type: "inconsistency", title: "Entry facts conflict with form fields", explanation: "The narrative states the subject entered illegally in 2005, while the form records a 2019 entry with a B2 visa.", evidence: [ev(only, q), { field_path: "entry.date" }], needs_human_review: true, reason: "x" }] });
  assert.ok(!r2.discarded.some((d) => /earlier \(first or previous\) entry/.test(d.reason)), "not withheld for scope");
  assert.ok(r2.findings.some((f) => f.category === "inconsistency" && f.evidence.some((e) => e.sentenceId === sent(only, q).id)), "the only entry is compared with the form");
});

// ---- 2. The deciding requirement explains the citation verdict (UN01) ----
test("live UN01: an order with unknown execution is never explained as a 'confirmed prior removal'", async () => {
  const c = D2("UN01");
  const q = "Records reflect a final order of removal entered against the subject";
  const r = await run(c, { citation: { status: "insufficient_information", explanation: "The narrative confirms a prior removal but does not provide any information about the subject's last entry into the United States, which is required to establish reentry under 8 U.S.C. 1326.", evidence: [ev(c, q)] } });
  assert.equal(r.citation.status, "needs_human_review");
  assert.doesNotMatch(r.citation.explanation, /confirms a prior removal/);
  assert.match(r.citation.explanation, /records a removal order/);
  assert.match(r.citation.explanation, /does not state that the order was executed/);
  assert.ok(!r.humanReview.reasons.some((x) => /confirms a prior removal/.test(x)));
  assert.ok(r.humanReview.required);
});
test("deciding requirement (controls): an executed order stays consistent; a contradicted requirement keeps its mismatch", async () => {
  assert.equal((await run(D2("NC03"))).citation.status, "consistent");
  const r = await run(D2("EG08"));
  assert.equal(r.citation.status, "likely_mismatch");
});

// ---- 3. Withheld claims take their dependent assertions with them (C021-X1, C037-X1) ----
const C021 = load("eval/cases/C021-X1.json");
const C021_S4 = "Subject entered the United States at the Miami International Airport port of entry (MIA) on 12/23/2013.";
const C021_S33 = "Subject arrived at Miami on 12/23/2015 and was admitted as a B2 Visitor until 06/22/2016.";
const c021Run = (c: CaseRecord) => run(c, {
  facts: [ent(c, C021_S4, 2013, "admitted"), ent(c, C021_S33, 2015, "admitted")],
  issues: [{ type: "inconsistency", title: "Entry manner mismatch", explanation: "The narrative describes entry at the Miami port while the form lists NIM.", evidence: [ev(c, C021_S4), { field_path: "entry.manner" }], needs_human_review: true, reason: "Entry manner mismatch" }],
  citation: { status: "likely_mismatch", explanation: "The selected charge of INA 237(a)(1)(B) requires a prior admission and subsequent unlawful presence, but the narrative's entry date and manner conflict with the form fields, creating uncertainty." },
  reasons: ["Conflicting entry dates require adjudication", "Conflicting entry dates and entry manner; requires adjudicator to determine correct facts"],
});
test("live C021-X1: the date conflict is still routed; no explanation or reason asserts the withheld manner conflict", async () => {
  const r = await c021Run(C021);
  assert.ok(cites(r, sent(C021, C021_S4).id, "entry.date"));
  assert.ok(r.humanReview.required);
  assert.ok(r.humanReview.reasons.some((x) => /entry dates?/i.test(x)), "date routing kept");
  assert.ok(!r.humanReview.reasons.some((x) => /entry (dates? and )?(entry )?manner/i.test(x)), r.humanReview.reasons.join(" | "));
  assert.doesNotMatch(r.citation.explanation, /manner conflict/);
  assert.equal(r.citation.status, "consistent", "admission is verified (S33); the remaining concern is the date, which 237(a)(1)(B) does not depend on");
});
test("withheld dependents (control): a genuine manner conflict keeps the manner reason and the qualified charge check", async () => {
  const c = form(C021, { "entry.manner": "EWI" });
  const r = await c021Run(c);
  assert.ok(r.findings.some((f) => f.id === "F-ENTRY-MANNER"));
  assert.ok(r.humanReview.reasons.some((x) => /entry manner/i.test(x)));
  assert.equal(r.citation.status, "needs_human_review");
});
const C037 = load("eval/cases/C037-X1.json");
const C037_S21 = "stated that he and five others crossed the US/MEXICO Border illegally, into Naco, Arizona, on the afternoon of 06/15/2012";
const C037_S19 = "used the services of a local smuggler to help him safely cross the US/Mexico Border";
test("live C037-X1: date routing kept; no manner or place conflict asserted; the date concern does not qualify the manner-based charge", async () => {
  const r = await run(C037, {
    facts: [ent(C037, C037_S21, 2012, "without_inspection")],
    issues: [{ type: "inconsistency", title: "Entry manner mismatch", explanation: "Narrative describes smuggler-assisted crossing, whereas form lists EWI AFOOT.", evidence: [ev(C037, C037_S19), { field_path: "entry.manner" }], needs_human_review: true, reason: "x" },
      { type: "inconsistency", title: "Entry place mismatch", explanation: "Narrative says Naco while the form lists 2 miles E of NAC.", evidence: [{ sentence_id: sent(C037, C037_S21).id, quote: "into Naco, AZ near the port" }, { field_path: "entry.place" }], needs_human_review: true, reason: "x" }],
    citation: { status: "needs_human_review", explanation: "The selected charge of INA 212(a)(6)(A)(i) requires that the subject entered without inspection or admission. The narrative provides conflicting information about the manner and date of entry, making it unclear whether the charge is supported." },
    reasons: ["Conflicting dates for last entry", "Conflicting entry dates, places, and manners in narrative vs form fields"],
  });
  assert.ok(cites(r, sent(C037, C037_S21).id, "entry.date"));
  assert.ok(r.humanReview.reasons.some((x) => /dates for last entry|Entry date differs/i.test(x)));
  assert.ok(!r.humanReview.reasons.some((x) => /places|manners/i.test(x)), r.humanReview.reasons.join(" | "));
  assert.doesNotMatch(r.citation.explanation, /manner and date/);
  assert.equal(r.citation.status, "consistent");
});

// ---- 4. Charge qualification follows the configured requirement (EG06, UN04) ----
const EG06 = D2("EG06");
const EG06_Q = "entered the United States illegally near Sasabe, Arizona, in October 2016";
test("live EG06: a date-only model concern does not qualify a manner-based charge whose requirement is verified", async () => {
  const r = await run(EG06, { facts: [ent(EG06, EG06_Q, 2016, "without_inspection")],
    citation: { status: "needs_human_review", explanation: "The selected charge requires evidence of unlawful entry; the narrative and form fields conflict on the entry date, making it unclear whether the charge is supported." } });
  assert.ok(r.findings.some((f) => f.id === "F-ENTRY-DATE"));
  assert.ok(r.humanReview.required, "the date conflict is still routed");
  assert.equal(r.citation.status, "consistent");
});
test("qualification (controls): a manner concern still qualifies; an unverified requirement stays unresolved", async () => {
  const r = await run(EG06, { facts: [ent(EG06, EG06_Q, 2016, "without_inspection")],
    citation: { status: "needs_human_review", explanation: "The narrative and the form conflict on the manner of entry; unclear whether the subject was inspected." } });
  assert.equal(r.citation.status, "needs_human_review");
  const r2 = await run(D2("EG11"), { citation: { status: "needs_human_review", explanation: "The narrative and form fields conflict on the entry date." } });
  assert.equal(r2.citation.status, "needs_human_review", "the manner is never stated: unresolved");
});
const UN04 = D2("UN04");
const U6 = "crossed the border near Douglas, Arizona, in July 2012", U7 = "crossed near Douglas in 2016";
test("live UN04: an unattributed two-person account about entry YEARS is routed but does not qualify a manner-based charge", async () => {
  const r = await run(UN04, { facts: [ent(UN04, U6, 2012, "without_inspection"), ent(UN04, U7, 2016, "unknown")],
    issues: [{ type: "inconsistency", title: "Conflicting entry dates", explanation: "Narrative reports two different years of entry, 2012 and 2016, while form field lists only 2012.", evidence: [ev(UN04, U6), ev(UN04, U7)], needs_human_review: true, reason: "x" }] });
  assert.ok(r.humanReview.required);
  assert.ok(r.humanReview.accounts?.some((g) => g.sentenceIds.includes(sent(UN04, U7).id)));
  assert.ok(!r.findings.some((f) => f.category === "inconsistency"));
  assert.equal(r.citation.status, "consistent");
});
test("qualification (control): an unattributed two-person account about the MANNER still qualifies a manner-based charge", async () => {
  const c = D2("UN06");
  const a = "entered through the San Ysidro port of entry with a visitor visa in 2018", b = "has never had any immigration document";
  const r = await run(c, { facts: [ent(c, a, 2018, "admitted")],
    issues: [{ type: "inconsistency", title: "Conflicting entry manner", explanation: "One man entered with a visa at a port; the form records EWI.", evidence: [ev(c, a), ev(c, b)], needs_human_review: true, reason: "x" }] });
  assert.equal(r.citation.status, "needs_human_review");
  assert.ok(r.humanReview.required);
});
