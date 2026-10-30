// Reproduces the multi-person detection threshold: narratives with clearly distinct people but group wording in only
// one sentence (or none) were treated as single-person, so their unattributed statements counted for the subject.
// Runs against whatever implementation is checked out; the model is replaced by a fake (no network).
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { runRules } from "../lib/review/rules";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const template = JSON.parse(readFileSync("eval/cases/C013-X1.json", "utf8")) as CaseRecord;
const record = (text: string, values: Record<string, string> = {}): CaseRecord => ({
  ...template, id: "SYN", narrative: { ...template.narrative, text, pageSpans: undefined } as CaseRecord["narrative"],
  facts: template.facts.map((f) => (f.path in values ? { ...f, value: values[f.path], status: "present" } : f)),
});
const multi = (text: string) => runRules(record(text), splitSentences(text)).notes.length > 0;
const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const EMPTY = JSON.stringify({ entry_statements: [], removal_statements: [] });
const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? EMPTY : REVIEW, attempts: 1 });
let failures = 0;
const show = (label: string, observed: unknown, expected: unknown) => {
  const ok = JSON.stringify(observed) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: observed ${JSON.stringify(observed)}; expected ${JSON.stringify(expected)}`);
};
const M = "[REDACTED (b)(6), (b)(7)(C)]";

// Distinct people, group wording at most once: several people.
const positives: [string, string][] = [
  ["a count in one sentence", `Border Patrol Agents encountered two subjects near Laredo, Texas. ${M} stated that he was removed to Mexico in 2015.`],
  ["two coordinated redacted people, no group words", `Agents apprehended ${M} and ${M} near the river. ${M} stated that he was removed to Mexico in 2015.`],
  ["'the other subject'", `Agents encountered the subject near Laredo. The other subject stated that he entered illegally in 2014.`],
  ["'a man and a woman'", `Agents apprehended a man and a woman near the river. ${M} stated that he was removed to Mexico in 2015.`],
  ["'both of them' once", `Agents stopped a vehicle near Laredo. Both of them were transported to the station. ${M} was removed to Mexico in 2015.`],
  ["'one of the subjects' once", `Agents responded to a sensor near Laredo. One of the subjects ran south. ${M} was removed to Mexico in 2015.`],
];
for (const [name, text] of positives) show(`P several people: ${name}`, multi(text), true);

// One person of interest: officers, repeated markers, a bare plural or a relative mentioned do not make several.
const negatives: [string, string][] = [
  ["two named officers", `Agent ${M} and Agent ${M} arrested the subject near Laredo. The subject stated that he entered illegally in 2014.`],
  ["coordinated officers under one title", `Agents ${M} and ${M} arrested the subject near Laredo. The subject stated that he entered illegally in 2014.`],
  ["the same redaction marker repeated", `${M} was encountered near Laredo. ${M} stated that he entered illegally in 2014. ${M} was transported to the station.`],
  ["a bare plural in boilerplate", `Subjects encountered at the checkpoint are screened for medical issues. The subject stated that he entered illegally in 2014.`],
  ["a relative mentioned", `Agents encountered the subject near Laredo. The subject stated that his wife lives in Houston.`],
  ["subject with name and details", `Agents encountered ${M} (A# ${M}, DOB ${M}) near Laredo. ${M} stated that he entered illegally in 2014.`],
];
for (const [name, text] of negatives) show(`N one person: ${name}`, multi(text), false);
show("control: existing rule (group wording twice) still several", multi(`Agents encountered several subjects near Laredo. All subjects were transported to the station.`), true);

// Downstream: an unattributed removal must not count for the subject when several people are described.
{
  const text = positives[0][1];
  const r = await reviewCase(record(text, { "history.immigration_record": "NEGATIVE" }), fake);
  show("D unattributed removal, two subjects named once: F-HISTORY against NEGATIVE", r.findings.some((f) => f.id === "F-HISTORY"), false);
  show("D the removal statement is routed for a person instead", r.humanReview.accounts?.some((u) => u.sentenceIds.includes("S2")) ?? false, true);
}
console.log(`\n${failures} reproduction check(s) not as expected.`);
