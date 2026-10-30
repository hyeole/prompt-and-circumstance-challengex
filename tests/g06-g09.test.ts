// G06 and G09 (round-3 review): identity from a shared route, and a manner of entry recorded only as unknown. Each
// "defect" test fails on 4e76a9d; the controls pass on both. Offline (fake model; constructed extractions).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, compareFacts, type FactsOutput } from "../lib/review/facts";
import { runRules } from "../lib/review/rules";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8")) as CaseRecord;
const ent = (sentence_id: string, quote: string, year: number | null, manner: string, person = "unclear") => ({ sentence_id, quote, event: "us_entry", country: "United States", year, manner, person });
const facts = (entries: unknown[]): FactsOutput => ({ entry_statements: entries, removal_statements: [], status_statements: [] } as FactsOutput);
const cmp = (c: CaseRecord, f: FactsOutput) => {
  const s = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const r = compareFacts(c, s, f, runRules(c, s).notes.length > 0);
  return { findings: r.findings.map((x) => x.id), routed: r.unattributed.map((u) => u.sentenceId) };
};
const withText = (c: CaseRecord, text: string, values: Record<string, string> = {}): CaseRecord => ({
  ...c, narrative: { ...c.narrative, text, pageSpans: undefined } as CaseRecord["narrative"],
  facts: c.facts.map((f) => (f.path in values ? { ...f, value: values[f.path], status: (values[f.path] === "" ? "absent" : "present") as CaseRecord["facts"][number]["status"] } : f)),
});
const M = "[REDACTED (b)(6), (b)(7)(C)]";
const G06 = load("eval/gen-v1/cases/G06.json");
const THREE = "Agents encountered three men near Monroe, Michigan. All three men were transported to the station.";

test("G06: an unattributed account matching the form only on place and manner is routed, not attributed", () => {
  const S8 = "entered the United States in 2011 by crossing the river near Hidalgo, Texas", S9 = "entered in 2020 near Eagle Pass, Texas";
  assert.deepEqual(cmp(G06, facts([ent("S8", S8, 2011, "without_inspection"), ent("S9", S9, 2020, "unknown")])), { findings: [], routed: ["S8", "S9"] });
  const only = withText(G06, `${THREE} ${M} stated that he entered the United States in 2011 by crossing the river near Hidalgo, Texas.`);
  assert.deepEqual(cmp(only, facts([ent("S3", "entered the United States in 2011 by crossing the river near Hidalgo, Texas", 2011, "without_inspection")])), { findings: [], routed: ["S3"] });
});
test("G06 controls: shared facts stay routed; the subject named, a month-and-day match, and C119-X1 still link", () => {
  const shared = withText(G06, `${THREE} ${M} stated that he entered the United States on April 2, 2011 by crossing the river near Hidalgo, Texas. ${M} stated that he also crossed on April 2 near Hidalgo, Texas.`);
  assert.deepEqual(cmp(shared, facts([ent("S3", "entered the United States on April 2, 2011 by crossing the river near Hidalgo, Texas", 2011, "without_inspection")])).findings, []);
  const explicit = withText(G06, `${THREE} The subject stated that he entered the United States in 2011 by crossing the river near Hidalgo, Texas.`);
  assert.deepEqual(cmp(explicit, facts([ent("S3", "The subject stated that he entered the United States in 2011 by crossing the river near Hidalgo, Texas", 2011, "without_inspection")])).findings, ["F-ENTRY-DATE"]);
  const monthDay = withText(G06, `${THREE} ${M} stated that he entered the United States on April 2, 2011 by crossing the river near Hidalgo, Texas.`);
  assert.deepEqual(cmp(monthDay, facts([ent("S3", "entered the United States on April 2, 2011 by crossing the river near Hidalgo, Texas", 2011, "without_inspection")])).findings, ["F-ENTRY-DATE"]);
  const c119 = load("eval/cases/C119-X1.json");
  const s25 = splitSentences(c119.narrative.text, c119.narrative.pageSpans).find((s) => s.id === "S25")!;
  assert.deepEqual(cmp(c119, facts([ent("S25", s25.text, 2009, "admitted")])).findings, ["F-ENTRY-DATE"]);
});

const G09 = load("eval/gen-v1/cases/G09.json");
type El = { element_id: string; status: string; sentence_ids: string[] };
const reviewWith = (els: El[], factsText = JSON.stringify({ entry_statements: [], removal_statements: [] })): Complete => async (system) => ({
  text: system === FACTS_SYSTEM_PROMPT ? factsText : JSON.stringify({ elements: els.map((e) => ({ ...e, note: "" })), issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } }), attempts: 1 });
const e3Of = async (c: CaseRecord, complete: Complete) => {
  const r = await reviewCase(c, complete);
  const e = r.elements.find((x) => x.elementId === "E3")!;
  return { e3: `${e.status}${e.qualifier ? "/" + e.qualifier : ""}`, findings: r.findings.filter((f) => /^[MU]-E3$/.test(f.id)).map((f) => f.id) };
};

test("G09: a form manner recorded only as unknown, with a checked and silent narrative, is unclear (not present, not absent)", async () => {
  for (const status of ["absent", "unclear"]) assert.deepEqual(await e3Of(G09, reviewWith([{ element_id: "E3", status, sentence_ids: [] }])), { e3: "unclear", findings: ["U-E3"] }, status);
});
test("G09 controls: a stated manner, a narrative that says it is unknown, a known form value, a blank field, other elements, an unchecked narrative", async () => {
  const told = withText(G09, G09.narrative.text.replace("The subject stated that he came to the United States several years ago", "The subject stated that he crossed the Rio Grande illegally several years ago"));
  const s = splitSentences(told.narrative.text).find((x) => x.text.includes("crossed the Rio Grande"))!;
  assert.deepEqual(await e3Of(told, reviewWith([{ element_id: "E3", status: "present", sentence_ids: [s.id] }], JSON.stringify({ entry_statements: [ent(s.id, "crossed the Rio Grande illegally", null, "without_inspection", "subject")], removal_statements: [] }))), { e3: "present", findings: [] });
  // The extraction found a verified manner statement although the model did not cite it: not unclear.
  assert.deepEqual(await e3Of(told, reviewWith([{ element_id: "E3", status: "absent", sentence_ids: [] }], JSON.stringify({ entry_statements: [ent(s.id, "crossed the Rio Grande illegally", null, "without_inspection", "subject")], removal_statements: [] }))), { e3: "present/recorded_unknown", findings: [] });
  const unknownToo = withText(G09, G09.narrative.text.replace("The subject stated that he came to the United States several years ago", "The subject stated that he does not remember how he entered the United States"));
  const u = splitSentences(unknownToo.narrative.text).find((x) => x.text.includes("does not remember how"))!;
  assert.deepEqual(await e3Of(unknownToo, reviewWith([{ element_id: "E3", status: "present", sentence_ids: [u.id] }])), { e3: "present/recorded_unknown", findings: [] });
  assert.deepEqual(await e3Of(withText(G09, G09.narrative.text, { "entry.manner": "EWI" }), reviewWith([{ element_id: "E3", status: "absent", sentence_ids: [] }])), { e3: "present", findings: [] });
  assert.deepEqual(await e3Of(withText(G09, G09.narrative.text, { "entry.manner": "" }), reviewWith([{ element_id: "E3", status: "absent", sentence_ids: [] }])), { e3: "absent", findings: ["M-E3"] });
  const r = await reviewCase(G09, reviewWith([{ element_id: "E1", status: "absent", sentence_ids: [] }, { element_id: "E3", status: "absent", sentence_ids: [] }]));
  const e1 = r.elements.find((e) => e.elementId === "E1")!;
  assert.equal(`${e1.status}/${e1.qualifier}`, "present/recorded_unknown", "unknown dates are not changed");
  const failed: Complete = async (system) => { if (system !== FACTS_SYSTEM_PROMPT) throw new Error("timeout"); return { text: JSON.stringify({ entry_statements: [], removal_statements: [] }), attempts: 1 }; };
  assert.equal((await e3Of(G09, failed)).e3, "present/recorded_unknown", "the narrative was not checked");
});
