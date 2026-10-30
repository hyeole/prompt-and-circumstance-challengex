// Reproduces the defects reported by the independent offline review of 033a102, against whatever implementation is
// checked out. The model is replaced by a fake (no network). Each line prints the observed value and the expected one.
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, attributeStatement, compareFacts, accountConflicts, fullDates, isPriorRemoval, describesUsEntry, nonUsEntrySentences, exactEntryLink, EMPTY_FACTS, type FactsOutput } from "../lib/review/facts";
import { ModelError } from "../lib/llm";
import type { CaseRecord, Sentence } from "../lib/types";

const S = (text: string, id: string): Sentence => ({ id, text, start: 0, end: text.length, page: 1 } as Sentence);
const seq = (...t: string[]) => t.map((x, i) => S(x, `S${i + 1}`));
const template = JSON.parse(readFileSync("eval/cases/C013-X1.json", "utf8")) as CaseRecord;
/** A synthetic record: the template's structure with this narrative and these form values. */
const record = (text: string, values: Record<string, string>): CaseRecord => ({
  ...template, id: "SYN", narrative: { ...template.narrative, text, pageSpans: undefined } as CaseRecord["narrative"],
  facts: template.facts.map((f) => (f.path in values ? { ...f, value: values[f.path], status: "present" } : f)),
});
const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const fake = (facts: string | Error): Complete => async (system) => {
  const v = system === FACTS_SYSTEM_PROMPT ? facts : REVIEW;
  if (v instanceof Error) throw v;
  return { text: v, attempts: 1 };
};
let failures = 0;
const show = (label: string, observed: unknown, expected: unknown) => {
  const ok = JSON.stringify(observed) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: observed ${JSON.stringify(observed)}; expected ${JSON.stringify(expected)}`);
};
const ids = (fs: { id: string }[]) => fs.map((f) => f.id);
const facts = (f: Partial<FactsOutput>): FactsOutput => ({ ...EMPTY_FACTS, ...f } as FactsOutput);

// ---- 1. Event-scoped attribution and calendar dates ----
{
  const c = record("x", { "entry.date": "06/09/2011", "entry.manner": "EWI", "history.immigration_record": "NEGATIVE" });
  const s = seq("Agents encountered [REDACTED (b)(6), (b)(7)(C)] and [REDACTED (b)(6), (b)(7)(C)] near the river.",
    "[REDACTED (b)(6), (b)(7)(C)] entered illegally in 2014; he was married on June 9, 2011 and was removed in 2010.");
  show("D1a exactEntryLink when the full date belongs to a marriage, not the entry", exactEntryLink(c, s, "S2"), false);
  show("D1a attributeStatement outcome for that sentence (multi-person)", attributeStatement(s, "S2", true, undefined, c).outcome, "ambiguous");
  const s2 = seq("Agents encountered [REDACTED (b)(6), (b)(7)(C)] and [REDACTED (b)(6), (b)(7)(C)] near the river.",
    "[REDACTED (b)(6), (b)(7)(C)] entered the United States illegally on June 9, 2011 by wading the river.");
  show("D1b control: entry clause carrying the full date and manner still links", exactEntryLink(c, s2, "S2"), true);
  show("D1c fullDates of an impossible date 02/30/2011", fullDates("He entered on 02/30/2011."), []);
  show("D1c fullDates of 13/01/2011", fullDates("He entered on 13/01/2011."), []);
  show("D1c fullDates of 'June 31, 2011'", fullDates("He entered on June 31, 2011."), []);
  show("D1c control: 02/29/2012 (leap year) is valid", fullDates("He entered on 02/29/2012."), ["2012-02-29"]);
  show("D1c control: the day after 12/31/2011 rolls over", fullDates("He entered the day after 12/31/2011."), ["2012-01-01"]);
}

// ---- 2. History polarity and chronology ----
{
  show("D2a isPriorRemoval('The subject has not at any time been deported.')", isPriorRemoval("The subject has not at any time been deported."), false);
  const c = record("x", { "history.immigration_record": "NEGATIVE" });
  const neg = seq("The subject has not at any time been deported.");
  show("D2a F-HISTORY against NEGATIVE for that denial", ids(compareFacts(c, neg, EMPTY_FACTS, false).findings).includes("F-HISTORY"), false);
  show("D2b isPriorRemoval('On 03/04/2019 the subject was processed for expedited removal.')", isPriorRemoval("On 03/04/2019 the subject was processed for expedited removal."), false);
  show("D2b isPriorRemoval('In 2015 the subject was placed in removal proceedings.')", isPriorRemoval("In 2015 the subject was placed in removal proceedings."), false);
  show("D2c mixed clause keeps the affirmative: 'The subject was not deported in 2015, but he was removed in 2017.'", isPriorRemoval("The subject was not deported in 2015, but he was removed in 2017."), true);
  show("D2c control: 'Subject was previously removed to Mexico on 03/04/2019.'", isPriorRemoval("Subject was previously removed to Mexico on 03/04/2019."), true);
  show("D2c control: 'Subject was processed for expedited removal and removed to Mexico on 03/04/2019.'", isPriorRemoval("Subject was processed for expedited removal and removed to Mexico on 03/04/2019."), true);
  show("D2c control: 'did not receive a bond due to him being a reinstate case' (not a denial)", isPriorRemoval("Subject did not receive a bond due to him being a reinstate case."), true);
  show("D2c control: 'did not resist and was removed in 2012' (negation of another verb)", isPriorRemoval("He did not resist and was removed in 2012."), true);
}

// ---- 3. Extraction-dependent suppression of an explicitly-subject removal ----
{
  const text = "Border Patrol Agents encountered the subject and another man near Laredo, Texas. The subject was removed to Mexico on 05/01/2015 and was later processed as a reinstatement. The other man stated he had never been arrested.";
  const c = record(text, { "history.immigration_record": "NEGATIVE", "entry.date": "Unknown Date, Unknown Time" });
  const [, s2] = ["", "The subject was removed to Mexico on 05/01/2015 and was later processed as a reinstatement."];
  const rem = (person: string) => JSON.stringify({ entry_statements: [], removal_statements: [{ sentence_id: "S2", quote: s2, person }] });
  const scenarios: [string, string | Error][] = [
    ["accurate (person subject)", rem("subject")], ["omitted", JSON.stringify({ entry_statements: [], removal_statements: [] })],
    ["misattributed (person other)", rem("other")], ["invalid output", "not json"], ["failed (timeout)", new ModelError("timeout", "timeout", 1)],
  ];
  for (const [name, f] of scenarios) {
    const r = await reviewCase(c, fake(f));
    show(`D3 explicitly-subject removal, extraction ${name}: F-HISTORY`, r.findings.some((x) => x.id === "F-HISTORY"), true);
  }
  // Controls: an unattributed removal in a multi-person narrative is not made the subject's, whatever the extraction says.
  // (Multi-person detection needs two sentences with group wording, as in the evaluation narratives.)
  const unattributed = "Border Patrol Agents encountered two subjects near Laredo, Texas. Both subjects were transported to the station. [REDACTED (b)(6), (b)(7)(C)] was removed to Mexico on 05/01/2015.";
  const cu = record(unattributed, { "history.immigration_record": "NEGATIVE" });
  for (const person of ["other", "unclear", "subject"]) {
    const r = await reviewCase(cu, fake(JSON.stringify({ entry_statements: [], removal_statements: [{ sentence_id: "S3", quote: "was removed to Mexico on 05/01/2015", person }] })));
    show(`D3 control: unattributed removal (multi-person), extractor person ${person}: F-HISTORY`, r.findings.some((x) => x.id === "F-HISTORY"), false);
  }
}

// ---- 4. Person transitions inside continuous accounts ----
{
  const s = seq("The subject was interviewed by the officer.", "He stated that his wife entered the United States illegally in 2011.", "He entered the United States on a visa in 2014.");
  show("D4a F-ACCOUNT comparing the wife's entry with his own", ids(accountConflicts(s)), []);
  const q = seq("The subject was interviewed by the officer.", "He said, \"My brother crossed the river illegally in 2011.\"", "He entered the United States on a visa in 2014.");
  show("D4b quoted statement about a brother", ids(accountConflicts(q)), []);
  const comp = seq("The subject was interviewed by the officer.", "He stated that his companion crossed into the United States illegally in 2011.", "He entered the United States on a visa in 2014.");
  show("D4c companion (his companion)", ids(accountConflicts(comp)), []);
  const grp = seq("The subject was interviewed by the officer.", "He stated that they crossed into the United States illegally in 2011.", "He entered the United States on a visa in 2014.");
  show("D4c group ('they'): not compared as his own entry", ids(accountConflicts(grp)), []);
  const indef = record("x", { "history.immigration_record": "NEGATIVE" });
  const g = seq("Agents encountered four men near the river.", "All four subjects were transported to the station.", "Records checks showed that one of the four men had been deported to Honduras in 2015.");
  show("D4g control: 'one of the four men' (could be the subject) is still routed, not dropped as someone else", compareFacts(indef, g, EMPTY_FACTS, true).unattributed.map((u) => u.sentenceId), ["S3"]);
  const own = seq("The subject was interviewed by the officer.", "He stated that he entered the United States illegally in 2011.", "He entered the United States on a visa in 2014.");
  show("D4d control: his own reported entry still conflicts", ids(accountConflicts(own)), ["F-ACCOUNT"]);
  const quotedOwn = seq("The subject was interviewed by the officer.", "He said, \"I crossed the river illegally in 2011.\"", "He entered the United States on a visa in 2014.");
  show("D4e control: his own quoted entry still conflicts", ids(accountConflicts(quotedOwn)), ["F-ACCOUNT"]);
  const brotherRemoved = record("x", { "history.immigration_record": "NEGATIVE" });
  show("D4f 'Subject stated that his brother was deported in 2012' against NEGATIVE: F-HISTORY", ids(compareFacts(brotherRemoved, seq("Subject stated that his brother was deported in 2012."), EMPTY_FACTS, false).findings).includes("F-HISTORY"), false);
}

// ---- 5. Direction and destination ----
{
  show("D5a describesUsEntry('He crossed from the United States into France in 2014.')", describesUsEntry(seq("He crossed from the United States into France in 2014.")), false);
  show("D5b describesUsEntry('He arrived at the United States embassy in Paris in 2014.')", describesUsEntry(seq("He arrived at the United States embassy in Paris in 2014.")), false);
  const ex = (text: string, event: string, country: string) => [...nonUsEntrySentences(facts({ entry_statements: [{ sentence_id: "S1", quote: text, event, country, year: 2014, manner: "unknown", person: "unclear" }] as never }), seq(text))];
  show("D5c a foreign entry labelled by the extractor stays excluded ('from the United States into France')", ex("He crossed from the United States into France in 2014.", "other_country_entry", "France"), ["S1"]);
  show("D5c a departure labelled by the extractor stays excluded", ex("He departed the United States for Mexico in 2014.", "departure", "Mexico"), ["S1"]);
  const acct = seq("The subject was interviewed by the officer.", "He entered the United States illegally in 2011.", "He crossed from the United States into France in 2014.");
  show("D5d no F-ACCOUNT for a later trip from the U.S. to France", ids(accountConflicts(acct)), []);
  show("D5e control: 'He crossed from Mexico into the United States in 2014.'", describesUsEntry(seq("He crossed from Mexico into the United States in 2014.")), true);
  show("D5e control: 'He came to the United States from Mexico in 2014.'", describesUsEntry(seq("He came to the United States from Mexico in 2014.")), true);
  show("D5e control: 'He crossed the Mexico-United States border at age five.'", describesUsEntry(seq("He crossed the Mexico-United States border at age five.")), true);
}

// ---- 6. Provenance of source-only history findings ----
{
  const c = record("x", { "history.immigration_record": "NEGATIVE", "encounter.date_time": "05/01/2019 1200" });
  const src = (f: { findings: { id: string; source: string }[] }, id: string) => f.findings.find((x) => x.id === id)?.source;
  show("D6a F-HISTORY from the source scan only (no extraction): provenance", src(compareFacts(c, seq("The subject was removed to Mexico in 2015."), EMPTY_FACTS, false), "F-HISTORY"), "rule");
  show("D6b F-HISTORY-3 (source only): provenance", src(compareFacts(c, seq("The subject was previously apprehended by Border Patrol in 2012 and granted voluntary return."), EMPTY_FACTS, false), "F-HISTORY-3"), "rule");
  const s = seq("The subject was removed to Mexico in 2015.");
  const extracted = facts({ removal_statements: [{ sentence_id: "S1", quote: "The subject was removed to Mexico in 2015.", person: "subject" }] as never });
  // The extractor also listing the removal does not make it required: the text alone yields the same finding.
  show("D6c F-HISTORY when the extractor also listed the removal (not required): provenance", src(compareFacts(c, s, extracted, false), "F-HISTORY"), "rule");
  const pos = record("x", { "history.immigration_record": "POSITIVE - removed 2012" });
  show("D6d F-HISTORY-2 (form-only omission; extraction not required): provenance", src(compareFacts(pos, seq("The subject was encountered near Laredo."), EMPTY_FACTS, false), "F-HISTORY-2"), "rule");
}

// ---- 7. Subject's denial alongside a companion's actual removal ----
{
  const c = record("x", { "history.immigration_record": "POSITIVE - removed 2012" });
  const s = seq("Agents encountered the subject and his companion near Laredo.", "The subject stated that he has never been deported.", "His companion, [REDACTED (b)(6), (b)(7)(C)], was deported to Mexico in 2013.");
  show("D7 subject's denial vs the form's removal, with a companion's removal elsewhere: F-HISTORY-4", ids(compareFacts(c, s, EMPTY_FACTS, true).findings).includes("F-HISTORY-4"), true);
  const own = seq("Agents encountered the subject near Laredo.", "The subject stated that he has never been deported.", "The subject was deported to Mexico in 2013.");
  show("D7 control: the subject's own removal elsewhere means no F-HISTORY-4", ids(compareFacts(c, own, EMPTY_FACTS, false).findings).includes("F-HISTORY-4"), false);
}

console.log(`\n${failures} reproduction check(s) not as expected.`);
