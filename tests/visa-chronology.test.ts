// A chronology concern (not a proven contradiction): an entry as a visa holder dated after the expiry that the next
// sentence states for "that visa". Offline; the positive case and the natural controls are the actual case texts; the
// other controls are minimal wording changes and synthetic examples outside the C045 family.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { visaChronologyConflicts, FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { reviewCase, type Complete } from "../lib/review/review";
import { ModelError } from "../lib/llm";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const load = (id: string) => JSON.parse(readFileSync(`eval/cases/${id}.json`, "utf8")) as CaseRecord;
const run = (text: string) => visaChronologyConflicts(splitSentences(text));
const ENTRY_2015 = "[REDACTED] last entered the United States on February 21, 2015 through the Port of Entry in Laredo, Texas as a H2B visa holder.";

test("actual C045-X1 text: the entry (S35, 02/21/2015) is after that visa's stated expiry (S36, 03/20/2012)", () => {
  const c = load("C045-X1");
  const f = visaChronologyConflicts(splitSentences(c.narrative.text, c.narrative.pageSpans));
  assert.equal(f.length, 1);
  assert.deepEqual(f[0].evidence.map((e) => [e.sentenceId, e.verified, e.match]), [["S35", true, "exact"], ["S36", true, "exact"]]);
  assert.equal(f[0].category, "unclear", "a concern needing clarification, not a proven contradiction");
  assert.match(f[0].explanation, /chronology concern, not a proven contradiction/);
  assert.match(f[0].explanation, /2015-02-21.*2012-03-20/);
  assert.match(f[0].explanation, /does not establish whose account/);
  assert.ok(!f[0].evidence.some((e) => e.kind === "field"), "no comparison with the form");
  assert.ok(f[0].evidence.every((e) => e.context?.attribution === "unclear"), "nothing attributed to the subject");
});

test("natural controls: the same two-sentence pattern with the entry before the expiry (C045, C045-CIT, C045-MC: 6 pairs)", () => {
  for (const id of ["C045", "C045-CIT", "C045-MC"]) {
    const c = load(id);
    assert.deepEqual(visaChronologyConflicts(splitSentences(c.narrative.text, c.narrative.pageSpans)), [], id);
  }
  // C045-X1's other pair (S30/S31: entry 02/21/2012, expiry 03/20/2012) is not flagged either.
  const x1 = load("C045-X1");
  assert.ok(!visaChronologyConflicts(splitSentences(x1.narrative.text, x1.narrative.pageSpans)).some((f) => f.evidence.some((e) => e.sentenceId === "S30")));
});

test("year precision: an expiry year earlier than the entry year is a conflict", () => {
  assert.equal(run("He entered the United States in 2015 as a H2B visa holder. That visa expired in 2012.").length, 1);
});

test("negative controls: nothing is flagged", () => {
  const cases: [string, string][] = [
    ["expiry after the entry (an ordinary overstay)", `${ENTRY_2015} That visa expired on March 20, 2016.`],
    ["same year, no full dates to order them", "He entered the United States in 2012 as a H2B visa holder. That visa expired in 2012."],
    ["the visa is not in the entry clause (a previously held visa)", "He entered the United States illegally in 2015; he had previously held an H2B visa. That visa expired in 2012."],
    ["possessive, not an explicit reference to the visa just named", `${ENTRY_2015} His visa expired on March 20, 2012.`],
    ["not the next sentence", `${ENTRY_2015} He worked in Michigan. That visa expired on March 20, 2012.`],
    ["another person's entry", "His brother entered the United States on February 21, 2015 as a H2B visa holder. That visa expired on March 20, 2012."],
    ["entry without a visa", "He entered the United States on February 21, 2015 without a visa. That visa expired on March 20, 2012."],
    ["a departure, not an entry", "He left the United States on February 21, 2015 on a H2B visa. That visa expired on March 20, 2012."],
    ["an entry into another country", "He entered Mexico on February 21, 2015 with a visa. That visa expired on March 20, 2012."],
    ["no expiry date stated", `${ENTRY_2015} That visa expired.`],
  ];
  for (const [why, text] of cases) assert.deepEqual(run(text), [], why);
});

const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const failedFacts: Complete = async (system) => {
  if (system === FACTS_SYSTEM_PROMPT) throw new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1);
  return { text: REVIEW, attempts: 1 };
};

test("exceptions and ambiguous references: an explanation in either sentence, or more than one visa named", () => {
  const cases: [string, string][] = [
    ["automatic revalidation stated with the entry", "[REDACTED] re-entered the United States on February 21, 2015 at Laredo as a H2B visa holder under automatic visa revalidation after a ten-day trip to Mexico. That visa expired on March 20, 2012."],
    ["automatic revalidation stated with the expiry", `${ENTRY_2015} That visa expired on March 20, 2012, but he was readmitted under automatic revalidation.`],
    ["renewed visa", `${ENTRY_2015} That visa expired on March 20, 2012 and was renewed in January 2015.`],
    ["replacement visa", `${ENTRY_2015} That visa expired on March 20, 2012; he was issued a replacement visa in 2014.`],
    ["two different visas in the entry sentence", "[REDACTED] last entered the United States on February 21, 2015 as a H2B visa holder; he had earlier held a B2 visa. That visa expired on March 20, 2012."],
    ["two visas in the entry clause", "[REDACTED] entered the United States on February 21, 2015 on an H2B visa issued after his B1/B2 visa. That visa expired on March 20, 2012."],
  ];
  for (const [why, text] of cases) assert.deepEqual(run(text), [], why);
});

test("visa use: possession is not entry as a visa holder; use, presentation or admission in the classification is", () => {
  // Review control 1: an illegal entry while carrying an old visa.
  assert.deepEqual(run("He entered the United States illegally in 2015 while carrying an old B2 visa. That visa expired in 2012."), [], "possession, illegal entry");
  assert.deepEqual(run("He entered the United States in 2015 carrying an old B2 visa. That visa expired in 2012."), [], "possession, no manner stated");
  // Paired, with and without "illegally", so possession is shown to be excluded by the use predicate itself, not only by
  // the illegal-entry exclusion.
  for (const manner of ["", "illegally "]) {
    assert.deepEqual(run(`He entered the United States ${manner}in 2015 with an old B2 visa in his bag. That visa expired in 2012.`), [], `${manner}with … in his bag`);
    assert.deepEqual(run(`He entered the United States ${manner}in 2015 with a B2 visa. That visa expired in 2012.`), [], `${manner}with a B2 visa`);
    assert.deepEqual(run(`He entered the United States ${manner}in 2015 carrying an old B2 visa. That visa expired in 2012.`), [], `${manner}carrying`);
  }
  // Use: flagged without "illegally"; the same use phrase with "illegally" is excluded as an illegal entry.
  assert.equal(run("He entered the United States in 2015 on a B2 visa. That visa expired in 2012.").length, 1, "on a B2 visa");
  assert.deepEqual(run("He entered the United States illegally in 2015 on a B2 visa. That visa expired in 2012."), [], "illegally on a B2 visa");
  for (const text of [
    "He entered the United States at San Ysidro in 2015, presenting a B2 visa to the officer. That visa expired in 2012.",
    "He entered the United States in 2015 using a B2 visa. That visa expired in 2012.",
    "He entered the United States in 2015 and was admitted as a B2 visitor visa holder. That visa expired in 2012.",
    "He entered the United States in 2015 and was admitted with a B2 visa. That visa expired in 2012.",
  ]) assert.equal(run(text).length, 1, text);
  // Known gap, outside these predicates: "was admitted to the United States" alone is not an entry verb, so no clause is found.
  assert.deepEqual(run("He was admitted to the United States in 2015 as a B2 visitor visa holder. That visa expired in 2012."), []);
});

test("explanations: only an affirmative explanation about the visa or status suppresses the concern", () => {
  const B2 = "He entered the United States in 2015 as a B2 visa holder.";
  // Review control 2 and other denials or unrelated events: still a concern.
  for (const text of [
    `${B2} That visa expired in 2012 and was never renewed.`,
    `${B2} That visa expired in 2012; it was not replaced.`,
    "He entered the United States in 2015 as a B2 visa holder after renewing his passport. That visa expired in 2012.",
    `${B2} That visa expired in 2012, and his lease was extended.`,
  ]) assert.equal(run(text).length, 1, text);
  // Affirmative explanations: no concern.
  for (const text of [
    `${B2} That visa expired in 2012 and was renewed in 2014.`,
    `${B2} That visa expired in 2012; he obtained a new B2 visa in 2014.`,
    `${B2} That visa expired in 2012, but his status was extended through 2016.`,
    "He re-entered the United States in 2015 as a B2 visa holder under automatic visa revalidation. That visa expired in 2012.",
  ]) assert.deepEqual(run(text), [], text);
});

test("outside the C045 family: other visa classes, date formats and wording", () => {
  assert.equal(run("Subject stated that he entered the United States at San Ysidro, California on 06/10/2016 on a B1/B2 visa. That visa expired on 01/15/2014.").length, 1, "MM/DD/YYYY, B1/B2");
  // The same text with "with a B1/B2 visa" (use or mere possession: ambiguous) is not flagged; see the visa-use test.
  assert.deepEqual(run("Subject stated that he entered the United States at San Ysidro, California on 06/10/2016 with a B1/B2 visa. That visa expired on 01/15/2014."), [], "'with' alone");
  assert.equal(run("She entered the United States in 2019 as an F-1 student visa holder. This visa expired in 2017.").length, 1, "years only, F-1, 'This visa'");
  assert.deepEqual(run("Subject stated that he entered the United States at San Ysidro, California on 06/10/2016 with a B1/B2 visa. That visa expired on 12/10/2016."), [], "expiry after the entry");
  assert.deepEqual(run("Subject overstayed his B2 visa. That visa expired on 01/15/2014."), [], "no entry stated");
});

test("in the review: the finding is a rule finding, routed, and does not depend on the fact extraction", async () => {
  const r = await reviewCase(load("C045-X1"), failedFacts);
  const f = r.findings.find((x) => x.id === "F-ACCOUNT-VISA");
  assert.ok(f);
  assert.equal(f!.source, "rule");
  assert.ok(f!.needsHumanReview && r.humanReview.required);
  const c = await reviewCase(load("C045"), failedFacts);
  assert.ok(!c.findings.some((x) => x.id === "F-ACCOUNT-VISA"), "control case unchanged");
});

test("several entry/expiry pairs: each concern has its own finding id", () => {
  const t = "He entered the United States in 2015 as a B2 visa holder. That visa expired in 2012. He stated that he later entered the United States in 2018 as an H2B visa holder. That visa expired in 2016.";
  const f = run(t);
  assert.deepEqual(f.map((x) => x.id), ["F-ACCOUNT-VISA", "F-ACCOUNT-VISA-2"]);
  assert.equal(new Set(f.map((x) => x.id)).size, f.length);
});
