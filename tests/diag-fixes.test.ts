// Fixes for the reasoning failures found in the diag-1 diagnostic (branch improve/diag-fixes-1, from df11086).
// POST-OBSERVATION TESTS: the "diag-1 …" tests restate inputs observed in the diag-1 run of df11086 (team-authored
// development cases; the run was not an evaluation). The controls are new, varied wordings. Offline: fake model.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, isPriorRemoval, statesRemovalOrderOnly, type FactsOutput } from "../lib/review/facts";
import { DOCUMENT_RE } from "../lib/review/checklist";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const load = (id: string) => JSON.parse(readFileSync(`eval/diag-1/cases/${id}.json`, "utf8")) as CaseRecord;
const sid = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text).find((s) => s.text.includes(needle))!.id;
const NONE: FactsOutput = { entry_statements: [], removal_statements: [], status_statements: [] };
type Cit = { status: string; explanation: string; evidence?: object[] };
const ALL = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8"];
const run = (c: CaseRecord, facts: FactsOutput, citation: Cit = { status: "consistent", explanation: "Supported." }, opts: { issues?: object[]; elements?: Record<string, { status: string; ids?: string[] }> } = {}) => {
  const elements = ALL.map((id) => ({ element_id: id, status: opts.elements?.[id]?.status ?? "present", sentence_ids: opts.elements?.[id]?.ids ?? [], note: "" }));
  const out = JSON.stringify({ elements, issues: opts.issues ?? [], citation: { evidence: [], ...citation }, human_review: { required: false, reasons: [] } });
  const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? JSON.stringify(facts) : out, attempts: 1 });
  return reviewCase(c, fake);
};
const withText = (c: CaseRecord, from: string, to: string): CaseRecord => ({ ...c, narrative: { ...c.narrative, text: c.narrative.text.replace(from, to) } });
const ids = (r: Awaited<ReturnType<typeof run>>) => r.findings.map((f) => f.id);

// ---- 1. Sentence segmentation and charge wording ----
test("segmentation: legal citations stay in one sentence; ordinary boundaries are unchanged", () => {
  const t = (x: string) => splitSentences(x).map((s) => s.text);
  assert.deepEqual(t("The subject is charged under 8 U.S.C. 1326 as an alien found in the United States after removal. He was processed."),
    ["The subject is charged under 8 U.S.C. 1326 as an alien found in the United States after removal.", "He was processed."]);
  assert.equal(t("He was processed under 8 C.F.R. 235.3(b) and served the I-860. He declined to make a statement.").length, 2);
  assert.equal(t("He is inadmissible under Sec. 212(a)(6)(A)(i) of the Act. He was detained.").length, 2);
  assert.equal(t("He is inadmissible under Section 212(a)(6)(A)(i). He was detained.").length, 2);
});
test("charge wording is not evidence of a past removal; a separately stated removal in the same sentence still is", () => {
  for (const x of ["The subject is charged under 8 U.S.C. 1326 as an alien found in the United States after removal.",
    "He is being charged with reentry after removal under 8 U.S.C. 1326.",
    "The subject is inadmissible under Section 212(a)(9)(A)(ii) of the INA, in that he was previously removed.",
    "The selected charge requires a prior removal or deportation."]) assert.equal(isPriorRemoval(x), false, x);
  for (const x of ["He was removed to Mexico on 05/20/2014; he is now charged under 8 U.S.C. 1326.",
    "Records show he was deported to Guatemala on 05/02/2015, and he is charged under 8 U.S.C. 1326."]) assert.equal(isPriorRemoval(x), true, x);
});
test("diag-1 DG07: the 1326 charge with an explicit no-removal record and denial is a mismatch; no false ground or history flags", async () => {
  const c = load("DG07");
  const r = await run(c, { ...NONE, entry_statements: [{ sentence_id: sid(c, "Eagle Pass"), quote: "he entered without inspection by crossing the river near Eagle Pass, Texas, in August 2019", event: "us_entry", country: "United States", year: 2019, manner: "without_inspection", person: "unclear" }] } as FactsOutput,
    { status: "likely_mismatch", explanation: "The selected charge requires a prior removal, but the narrative and records show no such removal." });
  assert.equal(r.citation.status, "likely_mismatch");
  assert.ok(ids(r).includes("C-1"));
  assert.ok(!ids(r).includes("M-N5"), "the stated ground is read");
  assert.ok(!ids(r).some((x) => x.startsWith("F-HISTORY")), "the charge clause is not a past removal");
});

// ---- 2. Removal event semantics ----
test("removal semantics: orders, proceedings, processing, departures and negations are not completed removals", () => {
  for (const x of ["An immigration judge ordered the subject removed in absentia on 09/12/2016.", "He was placed in removal proceedings.",
    "He will be held pending removal proceedings.", "He was granted voluntary departure in 2012.", "He has never been removed or deported."])
    assert.equal(isPriorRemoval(x), false, x);
  for (const x of ["He was physically removed to Mexico through Laredo on 05/20/2014.", "He received an Expedited Removal on 06/08/2005.",
    "He was served a Reinstatement of his prior order of exclusion that was executed on 06/08/2005.", "He was ordered removed in 2012 and was removed to Honduras in 2013."])
    assert.equal(isPriorRemoval(x), true, x);
  assert.equal(statesRemovalOrderOnly("An immigration judge ordered the subject removed in absentia on 09/12/2016."), true);
  assert.equal(statesRemovalOrderOnly("He was ordered removed in 2012 and was removed to Honduras in 2013."), false);
});
test("diag-1 DU03: a removal order without documented execution leaves the 1326 requirement unresolved (routed), whatever the model says", async () => {
  const c = load("DU03");
  const facts = { ...NONE, removal_statements: [{ sentence_id: sid(c, "in absentia"), quote: "ordered the subject removed in absentia on 09/12/2016", person: "unclear" }] } as FactsOutput;
  for (const status of ["consistent", "likely_mismatch"]) {
    const r = await run(c, facts, { status, explanation: "The narrative documents a prior removal order and subsequent reentry." });
    assert.equal(r.citation.status, "needs_human_review", status);
    assert.match(r.citation.explanation, /removal order.*not state that the order was executed/);
    assert.ok(r.humanReview.required);
    assert.ok(!ids(r).includes("C-1"));
  }
});
test("control: the same order WITH execution stated supports the 1326 charge", async () => {
  const c = withText(load("DU03"), "The records reviewed do not show whether the order was executed or whether the subject departed the United States.", "The order was executed and the subject was removed to Guatemala on 11/02/2016.");
  const r = await run(c, NONE, { status: "consistent", explanation: "A prior removal is documented." });
  assert.equal(r.citation.status, "consistent");
});

// ---- 3. Reported speech and attribution ----
test("diag-1 DU02: a cousin's 'he was deported' does not establish the subject's history; it is routed as unattributed", async () => {
  const c = load("DU02");
  const s5 = sid(c, "he was deported");
  for (const person of ["other", "unclear"]) {
    const r = await run(c, { ...NONE, removal_statements: [{ sentence_id: s5, quote: "he was deported to Honduras in 2014", person }] } as FactsOutput);
    assert.ok(!ids(r).some((x) => x.startsWith("F-HISTORY")), person);
    assert.ok((r.humanReview.accounts ?? []).some((g) => g.sentenceIds.includes(s5)), "routed with S5 named");
  }
});
test("reported speech controls: an explicit subject, or the subject's own report, still establishes the removal", async () => {
  const base = load("DU02");
  const from = "told Agent [REDACTED (b)(6), (b)(7)(C)] that he was deported to Honduras in 2014";
  for (const to of ["told Agent [REDACTED (b)(6), (b)(7)(C)] that the subject was deported to Honduras in 2014"]) {
    const r = await run(withText(base, from, to), NONE);
    assert.ok(ids(r).includes("F-HISTORY"), to);
  }
  const own = withText(base, "The subject's cousin, [REDACTED (b)(6), (b)(7)(C)], who lives in the same apartment and is a lawful permanent resident, told Agent [REDACTED (b)(6), (b)(7)(C)] that he was deported to Honduras in 2014 and came back the following year.", "The subject stated that he was deported to Honduras in 2014 and came back the following year.");
  assert.ok(ids(await run(own, NONE)).includes("F-HISTORY"));
  const brother = withText(base, "The subject's cousin", "The subject's brother");
  assert.ok(!ids(await run(brother, NONE)).some((x) => x.startsWith("F-HISTORY")));
});

// ---- 4. Last-entry comparisons ----
const dg02Facts = (c: CaseRecord): FactsOutput => ({ ...NONE, entry_statements: [
  { sentence_id: sid(c, "first came"), quote: "first came to the United States in July 2009, when he flew into Los Angeles International Airport and was admitted as a B2 visitor", event: "us_entry", country: "United States", year: 2009, manner: "admitted", person: "unclear" },
  // As observed: the extraction's quote omits "with a guide", so it does not match the text exactly.
  { sentence_id: sid(c, "most recently"), quote: "He stated that he most recently re-entered the United States on or about April 15, 2017, by walking through the desert near Sasabe, Arizona, and that he did not present himself for inspection", event: "us_entry", country: "United States", year: 2017, manner: "without_inspection", person: "unclear" },
] } as FactsOutput);
test("diag-1 DG02: the form's manner (B2) conflicts with the narrative's last entry; no charge mismatch from the first entry", async () => {
  const c = load("DG02");
  const r = await run(c, dg02Facts(c));
  const f = r.findings.find((x) => x.id === "F-ENTRY-MANNER");
  assert.ok(f, "the form-versus-last-entry conflict is reported");
  assert.ok(f!.evidence.some((e) => e.sentenceId === sid(c, "most recently")) && f!.evidence.some((e) => e.fieldPath === "entry.manner"));
  assert.ok(!f!.evidence.some((e) => e.sentenceId === sid(c, "first came")), "the first entry is not used");
  assert.ok(!ids(r).includes("C-1"));
  assert.equal(r.citation.status, "needs_human_review", "a conflict the charge depends on qualifies it, without asserting a mismatch");
});
test("last-entry controls: the form agreeing with the last entry (DN02), and a first entry alone, raise nothing", async () => {
  const dn = load("DN02");
  const r = await run(dn, dg02Facts(dn));
  assert.ok(!ids(r).some((x) => x.startsWith("F-ENTRY-MANNER") || x === "C-1"));
  assert.equal(r.citation.status, "consistent");
  const onlyFirst = withText(load("DG02"), "The subject stated that he most recently re-entered the United States on or about April 15, 2017, by walking through the desert near Sasabe, Arizona, with a guide, and that he did not present himself for inspection.", "");
  const r2 = await run(onlyFirst, { ...NONE, entry_statements: [dg02Facts(load("DG02")).entry_statements[0]] } as FactsOutput);
  assert.ok(!ids(r2).includes("F-ENTRY-MANNER"), "a first entry does not conflict with the last-entry field");
});

// ---- 5. Identity-document wording ----
test("diag-1 DN06/DU01/DU02: identity-document paraphrases satisfy N1; permission documents do not", () => {
  for (const x of ["He presented a Honduran identity card.", "The man stated that he is a national of Mexico and carried no papers of any kind.",
    "Neither man carried identification.", "He carried a Salvadoran identity document (DUI).", "He had no documents of any kind.", "He showed the agents his cédula and a voter identification card."])
    assert.ok(DOCUMENT_RE.test(x), x);
  for (const x of ["He stated that he has no immigration documents allowing him to remain in the United States.", "He has no papers allowing him to work here.",
    "The police requested identification assistance.", "His visa application was denied in 2015.", "He does not have any immigration papers."])
    assert.ok(!DOCUMENT_RE.test(x), x);
});
test("diag-1 DU02: a model 'present' for N1 citing 'presented a Honduran identity card' is kept, not downgraded to unclear", async () => {
  const c = load("DU02");
  const r = await run(c, NONE, undefined, { elements: { N1: { status: "present", ids: [sid(c, "Honduran identity card")] } } });
  assert.ok(!ids(r).includes("U-N1"));
});

// ---- Charge qualification narrowed to the requirement's facts ----
test("diag-1 DG10: a model mismatch about the entry PLACE does not qualify a manner-based charge; the place finding keeps its routing", async () => {
  const c = load("DG10");
  const s6 = sid(c, "near Del Rio");
  const r = await run(c, { ...NONE, entry_statements: [{ sentence_id: s6, quote: "last entered the United States in May 2019 by crossing the Rio Grande on foot near Del Rio, Texas, without being inspected", event: "us_entry", country: "United States", year: 2019, manner: "without_inspection", person: "unclear" }] } as FactsOutput,
    { status: "likely_mismatch", explanation: "Selected charge relies on entry place; narrative and form disagree on place of last entry." },
    { issues: [{ type: "inconsistency", title: "Entry place mismatch", explanation: "Narrative states entry near Del Rio, Texas, while form field lists near Calexico, California.", evidence: [{ sentence_id: s6, quote: "near Del Rio, Texas" }, { field_path: "entry.place" }], needs_human_review: true, reason: "Conflicting accounts of place of entry" }] });
  assert.equal(r.citation.status, "consistent");
  assert.ok(r.findings.some((f) => f.evidence.some((e) => e.fieldPath === "entry.place")), "the place finding is kept");
  assert.ok(r.humanReview.required, "and routed");
});
test("qualification control: a model concern about the MANNER is still qualified (not consistent, not a mismatch)", async () => {
  const c = load("DG10");
  const s6 = sid(c, "near Del Rio");
  const r = await run(c, { ...NONE, entry_statements: [{ sentence_id: s6, quote: "last entered the United States in May 2019 by crossing the Rio Grande on foot near Del Rio, Texas, without being inspected", event: "us_entry", country: "United States", year: 2019, manner: "without_inspection", person: "unclear" }] } as FactsOutput,
    { status: "likely_mismatch", explanation: "The narrative suggests he may have been inspected at a port of entry." });
  assert.equal(r.citation.status, "needs_human_review");
});

// ---- Removal orders against a NEGATIVE record (found in the replay of this change: F051 lost its routing) ----
test("a removal order while the record is NEGATIVE: the subject's own is a history item; an unattributable one is routed; never a removal", async () => {
  const base = load("DU04"); // a one-subject narrative with a NEGATIVE record
  const own = withText(base, "He travelled to Michigan by car with relatives.", "Records show that an immigration judge ordered the subject removed in absentia in 2021. He travelled to Michigan by car with relatives.");
  const r1 = await run(own, NONE);
  assert.ok(ids(r1).includes("F-HISTORY-ORDER"));
  assert.ok(!ids(r1).includes("F-HISTORY"), "an order is not a removal");
  const f051 = JSON.parse(readFileSync("eval/fresh/cases/F051.json", "utf8")) as CaseRecord;
  const r2 = await run(f051, NONE);
  const s8 = sid(f051, "one had been ordered removed");
  assert.ok(!ids(r2).some((x) => x.startsWith("F-HISTORY")));
  assert.ok((r2.humanReview.accounts ?? []).some((g) => g.sentenceIds.includes(s8)), "the group member's order is routed");
});

// ---- Execution bound to the removal order (review of d924152: "executed" anywhere in the clause counted) ----
// POST-OBSERVATION: the "unrelated warrant executed" example restates the review's reproduction.
const ORDER_CASES: { name: string; text: string; orderOnly: boolean }[] = [
  { name: "removal order only", text: "Records show that an immigration judge in Chicago ordered the subject removed in absentia on 09/12/2016.", orderOnly: true },
  { name: "unrelated warrant executed", text: "An immigration judge ordered the subject removed in absentia in 2016, with an arrest warrant executed in 2024.", orderOnly: true },
  { name: "order explicitly not executed", text: "An immigration judge ordered the subject removed in absentia in 2016, but the order was never executed.", orderOnly: true },
  { name: "execution unknown", text: "An immigration judge ordered the subject removed in absentia in 2016; it is unknown whether the order was executed.", orderOnly: true },
  { name: "order explicitly executed", text: "An immigration judge ordered the subject removed in absentia in 2016, and the order was executed on 11/02/2016.", orderOnly: false },
  { name: "separate completed removal in a mixed sentence", text: "An immigration judge ordered the subject removed in 2016, and he was removed to Guatemala through Houston on 11/02/2016.", orderOnly: false },
];
test("helper: execution must be the order's own, affirmed; warrants, negation, unknowns and hypotheticals do not execute it", () => {
  for (const x of ORDER_CASES) {
    assert.equal(statesRemovalOrderOnly(x.text), x.orderOnly, x.name);
    assert.equal(isPriorRemoval(x.text), !x.orderOnly, x.name);
  }
  // The same, inside one clause (no clause split to rely on)
  for (const t of ["The removal order issued in absentia in 2016 was never executed.", "An immigration judge ordered the subject removed in 2016 and the order has not been executed.",
    "An immigration judge ordered the subject removed in 2016 and records do not show whether the order was executed.", "An immigration judge ordered the subject removed in 2016, pending execution of the order.",
    "An immigration judge ordered the subject removed in 2016, and the order will be executed after his hearing.", "An immigration judge ordered him removed in 2016 and a search warrant was executed at his home in 2024.",
    "An immigration judge ordered him removed in 2016 but he never left the United States."]) {
    assert.equal(statesRemovalOrderOnly(t), true, t);
    assert.equal(isPriorRemoval(t), false, t);
  }
  for (const t of ["The 2016 removal order was executed on 11/02/2016.", "Officers executed the removal order on 11/02/2016.",
    "He was served a Reinstatement of his original prior order of exclusion that was executed on 06/08/2005.", "An immigration judge ordered him removed in 2016 and he departed the United States in 2017."]) {
    assert.equal(isPriorRemoval(t), true, t);
    assert.equal(statesRemovalOrderOnly(t), false, t);
  }
  for (const t of ["He may be ordered removed if he does not appear.", "He was offered a stipulated order of removal, which he declined.", "If he is ordered removed, he will be detained."])
    assert.equal(statesRemovalOrderOnly(t) || isPriorRemoval(t), false, t);
});
test("pipeline: under 8 U.S.C. 1326 only an executed order or a completed removal supports the charge; against a NEGATIVE record only those are removal conflicts", async () => {
  const du03 = load("DU03");
  const orig = "Records show that an immigration judge in Chicago, Illinois, ordered the subject removed in absentia on 09/12/2016. The records reviewed do not show whether the order was executed or whether the subject departed the United States.";
  for (const x of ORDER_CASES) {
    const c = withText(du03, orig, x.text);
    assert.notEqual(c.narrative.text, du03.narrative.text);
    const r = await run(c, NONE, { status: "consistent", explanation: "A prior removal is documented." });
    assert.equal(r.citation.status, x.orderOnly ? "needs_human_review" : "consistent", x.name);
    if (x.orderOnly) assert.ok(r.humanReview.required, `${x.name}: routed`);
    const neg = { ...c, selectedCharges: [{ citation: "INA 212(a)(6)(A)(i)", source: "team-assigned-for-testing" }], facts: c.facts.map((f) => (f.path === "history.immigration_record" ? { ...f, value: "NEGATIVE" } : f)) } as CaseRecord;
    const rn = await run(neg, NONE);
    assert.equal(ids(rn).includes("F-HISTORY"), !x.orderOnly, `${x.name}: removal conflict`);
    assert.equal(ids(rn).includes("F-HISTORY-ORDER"), x.orderOnly, `${x.name}: order item`);
  }
});
