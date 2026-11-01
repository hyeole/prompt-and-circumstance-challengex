// Person–event prototype (round 6, offline). Unit behaviour on short synthetic texts, the prototype's reading of the
// remaining missed plants (from the case texts; no labels are read). An unidentified member of a group may still be the
// subject: F051-C stays routed (the round-6 rule that treated it as excluded was disputed and is not carried forward).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { analyze, events } from "../lib/review/person-event";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { reviewCase, type Complete } from "../lib/review/review";
import { ModelError } from "../lib/llm";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const R = "[REDACTED (b)(6), (b)(7)(C)]";
const S = (text: string) => splitSentences(text);
const load = (id: string) => JSON.parse(readFileSync(["eval/cases", "eval/fresh/cases"].map((d) => `${d}/${id}.json`).find(existsSync)!, "utf8")) as CaseRecord;
const sentencesOf = (c: CaseRecord) => splitSentences(c.narrative.text, c.narrative.pageSpans);
const ev = (text: string, type: string) => analyze(S(text)).filter((e) => e.type === type);

// ---- Speaker, experiencer and identity ----
test("speaker vs experiencer: a reported third party's removal is the third party's; a self-report is the speaker's", () => {
  const [e] = ev(`${R} stated that his brother was deported in 2012.`, "completed_removal");
  assert.equal(e.who.identity, "other");
  assert.equal(e.speaker?.kind, "named");
  const [s] = ev(`${R} claims to have crossed the border illegally near Laredo, Texas in 2014.`, "entry");
  assert.equal(s.selfReport, true);
  assert.equal(s.who.identity, "unresolved", "a redacted name is nobody in particular");
  assert.deepEqual(s.years, [2014]);
});

test("officers and active voice: the agent arrests, the arrested person experiences the arrest", () => {
  const [a] = ev(`Agent ${R} arrested ${R} near Monroe, Michigan.`, "arrest");
  assert.equal(a.experiencer?.kind, "named");
  const [b] = ev(`Subject was arrested by Agent ${R} on 04/08/2017.`, "arrest");
  assert.equal(b.who.identity, "subject");
  assert.deepEqual(b.dates, ["2017-04-08"]);
});

test("designation and pronoun continuity: each link cites the text it rests on", () => {
  const [e] = ev("Subject entered the United States illegally in 2014. He was deported to Mexico on June 1, 2016.", "completed_removal");
  assert.equal(e.who.identity, "subject");
  assert.equal(e.who.chain.length, 1);
  assert.deepEqual(e.who.support.map((x) => [x.sentenceId, x.text]), [["S2", "He"], ["S1", "Subject"]]);
  assert.deepEqual(e.dates, ["2016-06-01"]);
});

test("a pronoun with two compatible antecedents, or across a heading, stays unresolved", () => {
  assert.equal(ev(`Subject was arrested with ${R}. He was deported in 2016.`, "completed_removal")[0].who.identity, "unresolved");
  assert.equal(ev("Subject entered in 2014.\nIMMIGRATION HISTORY:\nHe was deported in 2016.", "completed_removal")[0].who.identity, "unresolved");
});

test("gender agreement: 'He also stated' skips a woman's account and reaches the man's", () => {
  const t = `Subject stated that his visa had expired. ${R} freely stated that her visa had expired and she was a citizen of India. He also stated that he first entered the United States by walking across the border near El Paso, Texas.`;
  const [e] = ev(t, "entry");
  assert.equal(e.scope, "first");
  assert.equal(e.who.identity, "subject");
  assert.match(e.who.chain[0].rationale, /S3 has one compatible antecedent, "Subject" in S1 \(the sentences between mention no compatible person\)/);
});

test("matching values never establish identity: identical markers, the same date, citizenship or route", () => {
  const t = `Subject is a citizen of Mexico who entered the United States on May 5, 2011 near McAllen, Texas. ${R} is a citizen of Mexico. ${R} entered the United States on May 5, 2011 near McAllen, Texas with eight other individuals.`;
  const es = ev(t, "entry");
  assert.equal(es[0].who.identity, "subject");
  assert.equal(es[1].who.identity, "unresolved");
  assert.equal(ev(`${R} entered the United States in 2010. ${R} was deported in 2012.`, "completed_removal")[0].who.identity, "unresolved");
});

test("event types, polarity and scope", () => {
  const t = `Subject was offered a Stipulated Removal, which he declined. Subject was never deported. Subject was processed as a WA/NTA. ${R} last entered the United States on February 21, 2012. ${R} returned to Mexico as a Voluntary Return on 06/08/2011. Subject was served with a Reinstatement of his original prior order of exclusion.`;
  const es = analyze(S(t));
  const by = (sid: string) => es.filter((e) => e.sentenceId === sid).map((e) => `${e.type}:${e.polarity}${e.scope ? ":" + e.scope : ""}`);
  assert.deepEqual(by("S1"), ["removal_processing:not_happened"]);
  assert.deepEqual(by("S2"), ["completed_removal:negated"]);
  assert.deepEqual(by("S3"), ["removal_processing:affirmed"]);
  assert.deepEqual(by("S4"), ["entry:affirmed:last"]);
  assert.deepEqual(by("S5"), ["departure:affirmed"]);
  assert.ok(es.find((e) => e.sentenceId === "S6" && e.type === "removal_processing")?.presupposesPriorOrder);
});

const memberRemoval = (text: string) => analyze(S(text)).filter((e) => (e.type === "completed_removal" || e.type === "removal_order") && e.polarity === "affirmed").map((e) => e.who.identity);
test("unidentified group members: quantified or listed, never an identified person (and never excluded from being the subject)", () => {
  assert.deepEqual(memberRemoval("Checks on the subjects indicated the following: one had been ordered removed, one had been voluntarily returned to Mexico seven times, three individuals were negative in the systems."), ["member"]);
  assert.deepEqual(memberRemoval("Checks indicated that one of the four men had been deported."), ["member"]);
  assert.deepEqual(memberRemoval("Checks indicated that one, later identified as the subject, had been ordered removed."), ["subject"]);
  assert.deepEqual(memberRemoval(`${R} had been ordered removed in 2012.`), ["unresolved"]);
  assert.deepEqual(memberRemoval("Checks indicated that none had been ordered removed."), [], "no affirmed removal");
});

// ---- The remaining missed plants, as the prototype reads them (case texts only) ----
test("missed plants: the prototype resolves none of the unattributed entry accounts to the subject", () => {
  const cases: [string, string, string, string][] = [
    ["F039-X", "claims to have last entered", "entry", "unresolved"],
    ["F010-X", "with eight other individuals on or about May 5, 2014", "entry", "unresolved"],
    ["F075-X", "the day after returning to Mexico as a Voluntary Return", "entry", "unresolved"],
    ["C001-X1", "on or about June 2, 2016", "entry", "unresolved"],
    ["C045-X1", "February 21, 2015", "entry", "unresolved"],
    ["C119-AMB", "first entered the United States", "entry", "unresolved"],
  ];
  for (const [id, needle, type, identity] of cases) {
    const s = sentencesOf(load(id));
    const sent = s.find((x) => x.text.includes(needle))!;
    const e = analyze(s).find((x) => x.sentenceId === sent.id && x.type === type)!;
    assert.equal(e.who.identity, identity, id);
    if (id === "C119-AMB") assert.equal(e.scope, "first", "a first entry, not the last entry the form records");
  }
});

test("missed plants: history events (C013-X1, F055-H, F051-C)", () => {
  const c013 = sentencesOf(load("C013-X1"));
  const reinstate = analyze(c013).find((e) => /reinstate case/.test(e.trigger))!;
  assert.equal(reinstate.who.identity, "subject");
  assert.ok(reinstate.presupposesPriorOrder);
  // The documented removals themselves are a redacted person's: unresolved.
  for (const needle of ["received an Expedited Removal", "deported through the New Orleans Port of Entry to Nicaragua on 07/07/2010"]) {
    const sid = c013.find((x) => x.text.includes(needle))!.id;
    assert.equal(analyze(c013).find((e) => e.sentenceId === sid && e.type === "completed_removal")!.who.identity, "unresolved", needle);
  }
  const f055 = analyze(sentencesOf(load("F055-H"))).find((e) => /Stipulated Removal/.test(e.trigger))!;
  assert.deepEqual([f055.who.identity, f055.polarity], ["subject", "not_happened"], "an offered, declined removal is not a prior removal");
  const f051 = sentencesOf(load("F051-C"));
  const s8 = f051.find((x) => x.text.includes("one had been ordered removed"))!.id;
  assert.equal(analyze(f051).find((e) => e.sentenceId === s8 && e.type === "removal_order")!.who.identity, "member");
});

// ---- F051-C: an unidentified member may be the subject; the record cannot resolve it, so it stays routed ----
const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const fake = (facts: object | null): Complete => async (system) => {
  if (system !== FACTS_SYSTEM_PROMPT) return { text: REVIEW, attempts: 1 };
  if (!facts) throw new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1);
  return { text: JSON.stringify({ entry_statements: [], removal_statements: [], status_statements: [], ...facts }), attempts: 1 };
};
test("F051-C: a removal stated for an unidentified member of the group is not excluded from being the subject's: routed, not a mismatch", async () => {
  const c = load("F051-C");
  const s8 = sentencesOf(c).find((x) => x.text.includes("one had been ordered removed"))!.id;
  for (const facts of [null, { removal_statements: [{ sentence_id: s8, quote: "one had been ordered removed", person: "unclear" }] }]) {
    const r = await reviewCase(c, fake(facts));
    assert.equal(r.citation.status, "needs_human_review");
    assert.ok(!r.findings.some((x) => x.id === "C-1"));
  }
  // The same with a named person instead: also routed (the form's NEGATIVE value is not trusted more for either).
  const named = { ...c, narrative: { text: c.narrative.text.replace(/one had been ordered removed/, `${R} had been ordered removed`) } } as CaseRecord;
  assert.equal((await reviewCase(named, fake(null))).citation.status, "needs_human_review");
});

test("corpus checks: 'The other subject stated that he entered' is the other subject's; an officer approving a removal is processing", () => {
  const [e] = ev("Subject stated that he entered in 2011. The other subject stated that he entered in 2015 near Del Rio, Texas.", "entry").slice(1);
  assert.equal(e.who.identity, "other");
  const t = `Supervisory CBP Officer ${R} reviewed and approved the expedited removal, and the subject was served Form I-860 and signed the acknowledgment.`;
  assert.deepEqual(events(S(t)[0]).map((x) => x.type), ["removal_processing", "removal_processing"]);
});
