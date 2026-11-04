// Follow-up to G06/G09 (review of aa322b6). Each "defect" test fails on aa322b6; the controls pass on both. Offline
// (fake model; constructed extractions; successful-path fixtures assert that extraction passed validation).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, compareFacts, type FactsOutput } from "../lib/review/facts";
import { runRules } from "../lib/review/rules";
import { splitSentences } from "../lib/text";
import { ModelError } from "../lib/llm";
import type { CaseRecord } from "../lib/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8")) as CaseRecord;
const ent = (sentence_id: string, quote: string, year: number | null, manner: string, person = "unclear") => ({ sentence_id, quote, event: "us_entry", country: "United States", year, manner, person });
const withText = (c: CaseRecord, text: string, values: Record<string, string> = {}): CaseRecord => ({
  ...c, narrative: { ...c.narrative, text, pageSpans: undefined } as CaseRecord["narrative"],
  facts: c.facts.map((f) => (f.path in values ? { ...f, value: values[f.path], status: "present" as const } : f)),
});
const M = "[REDACTED (b)(6), (b)(7)(C)]";
const THREE = "Agents encountered three men near Monroe, Michigan. All three men were transported to the station.";
const FORM = withText(load("eval/gen-v1/cases/G06.json"), "x", { "entry.date": "06/09/2011", "entry.manner": "EWI AFOOT", "entry.place": "near Hidalgo, TX" });
const link = (sentences: string, entries: unknown[]) => {
  const c = withText(FORM, `${THREE} ${sentences}`);
  const s = splitSentences(c.narrative.text);
  const r = compareFacts(c, s, { entry_statements: entries, removal_statements: [], status_statements: [] } as FactsOutput, runRules(c, s).notes.length > 0);
  return { findings: r.findings.map((x) => x.id), routed: r.unattributed.map((u) => u.sentenceId) };
};

test("G06 path: a month and day from another event or another person's entry does not link the account (compareFacts)", () => {
  for (const other of ["he was married on June 9, 2011", "he was arrested on June 9, 2011"])
    assert.deepEqual(link(`${M} stated that he entered the United States illegally in 2014; ${other}.`, [ent("S3", "entered the United States illegally in 2014", 2014, "without_inspection")]), { findings: [], routed: ["S3"] }, other);
  assert.deepEqual(link(`${M} stated that he entered the United States illegally in 2014 and that his wife entered on June 9, 2011.`, [ent("S3", "entered the United States illegally in 2014", 2014, "without_inspection")]), { findings: [], routed: ["S3"] });
});
// Changed in the accuracy iteration 1 audit: the first two assertions and C119-X1 were linked by value matching (month and day, manner),
// which was removed; they now stay unattributed. The companion control is unchanged.
test("G06 path controls: an entry clause's month and day does not link; a companion sharing it does not; C119-X1 not linked", () => {
  assert.deepEqual(link(`${M} stated that he entered the United States illegally on June 9, 2014 by crossing the river.`, [ent("S3", "entered the United States illegally on June 9, 2014 by crossing the river", 2014, "without_inspection")]).findings, []);
  assert.deepEqual(link(`${M} stated that he entered the United States on June 9, 2014 near Hidalgo, Texas.`, [ent("S3", "entered the United States on June 9, 2014 near Hidalgo, Texas", 2014, "unknown")]).findings, []);
  assert.deepEqual(link(`${M} stated that he entered the United States illegally on June 9, 2014 by crossing the river. ${M} stated that he also crossed on June 9 with him.`, [ent("S3", "entered the United States illegally on June 9, 2014 by crossing the river", 2014, "without_inspection")]).findings, []);
  const c119 = load("eval/cases/C119-X1.json");
  const s = splitSentences(c119.narrative.text, c119.narrative.pageSpans);
  const r = compareFacts(c119, s, { entry_statements: [ent("S25", s.find((x) => x.id === "S25")!.text, 2009, "admitted")], removal_statements: [], status_statements: [] } as FactsOutput, runRules(c119, s).notes.length > 0);
  assert.deepEqual(r.findings.map((x) => x.id), []);
});

const G09 = load("eval/gen-v1/cases/G09.json");
const CROSSED = withText(G09, G09.narrative.text.replace("The subject stated that he came to the United States several years ago", "The subject stated that he crossed the Rio Grande illegally several years ago"));
const REVIEW = JSON.stringify({ elements: [{ element_id: "E3", status: "absent", sentence_ids: [], note: "" }], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const fake = (facts: string | Error): Complete => async (system) => {
  if (system !== FACTS_SYSTEM_PROMPT) return { text: REVIEW, attempts: 1 };
  if (facts instanceof Error) throw facts;
  return { text: facts, attempts: 1 };
};
const e3 = async (c: CaseRecord, facts: string | Error) => {
  const r = await reviewCase(c, fake(facts));
  const e = r.elements.find((x) => x.elementId === "E3")!;
  return { extraction: r.completion?.failed.some((f) => f.check === "Fact extraction") ? "failed" : "ok", e3: `${e.status}${e.qualifier ? "/" + e.qualifier : ""}`, items: r.findings.filter((f) => /^[MU]-E3$/.test(f.id)).map((f) => f.id) };
};
const sid = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text).find((x) => x.text.includes(needle))!.id;

test("G09 path: a failed or invalid extraction is not evidence that the narrative lacks the manner", async () => {
  for (const facts of [new ModelError("timeout", "timeout", 1), "not json"]) {
    assert.deepEqual(await e3(CROSSED, facts), { extraction: "failed", e3: "present/recorded_unknown", items: [] });
    assert.deepEqual(await e3(G09, facts), { extraction: "failed", e3: "present/recorded_unknown", items: [] });
  }
});
test("G09 path controls: a validated extraction with an unknown manner is unclear; one with a verified manner is not", async () => {
  assert.deepEqual(await e3(G09, JSON.stringify({ entry_statements: [ent(sid(G09, "came to the United States"), "he came to the United States several years ago", null, "unknown", "subject")], removal_statements: [] })), { extraction: "ok", e3: "unclear", items: ["U-E3"] });
  assert.deepEqual(await e3(CROSSED, JSON.stringify({ entry_statements: [ent(sid(CROSSED, "crossed the Rio Grande"), "crossed the Rio Grande illegally", null, "without_inspection", "subject")], removal_statements: [] })), { extraction: "ok", e3: "present/recorded_unknown", items: [] });
});
