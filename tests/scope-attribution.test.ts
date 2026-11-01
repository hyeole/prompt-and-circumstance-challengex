// Event scope in entry comparisons, and findings whose attribution, evidence and explanation agree (branch
// improve/scope-attribution, from 72ba296). Offline: constructed extractions, or a fake model.
//
// POST-OBSERVATION TESTS: the two "reproduction" tests below were written AFTER the capability-1 run observed these
// failures on both engines (CAP-B1N: a first entry compared with the form's last entry; CAP-A2P: a finding that
// disclaims the attribution it relies on). They reproduce those cases' narratives and are development tests, not
// evidence of accuracy. The capability-1 cases, expected answers, scorer and outputs are unchanged on their own branch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, compareFacts, entryScope, sourceEntryStatements, type FactsOutput } from "../lib/review/facts";
import { mentions, resolve } from "../lib/review/person-event";
import { runRules } from "../lib/review/rules";
import { splitSentences } from "../lib/text";
import { ModelError } from "../lib/llm";
import type { CaseRecord } from "../lib/types";

const R = "[REDACTED (b)(6), (b)(7)(C)]";
const load = (p: string) => JSON.parse(readFileSync(p, "utf8")) as CaseRecord;
const ent = (sentence_id: string, quote: string, year: number | null, manner: string, person = "unclear") => ({ sentence_id, quote, event: "us_entry", country: "United States", year, manner, person });
const withText = (c: CaseRecord, text: string, values: Record<string, string> = {}): CaseRecord => ({
  ...c, narrative: { ...c.narrative, text, pageSpans: undefined } as CaseRecord["narrative"],
  facts: c.facts.map((f) => (f.path in values ? { ...f, value: values[f.path], status: "present" as const } : f)),
});
const BASE = load("eval/gen-v1/cases/G06.json");
const ENCOUNTER = `ENCOUNTER:\nOn March 12, 2024, at approximately 0815 hours, a Michigan State Police Trooper requested Border Patrol assistance with a traffic stop near Monroe, Michigan. Border Patrol Agent ${R} arrived at approximately 0900 hours.`;
const ONE = `${ENCOUNTER} Agent ${R} questioned the subject as to his citizenship. The subject stated that he is a citizen and national of Mexico.\nENTRY:\n`;
/** Compare the given entry sentences (with constructed extractions, one per [sentence text, year, manner]) against a form. */
function compare(prefix: string, lines: [string, number | null, string][], form: Record<string, string>) {
  const c = withText(BASE, prefix + lines.map((l) => l[0]).join(" "), form);
  const s = splitSentences(c.narrative.text);
  const id = (t: string) => s.find((x) => x.text === t)!.id;
  const facts = { entry_statements: lines.map(([t, y, m]) => ent(id(t), t.replace(/\.$/, ""), y, m)), removal_statements: [], status_statements: [] } as FactsOutput;
  const r = compareFacts(c, s, facts, runRules(c, s).notes.length > 0);
  return { ...r, s, id };
}
const NO_FORM = { "entry.date": "", "entry.manner": "" };
const entryFindings = (r: { findings: { id: string }[] }) => r.findings.filter((f) => f.id.startsWith("F-ENTRY")).map((f) => f.id);

// ---- 1. Event scope ----
const FIRST = "The subject stated that he first entered the United States in 2005 near Del Rio, Texas, and returned to Mexico in 2010.";
const LAST = "The subject stated that he last entered the United States on August 20, 2016, by crossing the river near Eagle Pass, Texas, without inspection.";

test("reproduction (post-observation, CAP-B1N): a first entry is not compared with the form's last entry", () => {
  const r = compare(ONE, [[FIRST, 2005, "unknown"], [LAST, 2016, "without_inspection"]], { "entry.date": "08/20/2016", "entry.manner": "EWI" });
  assert.deepEqual(entryFindings(r), [], "no F-ENTRY-DATE (2005 vs the last entry) and no F-ENTRY-DATE-2 (2005 vs 2016 are two entries)");
  assert.deepEqual(r.unattributed, []);
});

test("control (CAP-B1P): a genuine last-entry conflict is kept, and cites the last-entry statement", () => {
  const r = compare(ONE, [[FIRST, 2005, "unknown"], [LAST, 2016, "without_inspection"]], { "entry.date": "08/20/2005", "entry.manner": "EWI" });
  const f = r.findings.find((x) => x.id === "F-ENTRY-DATE")!;
  assert.ok(f);
  assert.deepEqual(f.evidence.map((e) => e.sentenceId ?? e.fieldPath), [r.id(LAST), "entry.date"]);
  assert.match(f.explanation, /gives 2016 for the last entry, but the form records the last entry in 2005/);
});

test("one sentence with a first and a last entry: each year takes its own entry's scope", () => {
  const both = "The subject stated that he first entered the United States in 2005 and last entered the United States in 2016 near Eagle Pass, Texas.";
  assert.deepEqual(entryFindings(compare(ONE, [[both, 2005, "unknown"], [both, 2016, "unknown"]], { "entry.date": "08/20/2016" })), []);
  const r = compare(ONE, [[both, 2005, "unknown"], [both, 2016, "unknown"]], { "entry.date": "08/20/2012" });
  assert.deepEqual(entryFindings(r), ["F-ENTRY-DATE"]);
  assert.match(r.findings[0].explanation, /gives 2016 for the last entry/);
  assert.equal(entryScope(both, both.indexOf("2005")), "first");
  assert.equal(entryScope(both, both.indexOf("2016")), "last");
});

test("a previous entry (later removed) is not compared with the form's last entry", () => {
  const prev = "The subject stated that he had previously entered the United States in 2003 and was removed to Mexico in 2004.";
  const last = "The subject stated that he last entered the United States in 2015 near Laredo, Texas.";
  assert.deepEqual(entryFindings(compare(ONE, [[prev, 2003, "unknown"], [last, 2015, "unknown"]], { "entry.date": "05/01/2015" })), []);
});

test("an unspecified entry is still compared (as before); a scope word in a reporting clause does not change that", () => {
  const plain = "The subject stated that he entered the United States in 2014 near Hidalgo, Texas.";
  assert.deepEqual(entryFindings(compare(ONE, [[plain, 2014, "unknown"]], { "entry.date": "03/01/2017" })), ["F-ENTRY-DATE"]);
  const asked = "When first asked, the subject said he entered the United States in 2014 near Hidalgo, Texas.";
  assert.equal(entryScope(asked, asked.indexOf("2014")), "unspecified", "\"first asked\" is not a first entry");
  assert.deepEqual(entryFindings(compare(ONE, [[asked, 2014, "unknown"]], { "entry.date": "03/01/2017" })), ["F-ENTRY-DATE"]);
});

test("a first entry the source says was the only one is the last entry, and is compared", () => {
  const only = "The subject stated that he first entered the United States in 2005 near Del Rio, Texas, and has never left the United States since.";
  const r = compare(ONE, [[only, 2005, "unknown"]], { "entry.date": "08/20/2010" });
  assert.deepEqual(entryFindings(r), ["F-ENTRY-DATE"]);
  // ... but not when another statement gives a last entry.
  assert.deepEqual(entryFindings(compare(ONE, [[only, 2005, "unknown"], [LAST, 2016, "without_inspection"]], { "entry.date": "08/20/2016" })), []);
});

// Paired: "did not leave since" evidence counts only when it is the same person's and refers to the same entry.
// "compared" = the first entry was promoted to the last (an F-ENTRY-DATE against the form's 2010); "first" = it was not.
const promoted = (sentence: string) => entryFindings(compare(ONE, [[sentence, 2005, "unknown"]], { "entry.date": "08/20/2010" })).includes("F-ENTRY-DATE") ? "compared" : "first";
test("paired: another person's no-departure statement does not make the subject's first entry the last", () => {
  // The review's reproduction: the clause is the wife's, and its date is another event.
  assert.equal(promoted("The subject first entered the United States in 2005; his wife has never left the United States since 2016."), "first");
  // Another person, with "since" alone (no date mismatch to lean on).
  assert.equal(promoted("The subject first entered the United States in 2005 and his wife has never left the United States since."), "first");
  // Another person who is not a relative: a redacted name as the clause's own subject.
  assert.equal(promoted(`The subject first entered the United States in 2005; ${R} has never left the United States since.`), "first");
  // A pronoun, but another person is mentioned in between: whose "he" is not established.
  assert.equal(promoted("The subject first entered the United States in 2005 with his brother; he has never left the United States since."), "first");
});
test("paired: the subject's own no-departure statement, tied to this entry, does", () => {
  assert.equal(promoted("The subject first entered the United States in 2005 and has never left the United States since."), "compared", "elided subject, coordinated with the entry");
  assert.equal(promoted("The subject first entered the United States in 2005; he has never left the United States since 2005."), "compared", "own pronoun, since the entry's year");
  assert.equal(promoted("The subject first entered the United States in 2005 and has remained in the United States since then."), "compared");
  assert.equal(promoted("The subject stated that his first and only entry into the United States was in 2005."), "compared", "\"only\" inside the entry's own clause");
});
test("paired date scope: the same person's statement about another time does not tie it to this entry", () => {
  assert.equal(promoted("The subject first entered the United States in 2005 and has never left the United States since 2016."), "first", "since another year");
  assert.equal(promoted("The subject first entered the United States in 2005 and has never left the United States."), "first", "no \"since\": no reference to this entry");
  assert.equal(promoted("The subject first entered the United States in 2005, returned to Mexico in 2008, and has never left the United States since."), "first", "a departure in between");
});

test("two statements conflict only about the same entry: last vs last (CAP-B2P), first vs first; not first vs last", () => {
  const a = "The subject stated that he last entered the United States in March 2014 near Hidalgo, Texas, by crossing the river without inspection.";
  const b = "During processing, the subject stated that his last entry into the United States was in March 2017, near Hidalgo, Texas.";
  const two = compare(ONE, [[a, 2014, "without_inspection"], [b, 2017, "unknown"]], NO_FORM);
  assert.deepEqual(entryFindings(two), ["F-ENTRY-DATE-2"]);
  assert.match(two.findings[0].explanation, /gives 2014 and another gives 2017 for the last entry/);
  const f1 = "The subject stated that he first entered the United States in 2005 near Del Rio, Texas.";
  const f2 = "Later the subject stated that he first entered the United States in 2008 near Del Rio, Texas.";
  const firsts = compare(ONE, [[f1, 2005, "unknown"], [f2, 2008, "unknown"]], NO_FORM);
  assert.deepEqual(entryFindings(firsts), ["F-ENTRY-DATE-2"]);
  assert.match(firsts.findings[0].explanation, /for the first entry/);
  assert.deepEqual(entryFindings(compare(ONE, [[FIRST, 2005, "unknown"], [LAST, 2016, "unknown"]], NO_FORM)), []);
});

test("control (CAP-B2N): a first answer the narrative corrects and explains is still not a conflict", () => {
  const a = "The subject initially stated that he last entered the United States in March 2014 near Hidalgo, Texas.";
  const b = "He then corrected himself and explained that he last entered in March 2017, because his daughter was born in Houston, Texas, in May 2017.";
  assert.deepEqual(entryFindings(compare(ONE, [[a, 2014, "unknown"], [b, 2017, "unknown"]], { "entry.date": "03/15/2017" })), []);
});

test("manner: a first entry made differently is not a conflict with the form's last-entry manner; the last entry's is", () => {
  const first = "The subject stated that he first entered the United States in 2005 at the Laredo port of entry with a tourist visa.";
  const last = "The subject stated that he last entered the United States in 2016 by crossing the river without inspection.";
  assert.deepEqual(entryFindings(compare(ONE, [[first, 2005, "admitted"], [last, 2016, "without_inspection"]], { "entry.date": "08/20/2016", "entry.manner": "EWI" })), []);
  const r = compare(ONE, [[first, 2005, "admitted"], [last, 2016, "without_inspection"]], { "entry.date": "08/20/2016", "entry.manner": "AIR" });
  const f = r.findings.find((x) => x.id === "F-ENTRY-MANNER")!;
  assert.ok(f);
  assert.equal(f.evidence[0].sentenceId, r.id(last));
  assert.match(f.explanation, /entry without inspection for the last entry/);
  // No form manner: two manners of the same (last) entry still conflict; a first and a last entry do not.
  assert.deepEqual(entryFindings(compare(ONE, [[first, 2005, "admitted"], [last, 2016, "without_inspection"]], NO_FORM)), []);
  const last2 = "Later the subject stated that he last entered the United States in 2016 at the Laredo port of entry with a tourist visa.";
  assert.deepEqual(entryFindings(compare(ONE, [[last, 2016, "without_inspection"], [last2, 2016, "admitted"]], NO_FORM)), ["F-ENTRY-MANNER-2"]);
});

// ---- 2. Attribution, evidence and explanation agree ----
const TWO = `${ENCOUNTER.replace("0900 hours.", "0900 hours and found two occupants.")} A woman, later identified as ${R}, was the driver.`;
const A2P_LAST = "He stated that he last entered the United States on June 2, 2017, by walking across the border near Nogales, Arizona, without inspection.";

test("reproduction (post-observation, CAP-A2P): the finding cites the designation the pronoun resolves to and explains it", () => {
  const r = compare(`${TWO} Agent ${R} questioned the subject, ${R}, about his citizenship. `, [[A2P_LAST, 2017, "without_inspection"]], { "entry.date": "06/02/2013", "entry.manner": "EWI" });
  const f = r.findings.find((x) => x.id === "F-ENTRY-DATE")!;
  assert.ok(f, "the conflict is still found");
  const via = r.s.find((x) => x.text.startsWith(`Agent ${R} questioned the subject`))!.id;
  assert.deepEqual(f.evidence.map((e) => e.sentenceId ?? e.fieldPath), [r.id(A2P_LAST), via, "entry.date"]);
  const link = f.evidence[1];
  assert.equal(link.quote, `the subject, ${R}`, "the designation itself is cited, verified");
  assert.ok(link.verified);
  assert.equal(link.context?.attribution, "subject");
  assert.doesNotMatch(f.explanation, /does not say whether this statement is about this record's subject/);
  assert.match(f.explanation, new RegExp(`its "He" can only refer to the person ${via} names as "the subject, \\[REDACTED\\]"`));
});

test("identical redaction markers: the pronoun resolves to the appositive subject, not to the agent with the same marker", () => {
  const s = splitSentences(`${TWO} Agent ${R} questioned the subject, ${R}, about his citizenship. ${A2P_LAST}`);
  const he = mentions(s.find((x) => x.text === A2P_LAST)!).find((m) => m.kind === "pronoun");
  const who = resolve(s, he);
  assert.equal(who.identity, "subject");
  assert.ok(who.support.some((x) => x.text === "the subject, "));
});

test("control: the pronoun's person is another candidate in the named sentence → no subject-specific finding; routed", () => {
  // A gender mismatch: the person named as the subject is "her"; "He" cannot be that person.
  const r = compare(`${TWO} Agent ${R} questioned the subject, ${R}, about her citizenship. `, [[A2P_LAST, 2017, "without_inspection"]], { "entry.date": "06/02/2013", "entry.manner": "EWI" });
  assert.deepEqual(entryFindings(r), []);
  assert.deepEqual(r.unattributed.map((u) => u.fieldPath), ["entry.date"]);
  // Two men in the named sentence ("the subject and his brother"): "He" is ambiguous.
  const r2 = compare(`${TWO} Agent ${R} questioned the subject and ${R} about their citizenship. `, [[A2P_LAST, 2017, "without_inspection"]], { "entry.date": "06/02/2013", "entry.manner": "EWI" });
  assert.deepEqual(entryFindings(r2), []);
});

test("control (CAP-A2N): two men with redacted names, no designation → routed, never a finding", () => {
  const a = `${R} stated that he last entered the United States on June 2, 2017, by walking across the border near Nogales, Arizona, without inspection.`;
  const b = `${R} stated that he last entered the United States on June 2, 2013, near Nogales, Arizona.`;
  const r = compare(`${ENCOUNTER} Agent ${R} questioned two men about their citizenship. `, [[a, 2017, "without_inspection"], [b, 2013, "unknown"]], { "entry.date": "06/02/2013", "entry.manner": "EWI" });
  assert.deepEqual(entryFindings(r), []);
  assert.ok(r.unattributed.some((u) => u.fieldPath === "entry.date"));
});

test("a narrative about one person: the explanation states that basis instead of the unresolved-attribution note", () => {
  const text = `${ENCOUNTER} Agent ${R} encountered ${R} near Monroe, Michigan. ${R} stated that he crossed the border illegally on 06/15/2012 near Naco, Arizona.`;
  const c = withText(BASE, text, { "entry.date": "06/15/2009", "entry.manner": "EWI" });
  const s = splitSentences(c.narrative.text);
  const st = s.find((x) => x.text.includes("06/15/2012"))!;
  const r = compareFacts(c, s, { entry_statements: [ent(st.id, "crossed the border illegally on 06/15/2012", 2012, "without_inspection")], removal_statements: [], status_statements: [] } as FactsOutput, runRules(c, s).notes.length > 0);
  const f = r.findings.find((x) => x.id === "F-ENTRY-DATE")!;
  assert.ok(f);
  assert.match(f.explanation, new RegExp(`${st.id} does not name the subject itself; the narrative describes only one person of interest`));
  assert.doesNotMatch(f.explanation, /does not say whether/);
});

// ---- 3. The timeout fallback reaches the same results ----
const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const timeout: Complete = async (system) => {
  if (system === FACTS_SYSTEM_PROMPT) throw new ModelError("The model endpoint did not answer within the time limit.", "timeout", 1);
  return { text: REVIEW, attempts: 1 };
};
test("timeout fallback: the source-text entry statements give the same scoped, explained results", async () => {
  const b1n = await reviewCase(withText(BASE, `${ONE}${FIRST} ${LAST}`, { "entry.date": "08/20/2016", "entry.manner": "EWI" }), timeout);
  assert.deepEqual(entryFindings(b1n), []);
  const a2pCase = withText(BASE, `${TWO} Agent ${R} questioned the subject, ${R}, about his citizenship. ${A2P_LAST}`, { "entry.date": "06/02/2013", "entry.manner": "EWI" });
  assert.equal(sourceEntryStatements(splitSentences(a2pCase.narrative.text)).find((e) => e.year === 2017)?.person, "subject", "the pronoun now resolves to the designated subject");
  const a2p = await reviewCase(a2pCase, timeout);
  const f = a2p.findings.find((x) => x.id === "F-ENTRY-DATE")!;
  assert.ok(f);
  assert.equal(f.source, "rule");
  assert.equal(f.evidence.length, 3, "statement, designation, form field");
  assert.equal(a2p.completion?.status, "partial");
});
