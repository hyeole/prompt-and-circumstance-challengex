// Review findings on 06278ed (branch improve/diag2-fixes-1): crossing polarity and order-claim suppression. New
// wordings built on the locked diag-2 cases (team-authored development cases). Pipeline tests import only reviewCase,
// so this file also runs on 06278ed to record the earlier behaviour. Offline: fake model.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, type FactsOutput } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const load = (id: string) => JSON.parse(readFileSync(`eval/diag-2/cases/${id}.json`, "utf8")) as CaseRecord;
const NONE: FactsOutput = { entry_statements: [], removal_statements: [], status_statements: [] };
const ALL = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8"];
const run = (c: CaseRecord, issues: object[] = []) => {
  const elements = ALL.map((id) => ({ element_id: id, status: "present", sentence_ids: [], note: "" }));
  const out = JSON.stringify({ elements, issues, citation: { evidence: [], status: "consistent", explanation: "Supported." }, human_review: { required: false, reasons: [] } });
  const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? JSON.stringify(NONE) : out, attempts: 1 });
  return reviewCase(c, fake);
};
const ids = (r: Awaited<ReturnType<typeof run>>) => r.findings.map((f) => f.id);
const sent = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text, c.narrative.pageSpans).find((s) => s.text.includes(needle))!;

// EG12: single person, form EWI AFOOT, "near Sasabe, AZ"; its ENTRY sentence is replaced by the wording under test.
const EG12 = load("EG12");
const ENTRY = "He stated that he crossed the border illegally on foot near Sasabe, Arizona, on 02/14/2017 with a group of five, walked for two nights, and was driven to Phoenix.";
const withEntry = (s: string): CaseRecord => ({ ...EG12, narrative: { ...EG12.narrative, text: EG12.narrative.text.replace(ENTRY, s) } });

// ---- 1. Crossing polarity: only an affirmed, actual crossing is compared ----
test("mode: a denied or negated truck crossing is not a vehicle crossing", async () => {
  assert.ok(EG12.narrative.text.includes(ENTRY));
  for (const s of ["The subject never crossed the border in a truck.", "The subject denied crossing the border in a truck."])
    assert.ok(!ids(await run(withEntry(s))).includes("F-ENTRY-MODE"), s);
});
test("mode: hypothetical, planned or attempted truck crossings are not vehicle crossings", async () => {
  for (const s of ["If he had crossed the border in a truck, he would have paid more.", "He planned to cross the border in a truck.", "He tried to cross the border in a truck but was turned back in Mexico."])
    assert.ok(!ids(await run(withEntry(s))).includes("F-ENTRY-MODE"), s);
});
test("mode: a denied truck crossing followed by an affirmed crossing on foot agrees with EWI AFOOT", async () => {
  for (const s of ["The subject denied crossing the border in a truck. He stated that he crossed the border on foot near Sasabe, Arizona, on 02/14/2017.",
    "The subject did not cross the border in a truck but walked across the border near Sasabe, Arizona, on 02/14/2017."]) {
    const r = await run(withEntry(s));
    assert.ok(!ids(r).includes("F-ENTRY-MODE"), s);
    assert.ok(!ids(r).includes("F-ENTRY-PLACE"), s);
  }
});
test("mode (positive control): an affirmed truck crossing is still a mode conflict with EWI AFOOT", async () => {
  for (const s of ["The subject crossed the border near Sasabe, Arizona, on 02/14/2017 hidden in a truck.", "He admitted that he crossed the border near Sasabe, Arizona, in the back of a truck on 02/14/2017."]) {
    const c = withEntry(s);
    const r = await run(c);
    assert.ok(r.findings.some((f) => f.id === "F-ENTRY-MODE" && f.evidence.some((e) => e.sentenceId === sent(c, "crossed the border").id)), s);
  }
});
test("place: a denied or hypothetical crossing in another state is not the place of entry; an affirmed one still is", async () => {
  for (const s of ["The subject denied crossing the border near Columbus, New Mexico.", "The subject never crossed the border near Columbus, New Mexico.", "If he had crossed near Columbus, New Mexico, he would have been caught."])
    assert.ok(!ids(await run(withEntry(s))).includes("F-ENTRY-PLACE"), s);
  const c = withEntry("The subject crossed the border on foot west of Columbus, New Mexico, on 02/14/2017.");
  assert.ok(ids(await run(c)).includes("F-ENTRY-PLACE"));
});
test("place and mode (attribution unchanged): an unattributable affirmed truck crossing among two men is routed, not a finding", async () => {
  const c = load("UN04");
  const v = { ...c, narrative: { ...c.narrative, text: c.narrative.text.replace("crossed near Douglas in 2016 with a cousin", "crossed the border near Douglas in 2016 hidden in the trunk of a car") } };
  const r = await run(v);
  assert.ok(!ids(r).includes("F-ENTRY-MODE"));
  assert.ok(r.humanReview.accounts?.some((g) => g.fieldPath === "entry.manner"));
});

// ---- 2. Order claims: only the false inference is withheld ----
const EG08 = load("EG08");
const S5 = "On 06/20/2015 an immigration judge in San Antonio, Texas, ordered the subject removed.";
const add = (extra: string): CaseRecord => ({ ...EG08, narrative: { ...EG08.narrative, text: EG08.narrative.text.replace(S5, `${S5} ${extra}`) } });
const claim = (c: CaseRecord, title: string, explanation: string, quotes: string[]) =>
  ({ type: "inconsistency", title, explanation, evidence: quotes.map((q) => ({ sentence_id: sent(c, q).id, quote: q })), needs_human_review: true, reason: title });
const kept = (r: Awaited<ReturnType<typeof run>>, title: string) => r.findings.some((f) => f.source === "model" && f.title === title);

test("order claims: two different dates for the SAME removal order are a genuine contradiction and are kept", async () => {
  const x = "Court records show that this same removal order was entered on 03/11/2016.";
  const c = add(x);
  const r = await run(c, [claim(c, "Two dates for the same removal order", "S5 dates the removal order 06/20/2015; the next sentence dates the same removal order 03/11/2016.", [S5, x])]);
  assert.ok(kept(r, "Two dates for the same removal order"));
});
test("order claims: an explicitly identified different owner of the order is a genuine contradiction and is kept", async () => {
  const x = "A later records review found that the removal order dated 06/20/2015 was entered against the subject's brother, not against the subject.";
  const c = add(x);
  const r = await run(c, [claim(c, "Whose removal order", "S5 says the removal order concerned the subject; the next sentence says the same order concerned his brother.", [S5, x])]);
  assert.ok(kept(r, "Whose removal order"));
});
test("order claims: an executed order against a statement that it was never executed is a genuine contradiction and is kept", async () => {
  const x = "A second records check states that the order was executed on 08/01/2015.";
  const c = add(x);
  const n = "The order was never executed";
  const r = await run(c, [claim(c, "Execution of the removal order", "One record says the removal order was executed on 08/01/2015; another says it was never executed.", [x, n])]);
  assert.ok(kept(r, "Execution of the removal order"));
});
test("order claims: the false inference (an order vs 'never deported' / 'no removal' / non-execution) is still withheld", async () => {
  const s7 = "A records check revealed no removal, deportation or exclusion of the subject.";
  const s8 = "Asked directly, the subject stated that he has never been deported or sent back to Mexico.";
  const n = "The order was never executed";
  const r = await run(EG08, [claim(EG08, "Order vs no removal", "A removal order was issued, yet no removal occurred.", [S5, s7]),
    claim(EG08, "Order vs never deported", "He says he was never deported, yet he was ordered removed.", [s8, S5]),
    claim(EG08, "Order vs non-execution", "A removal order was issued, yet it was never executed.", [S5, n])]);
  for (const t of ["Order vs no removal", "Order vs never deported", "Order vs non-execution"]) assert.ok(!kept(r, t), t);
});
