// Model-generated contradictions must rest on genuinely incompatible assertions (branch improve/contradiction-compat-1,
// from 286d42d). POST-OBSERVATION: the C037-X1 and C021-X1 reproductions restate the two incorrect model findings seen in
// the live verification of 286d42d (reused development cases; not an evaluation). The paired controls are new wordings:
// compatible combinations, genuine contradictions, unresolved attribution, and exact quotes that do not support a
// conflict. Offline: fake model.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, crossingMode, describesRecordHistory, formEntryMode, type FactsOutput } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const NONE: FactsOutput = { entry_statements: [], removal_statements: [], status_statements: [] };
const ALL = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8"];
type Cit = { status: string; explanation: string; evidence?: object[] };
const run = (c: CaseRecord, issues: object[] = [], citation: Cit = { status: "consistent", explanation: "Supported." }, facts: FactsOutput | string = NONE) => {
  const elements = ALL.map((id) => ({ element_id: id, status: "present", sentence_ids: [], note: "" }));
  const out = JSON.stringify({ elements, issues, citation: { evidence: [], ...citation }, human_review: { required: false, reasons: [] } });
  const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? (typeof facts === "string" ? facts : JSON.stringify(facts)) : out, attempts: 1 });
  return reviewCase(c, fake);
};
const sentenceOf = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text, c.narrative.pageSpans).find((s) => s.text.includes(needle))!;
const claim = (c: CaseRecord, field: string, quote: string, title: string, explanation: string) =>
  ({ type: "inconsistency", title, explanation, evidence: [{ field_path: field }, { sentence_id: sentenceOf(c, quote).id, quote }], needs_human_review: true, reason: explanation });
const modelConflict = (r: Awaited<ReturnType<typeof run>>, title: string) => r.findings.find((f) => f.source === "model" && f.title === title);

// A single-person interior case (based on diag-1 DN01's form: EWI AFOOT, NEGATIVE record) with a chosen ENTRY section.
const base = JSON.parse(readFileSync("eval/diag-1/cases/DN01.json", "utf8")) as CaseRecord;
const mk = (entry: string, opts: { people?: boolean } = {}): CaseRecord => ({
  ...base, id: "SYN",
  narrative: { text: `ENCOUNTER:\nOn September 14, 2023, Border Patrol Agents encountered ${opts.people ? "[REDACTED (b)(6), (b)(7)(C)] and [REDACTED (b)(6), (b)(7)(C)]" : "the subject"} near Kalamazoo, Michigan. ${opts.people ? "Both men" : "The subject"} stated that ${opts.people ? "they are citizens" : "he is a citizen"} of Honduras without immigration documents.\nENTRY:\n${entry}\nDISPOSITION:\nThe subject was processed for a Notice to Appear.` },
});

// ---- Reproductions of the two live findings (actual claim text and quotes) ----
test("live C037-X1: smuggler assistance does not contradict the form's EWI AFOOT; the planted date conflict is kept", async () => {
  const c = JSON.parse(readFileSync("eval/cases/C037-X1.json", "utf8")) as CaseRecord;
  const q = "used the services of a local smuggler to help him safely cross the US/Mexico Border";
  const r = await run(c, [claim(c, "entry.manner", q, "Entry manner mismatch", "Narrative describes smuggler-assisted crossing, whereas form lists EWI AFOOT.")]);
  assert.equal(modelConflict(r, "Entry manner mismatch"), undefined);
  assert.ok(r.discarded.some((d) => d.title === "Entry manner mismatch" && /smuggler or guide is compatible/.test(d.reason)));
  assert.ok(r.findings.some((f) => f.id === "F-ENTRY-DATE"), "the planted date conflict remains");
});
test("live C021-X1: a lawful B2 admission does not contradict a NEGATIVE immigration record", async () => {
  const c = JSON.parse(readFileSync("eval/cases/C021-X1.json", "utf8")) as CaseRecord;
  const q = "Subject arrived at Miami on 12/23/2015 and was admitted as a B2 Visitor until 06/22/2016.";
  const r = await run(c, [claim(c, "history.immigration_record", q, "Immigration record inconsistency", "Form history.immigration_record is NEGATIVE but narrative documents prior admission and overstay.")]);
  assert.equal(modelConflict(r, "Immigration record inconsistency"), undefined);
  assert.ok(r.discarded.some((d) => d.title === "Immigration record inconsistency" && /not history that the immigration record/.test(d.reason)));
  assert.ok(!r.humanReview.reasons.some((x) => /Immigration record inconsistency/.test(x)), "a routing reason resting on the withheld claim is not kept");
});

// ---- Manner of entry: attributes compared independently ----
test("manner: compatible combinations are not conflicts (assistance, same category, no stated manner)", async () => {
  for (const [entry, quote] of [
    ["The subject stated that he paid a smuggler to guide him across the border near Roma, Texas, on 03/03/2019.", "paid a smuggler to guide him across the border"],
    ["The subject stated that a guide helped him wade across the river near Roma, Texas, on 03/03/2019.", "a guide helped him wade across the river"],
    ["The subject stated that he crossed the border illegally on foot near Roma, Texas, on 03/03/2019 with the help of a smuggler.", "crossed the border illegally on foot"],
    // Exact quote, but it states no manner, crossing or mode at all
    ["The subject stated that he travelled by bus to Reynosa, Mexico. He entered the United States near Roma, Texas, on 03/03/2019 without inspection.", "travelled by bus to Reynosa, Mexico"],
  ]) {
    const c = mk(entry);
    const r = await run(c, [claim(c, "entry.manner", quote, "Manner differs", `The narrative says "${quote}", whereas the form lists EWI AFOOT.`)]);
    assert.equal(modelConflict(r, "Manner differs"), undefined, entry);
    assert.ok(r.discarded.some((d) => d.title === "Manner differs" && /withheld/.test(d.reason)), entry);
  }
});
test("manner: genuine contradictions are kept (incompatible category; incompatible mode for the same crossing)", async () => {
  for (const [entry, quote] of [
    ["The subject stated that he was admitted at the Hidalgo port of entry with a B2 visa on 03/03/2019.", "was admitted at the Hidalgo port of entry with a B2 visa"],
    ["The subject stated that he crossed the border illegally near Roma, Texas, on 03/03/2019, hidden in a car driven by a smuggler.", "crossed the border illegally near Roma, Texas, on 03/03/2019, hidden in a car"],
  ]) {
    const c = mk(entry);
    const r = await run(c, [claim(c, "entry.manner", quote, "Manner differs", `The narrative says "${quote}", whereas the form lists EWI AFOOT.`)]);
    // Kept as a conflict: either the model's finding or the deterministic comparison's, citing the sentence.
    const sid = sentenceOf(c, quote).id;
    assert.ok(r.findings.some((f) => f.category === "inconsistency" && f.evidence.some((e) => e.sentenceId === sid)), entry);
    assert.ok(!r.discarded.some((d) => d.title === "Manner differs" && /withheld/.test(d.reason)), entry);
  }
});
test("manner: an incompatible statement whose person cannot be attributed is routed, not asserted", async () => {
  const c = mk("[REDACTED (b)(6), (b)(7)(C)] stated that he was admitted at the Hidalgo port of entry with a B2 visa on 03/03/2019.", { people: true });
  const q = "was admitted at the Hidalgo port of entry with a B2 visa";
  const r = await run(c, [claim(c, "entry.manner", q, "Manner differs", "Admitted with a visa, whereas the form lists EWI AFOOT.")]);
  assert.equal(modelConflict(r, "Manner differs"), undefined);
  assert.ok(r.humanReview.required);
  assert.ok(r.humanReview.accounts?.some((a) => a.sentenceIds.includes(sentenceOf(c, q).id)));
});
test("mode helpers: form codes and stated crossing modes", () => {
  assert.equal(formEntryMode("EWI AFOOT"), "foot");
  assert.equal(formEntryMode("EWI"), undefined);
  assert.equal(formEntryMode("AIR"), undefined);
  assert.equal(crossingMode("He crossed the river on foot."), "foot");
  assert.equal(crossingMode("He crossed the border hidden in a truck driven by a smuggler, then walked to the road."), undefined, "two modes: undetermined");
  assert.equal(crossingMode("He was picked up by a driver and taken to Houston."), undefined, "no crossing or entry");
  assert.equal(crossingMode("He used a smuggler to cross the border."), undefined, "assistance is not a mode");
});

// ---- NEGATIVE immigration record: the field's scope ----
test("record: admission, visa and overstay alone do not contradict a NEGATIVE record", async () => {
  for (const [entry, quote] of [
    ["The subject stated that he was admitted at Miami as a B2 visitor on 03/03/2019 and remained beyond his authorized stay.", "was admitted at Miami as a B2 visitor on 03/03/2019"],
    ["Records reveal the subject to be an overstay of his B2 visa.", "Records reveal the subject to be an overstay of his B2 visa."],
    // Exact quote of current charge wording: not a past event
    ["The subject entered without inspection near Roma, Texas, on 03/03/2019. The subject is removable under Section 237(a)(1)(B) of the INA.", "The subject is removable under Section 237(a)(1)(B) of the INA."],
  ]) {
    const c = mk(entry);
    const r = await run(c, [claim(c, "history.immigration_record", quote, "Record differs", "The form's immigration record is NEGATIVE but the narrative documents immigration history.")]);
    assert.equal(modelConflict(r, "Record differs"), undefined, entry);
    assert.ok(r.discarded.some((d) => d.title === "Record differs" && /not history that the immigration record/.test(d.reason)), entry);
  }
});
test("record: genuine subject-specific history conflicts are kept (removal; prior apprehension and return)", async () => {
  for (const [entry, quote] of [
    ["The subject stated that he was removed to Honduras through Houston, Texas, on 05/02/2015. He re-entered near Roma, Texas, on 03/03/2019 without inspection.", "was removed to Honduras through Houston, Texas, on 05/02/2015"],
    ["The subject stated that he was previously apprehended by Border Patrol in 2012 and voluntarily returned to Mexico. He re-entered near Roma, Texas, on 03/03/2019 without inspection.", "was previously apprehended by Border Patrol in 2012 and voluntarily returned to Mexico"],
  ]) {
    const c = mk(entry);
    const sid = sentenceOf(c, quote).id;
    const r = await run(c, [claim(c, "history.immigration_record", quote, "Record differs", "The form's immigration record is NEGATIVE but the narrative documents prior immigration history.")]);
    assert.ok(!r.discarded.some((d) => d.title === "Record differs" && /not history that the immigration record/.test(d.reason)), entry);
    assert.ok(r.findings.some((f) => (f.category === "inconsistency" || f.category === "unclear") && f.evidence.some((e) => e.sentenceId === sid) && f.evidence.some((e) => e.fieldPath === "history.immigration_record")), entry);
  }
});
test("record: an unattributable removal is routed, not asserted against this subject", async () => {
  const c = mk("[REDACTED (b)(6), (b)(7)(C)] stated that he was deported to Honduras in 2015.", { people: true });
  const q = "stated that he was deported to Honduras in 2015";
  const r = await run(c, [claim(c, "history.immigration_record", q, "Record differs", "NEGATIVE record, but a deportation is described.")]);
  assert.equal(modelConflict(r, "Record differs"), undefined);
  assert.ok(!r.findings.some((f) => f.id === "F-HISTORY"));
  assert.ok(r.humanReview.required);
});
test("record scope helper", () => {
  for (const t of ["He was removed to Mexico in 2014.", "An immigration judge ordered him removed in 2016.", "He was previously apprehended by Border Patrol and voluntarily returned.", "He has a prior immigration violation."])
    assert.equal(describesRecordHistory(t), true, t);
  for (const t of ["He was admitted as a B2 visitor until 06/22/2016.", "Records reveal him to be an overstay.", "He entered with a valid visa at Miami.", "The subject is removable under Section 237(a)(1)(B)."])
    assert.equal(describesRecordHistory(t), false, t);
});

// ---- DU03: the explanation names the order and the undocumented execution; the verdict stays unresolved ----
test("diag-1 DU03 (live path): a model 'consistent' with its own evidence gets the removal-order explanation, still unresolved", async () => {
  const c = JSON.parse(readFileSync("eval/diag-1/cases/DU03.json", "utf8")) as CaseRecord;
  const s7 = sentenceOf(c, "ordered the subject removed in absentia");
  const r = await run(c, [], { status: "consistent", explanation: "The narrative documents a prior removal order and subsequent reentry.", evidence: [{ sentence_id: s7.id, quote: "ordered the subject removed in absentia on 09/12/2016" }] });
  assert.equal(r.citation.status, "needs_human_review");
  assert.ok(r.humanReview.required);
  assert.match(r.citation.explanation, /records a removal order/);
  assert.match(r.citation.explanation, /does not state that the order was executed/);
  assert.ok(r.citation.evidence.some((e) => e.sentenceId === s7.id));
  // The partial-review disclosure is kept when the extraction fails
  const f = await run(c, [], { status: "consistent", explanation: "Supported.", evidence: [{ sentence_id: s7.id, quote: "ordered the subject removed in absentia on 09/12/2016" }] }, "not json");
  assert.equal(f.citation.status, "needs_human_review");
  assert.match(f.citation.explanation, /fact extraction did not complete/);
});
test("manner: assistance is compatible with an admitted form code too; an illegal crossing with a smuggler still conflicts with it", async () => {
  const b2 = (entry: string): CaseRecord => { const c = mk(entry); return { ...c, facts: c.facts.map((f) => (f.path === "entry.manner" ? { ...f, value: "B2" } : f)) }; };
  const c1 = b2("The subject stated that a smuggler arranged his trip to Roma, Texas, on 03/03/2019.");
  const q1 = "a smuggler arranged his trip to Roma, Texas";
  const r1 = await run(c1, [claim(c1, "entry.manner", q1, "Manner differs", "Smuggler involvement, whereas the form lists B2.")]);
  assert.equal(modelConflict(r1, "Manner differs"), undefined);
  const c2 = b2("The subject stated that he crossed the river illegally near Roma, Texas, on 03/03/2019 with the help of a smuggler.");
  const q2 = "crossed the river illegally near Roma, Texas, on 03/03/2019 with the help of a smuggler";
  const r2 = await run(c2, [claim(c2, "entry.manner", q2, "Manner differs", "Illegal river crossing, whereas the form lists B2.")]);
  const sid = sentenceOf(c2, q2).id;
  assert.ok(r2.findings.some((f) => f.category === "inconsistency" && f.evidence.some((e) => e.sentenceId === sid)));
});
