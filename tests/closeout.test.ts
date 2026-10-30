// Regression tests for the independently reproduced defects A-E (reliability closeout). Each positive test failed on
// checkpoint 0810a78; the negative controls guard behaviour that must not change.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { modelRoutingReasons, reviewCase, type Complete } from "../lib/review/review";
import { findingClaimV2 } from "../scripts/finding-key";
import { matches, type Plant } from "../scripts/score-match";
import { accountConflicts, attribution, continuousAccounts, linkedToSubject, FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { locatesEntry } from "../lib/review/checklist";
import { splitSentences } from "../lib/text";
import type { CaseRecord, Finding, ReviewResult, Sentence } from "../lib/types";

const S = (text: string, id = "S1"): Sentence => ({ id, text, start: 0, end: text.length, page: 1 } as Sentence);
const seq = (...texts: string[]) => texts.map((t, i) => S(t, `S${i + 1}`));

// ---- A. Routing reasons ----
const invalidEntryDate = ["Entry date mismatch Narrative gives 2014; form entry.date 05/05/2011. entry.date"];
test("A: independent reasons survive an invalid entry-date claim", () => {
  const r = modelRoutingReasons(["Birth date conflict between passport and form", "Entry date conflict; identity cannot be determined", "Impact on charge determination: the selected citation is unsupported"], invalidEntryDate, []);
  assert.ok(r.reasons.includes("Birth date conflict between passport and form"));
  assert.ok(r.reasons.includes("identity cannot be determined"), "the independent part of a mixed reason is kept");
  assert.ok(r.reasons.includes("Impact on charge determination: the selected citation is unsupported"));
  assert.deepEqual(r.removed, ["Entry date conflict"]);
});
test("A: a reason about a fact the invalid claim was not about is kept", () => {
  const r = modelRoutingReasons(["Entry manner conflict between form and narrative"], invalidEntryDate, []);
  assert.deepEqual(r.reasons, ["Entry manner conflict between form and narrative"]);
});
test("A: a reason with its own content beyond the claim is kept", () => {
  const r = modelRoutingReasons(["Entry date conflict with the I-94 admission stamp"], invalidEntryDate, []);
  assert.equal(r.reasons.length, 1);
});
test("A negative control: a pure restatement and its follow-on are still removed when nothing else remains", () => {
  const r = modelRoutingReasons(["Conflicting entry date between narrative and form", "Need to resolve which source is accurate for charge determination"], invalidEntryDate, []);
  assert.deepEqual(r.reasons, []);
});
test("A negative control: the follow-on stays when another conflict remains", () => {
  const r = modelRoutingReasons(["Conflicting entry date between narrative and form", "Encounter time discrepancy", "Potential impact on charge determination"], invalidEntryDate, []);
  assert.ok(r.reasons.includes("Encounter time discrepancy") && r.reasons.includes("Potential impact on charge determination"));
});

// ---- B. Claim keys ----
const claim = (e: string, id = "C-1") => findingClaimV2({ id, title: "Possible citation mismatch", explanation: e, evidence: [] } as never);
test("B: opposite removal claims have different keys", () => {
  assert.notEqual(claim("The form reports no prior removal; the narrative documents a removal."), claim("The form documents a removal; the narrative reports no prior removal."));
});
test("B: the same propositions in another order are the same claim", () => {
  assert.equal(claim("The form reports no prior removal; the narrative documents a removal."), claim("The narrative documents a removal; the form reports no prior removal."));
});
test("B: a free-text claim whose source cannot be identified is uncertain (manual adjudication)", () => {
  assert.match(claim("Possible conflict about a prior removal."), /UNCERTAIN$/);
  assert.doesNotMatch(claim("Possible conflict about a prior removal.", "U-N1"), /UNCERTAIN$/, "element findings are templated");
});

// ---- C. Scorer matching (policy v2.4) ----
const rr = { sentences: [{ id: "S1", text: "He crossed the border near Nogales, Arizona on May 5, 2014." }, { id: "S2", text: "He later told agents that he entered at the Nogales port of entry using a border crossing card." }] } as unknown as ReviewResult;
const fnd = (o: Partial<Finding>): Finding => ({ id: "I-1", category: "inconsistency", title: "", explanation: "", evidence: [], referenceIds: [], needsHumanReview: true, source: "model", severity: "high", ...o } as Finding);
const yearPlant: Plant = { type: "inconsistency", anchors: ["May 5, 2014"], fieldPaths: ["entry.date"] };
const cite1 = { kind: "sentence" as const, sentenceId: "S1", quote: "May 5, 2014", verified: true };
test("C: an entry-location conflict that says the dates agree does not detect an entry-year plant", () => {
  assert.equal(matches(rr, fnd({ title: "Entry location conflict", explanation: "Form says Laredo, narrative says Nogales; dates agree.", evidence: [cite1] }), yearPlant), false);
});
test("C: a birth-date conflict citing the planted sentence does not detect an entry-year plant", () => {
  assert.equal(matches(rr, fnd({ title: "Date conflict", explanation: "The birth date in the narrative differs from the form.", evidence: [cite1] }), yearPlant), false);
});
test("C positive: a year conflict about the entry citing the planted sentence still detects it", () => {
  assert.equal(matches(rr, fnd({ title: "Entry year conflict", explanation: "The narrative gives 2014 for the entry, but the form records 2011.", evidence: [cite1] }), yearPlant), true);
});
const ambiguity: Plant = { type: "human_review", reason: "ambiguity", anchors: ["border crossing card"] };
const cite2 = { kind: "sentence" as const, sentenceId: "S2", quote: "border crossing card", verified: true };
test("C: an unrelated review-marked finding citing the ambiguity anchor does not detect it", () => {
  assert.equal(matches(rr, fnd({ id: "U-N1", category: "unclear", title: "Unclear: identifying documents", explanation: "The cited sentence mentions a document but does not say what identifying documents the person had.", evidence: [cite2] }), ambiguity), false);
});
test("C positive: a review-marked finding about conflicting accounts of the entry detects it", () => {
  assert.equal(matches(rr, fnd({ id: "F-ACCOUNT", title: "One person's account of the entry contradicts itself (manner)", explanation: "S1 and S2 are one continuous account, but they disagree about how this person entered.", evidence: [cite2] }), ambiguity), true);
});

// ---- D. Attribution ----
test("D: 'Both subjects were interviewed; one subject said he entered in 2014' is not about this subject", () => {
  assert.equal(attribution(S("Both subjects were interviewed; one subject said he entered in 2014."), "unclear", "he entered in 2014"), "unclear");
  assert.equal(attribution(S("Both subjects were interviewed; one subject said he entered in 2014."), "unclear"), "unclear");
});
test("D negative control: a distributive statement of the fact itself still includes this subject", () => {
  assert.equal(attribution(S("Both subjects stated that they entered illegally in 2014."), "unclear", "entered illegally in 2014"), "subject");
  assert.equal(attribution(S("The subject stated that he entered in 2014."), "unclear", "entered in 2014"), "subject");
});
test("D: a pronoun after a group reference is unclear, not inherited", () => {
  assert.equal(attribution(S("Both subjects were arrested; he said he entered in 2014."), "unclear", "he entered in 2014"), "unclear");
});
test("D: identical redaction markers in separate sentences are not one account", () => {
  const ss = seq("[REDACTED (b)(6), (b)(7)(C)] crossed the river in 2012.", "[REDACTED (b)(6), (b)(7)(C)] entered at the port of entry with a visa in 2015.");
  assert.deepEqual(continuousAccounts(ss), []);
  assert.deepEqual(accountConflicts(ss), []);
});
test("D: a pronoun continuing one person's statement forms one account, and a conflict within it is reported", () => {
  const ss = seq("[REDACTED (b)(6), (b)(7)(C)] claims to have crossed the Rio Grande River illegally in 2014.", "During a later interview, he stated that he entered through the Hidalgo port of entry with a border crossing card.");
  const f = accountConflicts(ss);
  assert.equal(f.length, 1);
  assert.match(f[0].explanation, /does not establish whether this person is this record's subject/);
  assert.ok(f[0].needsHumanReview);
});
test("D negative controls: no account after an official, a group, a heading, or for first/previous entries", () => {
  assert.deepEqual(continuousAccounts(seq("Agent [REDACTED (b)(6), (b)(7)(C)] questioned the driver.", "He said the driver crossed illegally.")), []);
  assert.deepEqual(continuousAccounts(seq("[REDACTED (b)(6), (b)(7)(C)] and two other subjects crossed the river.", "He later said he used a visa.")), []);
  assert.deepEqual(continuousAccounts(seq("[REDACTED (b)(6), (b)(7)(C)] crossed the river illegally in 2014.", "ENTRY:", "He used a visa.")), []);
  assert.deepEqual(accountConflicts(seq("[REDACTED (b)(6), (b)(7)(C)] last crossed the river illegally in 2014.", "He also stated that he first entered the United States with a visa in 2005.")), []);
  assert.deepEqual(accountConflicts(seq("[REDACTED (b)(6), (b)(7)(C)] crossed the river illegally in 2014.", "He then crossed into Mexico with a visa in 2016.")), []);
});

// Group-entry veto is scoped to the statement's own account (closeout D): fixture with a group entry elsewhere.
const loadF = (id: string) => JSON.parse(readFileSync(`eval/fresh/cases/${id}.json`, "utf8")) as CaseRecord;
test("D: a group entry in the statement's own sentence still vetoes the form link (F010-X S34)", () => {
  const c = loadF("F010-X");
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const s = ss.find((x) => x.text.includes("May 5, 2014"))!;
  const facts = { entry_statements: [{ sentence_id: s.id, quote: s.text, event: "us_entry", year: 2014, manner: "without_inspection", person: "unclear" }], removal_statements: [] };
  assert.deepEqual(linkedToSubject(c, ss, facts as never, s.id, "entry.date"), []);
});

// ---- E. Entry location ----
test("E: negated entries and arrest locations do not locate the entry", () => {
  assert.equal(locatesEntry("He never entered the United States; agents arrested him in Detroit."), false);
  assert.equal(locatesEntry("He entered the United States in 2014 and was arrested in Detroit in 2017."), false);
  assert.equal(locatesEntry("He was deported through the New Orleans Port of Entry to Nicaragua on 04/08/2015."), false);
  assert.equal(locatesEntry("He found a smuggler in Nogales, Sonora, Mexico and was smuggled into the United States."), false);
});
test("E negative controls: descriptive entry locations are kept", () => {
  assert.equal(locatesEntry("He entered the United States illegally near Nogales, Arizona in 2014."), true);
  assert.equal(locatesEntry("He crossed the Rio Grande River two miles west of the Laredo port of entry."), true);
  assert.equal(locatesEntry("Marie port of entry as a pedestrian and presented a Mexican passport with a B1/B2 visa."), true);
  assert.equal(locatesEntry("He was arrested in Detroit after he entered the United States near El Paso, Texas."), true);
});

// ---- End to end with the fake model: the within-account finding in a review ----
const fake = (facts: string): Complete => async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? facts : JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } }), attempts: 1 });
test("D end to end: a self-contradicting account in a multi-person narrative is reported once, routed, with no form conflict claimed (F055-A)", async () => {
  const r = await reviewCase(loadF("F055-A"), fake(JSON.stringify({ entry_statements: [], removal_statements: [] })));
  const acc = r.findings.filter((f) => f.id === "F-ACCOUNT");
  assert.equal(acc.length, 1);
  assert.ok(!acc[0].evidence.some((e) => e.kind === "field"));
  assert.ok(r.humanReview.required);
});
test("D end to end, negative control: unplanted base F055 gets no account finding", async () => {
  const r = await reviewCase(loadF("F055"), fake(JSON.stringify({ entry_statements: [], removal_statements: [] })));
  assert.ok(!r.findings.some((f) => f.id === "F-ACCOUNT"));
});
