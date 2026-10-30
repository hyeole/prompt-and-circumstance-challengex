// Reproduces the four variants found by the independent review of ccc60d7 + b66a8cc, with nearby controls, against
// whatever implementation is checked out. Offline: the model is replaced by a fake (no network).
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { runRules } from "../lib/review/rules";
import { FACTS_SYSTEM_PROMPT, accountConflicts, compareFacts, isPriorRemoval, EMPTY_FACTS } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import type { CaseRecord, Sentence } from "../lib/types";

const S = (text: string, id: string): Sentence => ({ id, text, start: 0, end: text.length, page: 1 } as Sentence);
const seq = (...t: string[]) => t.map((x, i) => S(x, `S${i + 1}`));
const template = JSON.parse(readFileSync("eval/cases/C013-X1.json", "utf8")) as CaseRecord;
const record = (text: string, values: Record<string, string> = {}): CaseRecord => ({
  ...template, id: "SYN", narrative: { ...template.narrative, text, pageSpans: undefined } as CaseRecord["narrative"],
  facts: template.facts.map((f) => (f.path in values ? { ...f, value: values[f.path], status: "present" } : f)),
});
const NEG = record("x", { "history.immigration_record": "NEGATIVE" });
const history = (...t: string[]) => compareFacts(NEG, seq(...t), EMPTY_FACTS, false).findings.some((f) => f.id === "F-HISTORY");
const multi = (text: string) => runRules(record(text), splitSentences(text)).notes.length > 0;
const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const EMPTY = JSON.stringify({ entry_statements: [], removal_statements: [] });
const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? EMPTY : REVIEW, attempts: 1 });
const ids = (fs: { id: string }[]) => fs.map((f) => f.id);
let failures = 0;
const show = (label: string, observed: unknown, expected: unknown) => {
  const ok = JSON.stringify(observed) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: observed ${JSON.stringify(observed)}; expected ${JSON.stringify(expected)}`);
};
const M = "[REDACTED (b)(6), (b)(7)(C)]";

// ---- V1. Present-tense and progressive processing is not a completed removal ----
for (const t of ["The subject is processed for expedited removal.", "The subject is being processed for expedited removal.", "The subject was processed for expedited removal.",
  "The subject has been processed for expedited removal.", "The subjects are being processed for expedited removal.", "The subject is being processed as an expedited removal."])
  show(`V1 F-HISTORY against NEGATIVE for '${t}'`, history(t), false);
show("V1 control: 'is being processed for expedited removal and was removed to Mexico in 2012'", history("The subject is being processed for expedited removal and was removed to Mexico in 2012."), true);
show("V1 control: 'was previously removed to Mexico'", history("The subject was previously removed to Mexico."), true);

// ---- V2. "The other subject" inside a reported clause is someone else ----
const INTRO = "The subject was interviewed by the officer.", VISA = "He entered the United States on a visa in 2014.";
show("V2 F-ACCOUNT: 'He stated that the other subject entered … 2011'", ids(accountConflicts(seq(INTRO, "He stated that the other subject entered the United States illegally in 2011.", VISA))), []);
show("V2 nearby: 'He stated that the second subject entered … 2011'", ids(accountConflicts(seq(INTRO, "He stated that the second subject entered the United States illegally in 2011.", VISA))), []);
show("V2 nearby: 'He stated that another subject crossed … 2011'", ids(accountConflicts(seq(INTRO, "He stated that another subject crossed the river illegally in 2011.", VISA))), []);
show("V2 control (self): 'He stated that he entered … 2011'", ids(accountConflicts(seq(INTRO, "He stated that he entered the United States illegally in 2011.", VISA))), ["F-ACCOUNT"]);
show("V2 control (self): 'He stated that the subject entered … 2011'", ids(accountConflicts(seq(INTRO, "He stated that the subject entered the United States illegally in 2011.", VISA))), ["F-ACCOUNT"]);
show("V2 control (self, unreported verb): 'He later told agents that he claims to have crossed … 2011'", ids(accountConflicts(seq(INTRO, "He later told agents that he claims to have crossed the river illegally in 2011.", VISA))), ["F-ACCOUNT"]);
show("V2 control: 'The other subject was removed in 2015' against NEGATIVE", history("The other subject was removed to Mexico in 2015."), false);
show("V2 control (distributive): 'Both subjects were removed to Mexico in 2015' against NEGATIVE", history("Both subjects were removed to Mexico in 2015."), true);

// ---- V3. Numeric counts; an encountered companion ----
for (const t of [`Agents encountered 2 subjects near Laredo. ${M} stated that he was removed to Mexico in 2015.`,
  `Agents apprehended 3 individuals near the river. ${M} stated that he was removed to Mexico in 2015.`,
  `Agents encountered the subject and his companion near Laredo. ${M} was removed to Mexico in 2015.`,
  `Agents encountered ${M} and her brother near Laredo. ${M} was removed to Mexico in 2015.`])
  show(`V3 several people: '${t.split(".")[0]}'`, multi(t), true);
for (const t of [`Agents encountered the subject near Laredo. The subject stated that his wife and children live in Houston.`,
  `Agent ${M} and Agent ${M} encountered the subject near Laredo. The subject stated that he entered illegally in 2014.`,
  `Agents encountered the subject near mile marker 2. The subject stated that he entered illegally in 2014.`,
  `Agents encountered 1 subject near Laredo. The subject stated that he entered illegally in 2014.`,
  `Agents encountered the subject and Agent ${M} transported him. The subject stated that he entered illegally in 2014.`])
  show(`V3 control one person: '${t.split(".")[0]}'`, multi(t), false);
{
  const r = await reviewCase(record(`Agents encountered 2 subjects near Laredo. ${M} stated that he was removed to Mexico in 2015.`, { "history.immigration_record": "NEGATIVE" }), fake);
  show("V3 downstream: '2 subjects' + unattributed removal: F-HISTORY", r.findings.some((f) => f.id === "F-HISTORY"), false);
}

// ---- V4. Coordinated clauses keep an independently stated removal; denials stay denials ----
show("V4 'was not removed to Mexico and was removed to Honduras in 2012'", isPriorRemoval("The subject was not removed to Mexico and was removed to Honduras in 2012."), true);
show("V4 nearby: 'was not arrested and was deported in 2012'", isPriorRemoval("The subject was not arrested and was deported in 2012."), true);
show("V4 control: 'was not removed and was not deported'", isPriorRemoval("The subject was not removed and was not deported."), false);
show("V4 control: 'has never been arrested or removed'", isPriorRemoval("The subject has never been arrested or removed."), false);
show("V4 control: 'was never deported and was released'", isPriorRemoval("The subject was never deported and was released on his own recognizance."), false);
show("V4 control: 'was not removed and has no prior deportations'", isPriorRemoval("The subject was not removed and has no prior deportations."), false);
show("V4 control (round 3): 'did not resist and was removed in 2012'", isPriorRemoval("He did not resist and was removed in 2012."), true);

console.log(`\n${failures} reproduction check(s) not as expected.`);
