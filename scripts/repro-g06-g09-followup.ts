// Reproduces the two gaps found by the review of aa322b6, with controls, against whatever implementation is checked
// out. Offline: the model is replaced by a fake (no network); extractions are constructed, and each fixture states
// whether it passes extraction validation.
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, compareFacts, type FactsOutput } from "../lib/review/facts";
import { runRules } from "../lib/review/rules";
import { splitSentences } from "../lib/text";
import { ModelError } from "../lib/llm";
import type { CaseRecord } from "../lib/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8")) as CaseRecord;
let failures = 0;
const show = (label: string, observed: unknown, expected: unknown) => {
  const ok = JSON.stringify(observed) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: observed ${JSON.stringify(observed)}; expected ${JSON.stringify(expected)}`);
};
const ent = (sentence_id: string, quote: string, year: number | null, manner: string, person = "unclear") => ({ sentence_id, quote, event: "us_entry", country: "United States", year, manner, person });
const withText = (c: CaseRecord, text: string, values: Record<string, string> = {}): CaseRecord => ({
  ...c, narrative: { ...c.narrative, text, pageSpans: undefined } as CaseRecord["narrative"],
  facts: c.facts.map((f) => (f.path in values ? { ...f, value: values[f.path], status: "present" as const } : f)),
});
const M = "[REDACTED (b)(6), (b)(7)(C)]";

// ---- 1. G06 path: every corroborating fact must belong to the entry event (through compareFacts) ----
{
  const base = withText(load("eval/gen-v1/cases/G06.json"), "x", { "entry.date": "06/09/2011", "entry.manner": "EWI AFOOT", "entry.place": "near Hidalgo, TX" });
  const THREE = "Agents encountered three men near Monroe, Michigan. All three men were transported to the station.";
  const run = (sentence: string, quote: string, year: number, manner = "without_inspection") => {
    const c = withText(base, `${THREE} ${sentence}`);
    const s = splitSentences(c.narrative.text);
    const r = compareFacts(c, s, { entry_statements: [ent("S3", quote, year, manner)], removal_statements: [], status_statements: [] } as FactsOutput, runRules(c, s).notes.length > 0);
    return { findings: r.findings.map((x) => x.id), routed: r.unattributed.map((u) => u.sentenceId) };
  };
  show("G06 path: month/day belongs to a marriage ('he was married on June 9, 2011')",
    run(`${M} stated that he entered the United States illegally in 2014; he was married on June 9, 2011.`, "entered the United States illegally in 2014", 2014), { findings: [], routed: ["S3"] });
  show("G06 path: month/day belongs to an arrest ('he was arrested on June 9, 2011')",
    run(`${M} stated that he entered the United States illegally in 2014; he was arrested on June 9, 2011.`, "entered the United States illegally in 2014", 2014), { findings: [], routed: ["S3"] });
  show("G06 path: place belongs to another event ('… in 2014, and he later worked near Hidalgo')",
    run(`${M} stated that he entered the United States illegally in 2014 on June 9, and he later worked near Hidalgo, Texas.`, "entered the United States illegally in 2014 on June 9", 2014).findings, ["F-ENTRY-DATE"]);
  show("G06 path: the month/day of a relative's entry ('his wife entered on June 9, 2011')",
    run(`${M} stated that he entered the United States illegally in 2014 and that his wife entered on June 9, 2011.`, "entered the United States illegally in 2014", 2014), { findings: [], routed: ["S3"] });
  // Genuine-entry and shared-companion controls.
  show("control: month/day and manner in the entry clause itself still link",
    run(`${M} stated that he entered the United States illegally on June 9, 2014 by crossing the river.`, "entered the United States illegally on June 9, 2014 by crossing the river", 2014).findings, ["F-ENTRY-DATE"]);
  show("control: month/day and place in the entry clause itself still link",
    run(`${M} stated that he entered the United States on June 9, 2014 near Hidalgo, Texas.`, "entered the United States on June 9, 2014 near Hidalgo, Texas", 2014, "unknown").findings, ["F-ENTRY-DATE"]);
  const c = withText(base, `${THREE} ${M} stated that he entered the United States illegally on June 9, 2014 by crossing the river. ${M} stated that he also crossed on June 9 with him.`);
  const s = splitSentences(c.narrative.text);
  show("control: a companion sharing the entry month/day blocks the link",
    compareFacts(c, s, { entry_statements: [ent("S3", "entered the United States illegally on June 9, 2014 by crossing the river", 2014, "without_inspection")], removal_statements: [], status_statements: [] } as FactsOutput, true).findings.map((x) => x.id), []);
  const c119 = load("eval/cases/C119-X1.json");
  const s119 = splitSentences(c119.narrative.text, c119.narrative.pageSpans);
  show("control (saved case C119-X1): month/day + manner link kept",
    compareFacts(c119, s119, { entry_statements: [ent("S25", s119.find((x) => x.id === "S25")!.text, 2009, "admitted")], removal_statements: [], status_statements: [] } as FactsOutput, runRules(c119, s119).notes.length > 0).findings.map((x) => x.id), ["F-ENTRY-DATE"]);
}

// ---- 2. G09 path: failed extraction is not evidence that the narrative lacks the manner ----
{
  const g09 = load("eval/gen-v1/cases/G09.json");
  const crossed = withText(g09, g09.narrative.text.replace("The subject stated that he came to the United States several years ago", "The subject stated that he crossed the Rio Grande illegally several years ago"));
  const reviewOut = JSON.stringify({ elements: [{ element_id: "E3", status: "absent", sentence_ids: [], note: "" }], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
  const fake = (facts: string | Error): Complete => async (system) => {
    if (system !== FACTS_SYSTEM_PROMPT) return { text: reviewOut, attempts: 1 };
    if (facts instanceof Error) throw facts;
    return { text: facts, attempts: 1 };
  };
  const out = async (c: CaseRecord, facts: string | Error) => {
    const r = await reviewCase(c, fake(facts));
    const e3 = r.elements.find((e) => e.elementId === "E3")!;
    return { extraction: r.completion?.failed.some((f) => f.check === "Fact extraction") ? "failed" : "ok", e3: `${e3.status}${e3.qualifier ? "/" + e3.qualifier : ""}`, items: r.findings.filter((f) => /^[MU]-E3$/.test(f.id)).map((f) => f.id) };
  };
  const sid = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text).find((x) => x.text.includes(needle))!.id;
  const timeout = new ModelError("timeout", "timeout", 1);
  show("G09 path: narrative states the manner, extraction timed out", await out(crossed, timeout), { extraction: "failed", e3: "present/recorded_unknown", items: [] });
  show("G09 path: narrative states the manner, extraction output invalid", await out(crossed, "not json"), { extraction: "failed", e3: "present/recorded_unknown", items: [] });
  show("G09 path: G09 itself, extraction timed out (uncertain, not absent)", await out(g09, timeout), { extraction: "failed", e3: "present/recorded_unknown", items: [] });
  // Successful extractions that pass validation (an entry statement for the narrative's entry sentence).
  const came = sid(g09, "came to the United States");
  show("control: G09, successful extraction with the manner unknown -> unclear",
    await out(g09, JSON.stringify({ entry_statements: [ent(came, "he came to the United States several years ago", null, "unknown", "subject")], removal_statements: [] })), { extraction: "ok", e3: "unclear", items: ["U-E3"] });
  const cr = sid(crossed, "crossed the Rio Grande");
  show("control: successful extraction containing a verified manner -> not unclear",
    await out(crossed, JSON.stringify({ entry_statements: [ent(cr, "crossed the Rio Grande illegally", null, "without_inspection", "subject")], removal_statements: [] })), { extraction: "ok", e3: "present/recorded_unknown", items: [] });
}
console.log(`\n${failures} reproduction check(s) not as expected.`);
