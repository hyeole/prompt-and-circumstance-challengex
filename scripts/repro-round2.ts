// Reproduces the round-2 defects against whatever implementation is checked out (no model calls).
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, isPriorRemoval, attributeStatement } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import { ModelError } from "../lib/llm";
import type { CaseRecord } from "../lib/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8")) as CaseRecord;
const sid = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text, c.narrative.pageSpans).find((s) => s.text.includes(needle))!.id;
const review = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const fake = (facts: string | Error): Complete => async (system) => {
  const v = system === FACTS_SYSTEM_PROMPT ? facts : review;
  if (v instanceof Error) throw v;
  return { text: v, attempts: 1 };
};
const ids = (r: { findings: { id: string }[] }) => r.findings.map((f) => f.id).join(",") || "none";

const amb = load("eval/cases/C003-AMB.json");
const s41 = sid(amb, "at the age of five"), s42 = sid(amb, "border crossing card");
const ent = (id: string, quote: string, country: string, event = "us_entry") => ({ sentence_id: id, quote, event, country, year: null, manner: "unknown", person: "unclear" });
const scenarios: [string, string | Error][] = [
  ["accurate extraction", JSON.stringify({ entry_statements: [ent(s41, "claims to have crossed the Mexico-United States border", "United States"), ent(s42, "he entered at the Nogales port of entry using a border crossing card", "United States")] })],
  ["incomplete extraction", JSON.stringify({ entry_statements: [] })],
  ["incorrect non-U.S. classification", JSON.stringify({ entry_statements: [ent(s41, "claims to have crossed the Mexico-United States border", "Mexico", "other_country_entry"), ent(s42, "he entered at the Nogales port of entry using a border crossing card", "United States")] })],
  ["invalid extraction output", "not json"],
  ["extraction timeout", new ModelError("timeout", "timeout", 1)],
];
for (const [name, facts] of scenarios) {
  const r = await reviewCase(amb, fake(facts));
  console.log(`R1 C003-AMB ${name}: findings ${ids(r)} | completion ${r.completion?.status}`);
}
const x1 = load("eval/cases/C013-X1.json");
const r2 = await reviewCase(x1, fake(JSON.stringify({ entry_statements: [], removal_statements: [] })));
console.log(`R2 C013-X1 explicit-subject reinstatement (S38) with extractor omitting it: findings ${ids(r2)}`);
const r3 = await reviewCase(x1, fake(new ModelError("timeout", "timeout", 1)));
console.log(`R3 C013-X1 history checks when extraction times out: findings ${ids(r3)}`);
const S = (text: string, id: string) => ({ id, text, start: 0, end: text.length, page: 1 });
console.log(`R4 isPriorRemoval("He has never been deported."): ${isPriorRemoval("He has never been deported.")}`);
console.log(`R5 attribution of "He later said he used a visa." after "The subject stated he crossed in 2014." (multi-person): ${attributeStatement([S("The subject stated he crossed in 2014.", "S1"), S("He later said he used a visa.", "S2")], "S2", true).outcome}`);
const h = load("eval/fresh/cases/F075-H.json");
const r6 = await reviewCase(h, fake(JSON.stringify({ entry_statements: [], removal_statements: [] })));
console.log(`R6 F075-H S22 (states the subject's exact recorded entry date) history finding: ${ids(r6)}`);
