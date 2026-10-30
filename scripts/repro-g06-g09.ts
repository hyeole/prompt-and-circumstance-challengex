// Reproduces the G06 and G09 issues from the round-3 review, with positive and negative controls, against whatever
// implementation is checked out. Offline: the model is replaced by a fake (no network). Extractions are constructed,
// because raw results do not store the extracted facts.
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, compareFacts, type FactsOutput } from "../lib/review/facts";
import { runRules } from "../lib/review/rules";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const load = (p: string) => JSON.parse(readFileSync(p, "utf8")) as CaseRecord;
let failures = 0;
const show = (label: string, observed: unknown, expected: unknown) => {
  const ok = JSON.stringify(observed) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: observed ${JSON.stringify(observed)}; expected ${JSON.stringify(expected)}`);
};
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

// ---- G06: place and manner alone do not establish identity ----
{
  const g06 = load("eval/gen-v1/cases/G06.json");
  const S8 = "entered the United States in 2011 by crossing the river near Hidalgo, Texas", S9 = "entered in 2020 near Eagle Pass, Texas";
  show("G06 (place + manner match the form; S8 manner extracted): finding vs routing", cmp(g06, facts([ent("S8", S8, 2011, "without_inspection"), ent("S9", S9, 2020, "unknown")])), { findings: [], routed: ["S8", "S9"] });
  // Shared-fact negative controls: three people, one unattributed account matching the form only on place and manner.
  const base = load("eval/gen-v1/cases/G06.json");
  const crossing = withText(base, `Agents encountered three men near Monroe, Michigan. All three men were transported to the station. ${M} stated that he entered the United States in 2011 by crossing the river near Hidalgo, Texas.`);
  show("control (negative): place + manner only, no other account", cmp(crossing, facts([ent("S3", "entered the United States in 2011 by crossing the river near Hidalgo, Texas", 2011, "without_inspection")])), { findings: [], routed: ["S3"] });
  const shared = withText(base, `Agents encountered three men near Monroe, Michigan. All three men were transported to the station. ${M} stated that he entered the United States on April 2, 2011 by crossing the river near Hidalgo, Texas. ${M} stated that he also crossed on April 2 near Hidalgo, Texas.`);
  show("control (negative): month/day + place shared with a companion's account", cmp(shared, facts([ent("S3", "entered the United States on April 2, 2011 by crossing the river near Hidalgo, Texas", 2011, "without_inspection")])).findings, []);
  // Genuinely attributable positive controls.
  const explicit = withText(base, `Agents encountered three men near Monroe, Michigan. All three men were transported to the station. The subject stated that he entered the United States in 2011 by crossing the river near Hidalgo, Texas.`);
  show("control (positive): the subject named in the statement", cmp(explicit, facts([ent("S3", "The subject stated that he entered the United States in 2011 by crossing the river near Hidalgo, Texas", 2011, "without_inspection")])).findings, ["F-ENTRY-DATE"]);
  const monthDay = withText(base, `Agents encountered three men near Monroe, Michigan. All three men were transported to the station. ${M} stated that he entered the United States on April 2, 2011 by crossing the river near Hidalgo, Texas.`);
  show("control (positive): the form's entry month and day plus place, shared with no one", cmp(monthDay, facts([ent("S3", "entered the United States on April 2, 2011 by crossing the river near Hidalgo, Texas", 2011, "without_inspection")])).findings, ["F-ENTRY-DATE"]);
  const c119 = load("eval/cases/C119-X1.json");
  const s25 = splitSentences(c119.narrative.text, c119.narrative.pageSpans).find((s) => s.id === "S25")!;
  show("control (positive, saved case C119-X1): month/day + manner link kept", cmp(c119, facts([ent("S25", s25.text, 2009, "admitted")])).findings, ["F-ENTRY-DATE"]);
}

// ---- G09: a form value "UNK" with a silent narrative does not establish the manner of entry ----
{
  const g09 = load("eval/gen-v1/cases/G09.json");
  const review = (els: { element_id: string; status: string; sentence_ids: string[] }[]) => JSON.stringify({ elements: els.map((e) => ({ ...e, note: "" })), issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
  const run = async (c: CaseRecord, els: { element_id: string; status: string; sentence_ids: string[] }[], factsText = JSON.stringify({ entry_statements: [], removal_statements: [] })) => {
    const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? factsText : review(els), attempts: 1 });
    const r = await reviewCase(c, fake);
    const e3 = r.elements.find((e) => e.elementId === "E3")!;
    return { e3: `${e3.status}${e3.qualifier ? "/" + e3.qualifier : ""}`, findings: r.findings.filter((f) => /^[MU]-E3$/.test(f.id)).map((f) => f.id) };
  };
  show("G09 (form manner UNK; narrative silent; model reports E3 absent)", await run(g09, [{ element_id: "E3", status: "absent", sentence_ids: [] }]), { e3: "unclear", findings: ["U-E3"] });
  show("G09 (same; model reports E3 unclear)", await run(g09, [{ element_id: "E3", status: "unclear", sentence_ids: [] }]), { e3: "unclear", findings: ["U-E3"] });
  const g09text = g09.narrative.text;
  const told = withText(g09, g09text.replace("The subject stated that he came to the United States several years ago", "The subject stated that he crossed the Rio Grande illegally several years ago"));
  const s = splitSentences(told.narrative.text).find((x) => x.text.includes("crossed the Rio Grande"))!;
  show("control: narrative states the manner (model present with its sentence)", await run(told, [{ element_id: "E3", status: "present", sentence_ids: [s.id] }],
    JSON.stringify({ entry_statements: [ent(s.id, "crossed the Rio Grande illegally", null, "without_inspection", "subject")], removal_statements: [] })), { e3: "present", findings: [] });
  const unknownToo = withText(g09, g09text.replace("The subject stated that he came to the United States several years ago", "The subject stated that he does not remember how he entered the United States"));
  const u = splitSentences(unknownToo.narrative.text).find((x) => x.text.includes("does not remember how"))!;
  show("control: the narrative itself says the manner is unknown (documented in both)", await run(unknownToo, [{ element_id: "E3", status: "present", sentence_ids: [u.id] }]), { e3: "present/recorded_unknown", findings: [] });
  show("control: a known form manner settles the element", await run(withText(g09, g09text, { "entry.manner": "EWI" }), [{ element_id: "E3", status: "absent", sentence_ids: [] }]), { e3: "present", findings: [] });
  show("control: a blank manner field with a silent narrative stays missing", await run(withText(g09, g09text, { "entry.manner": "" }), [{ element_id: "E3", status: "absent", sentence_ids: [] }]), { e3: "absent", findings: ["M-E3"] });
  const r = await reviewCase(g09, async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? JSON.stringify({ entry_statements: [], removal_statements: [] }) : review([{ element_id: "E3", status: "absent", sentence_ids: [] }]), attempts: 1 }));
  const e1 = r.elements.find((e) => e.elementId === "E1")!;
  show("control (not global): an unknown entry DATE with a silent narrative is unchanged", `${e1.status}/${e1.qualifier}`, "present/recorded_unknown");
  const failed = await reviewCase(g09, async (system) => { if (system !== FACTS_SYSTEM_PROMPT) throw new Error("timeout"); return { text: JSON.stringify({ entry_statements: [], removal_statements: [] }), attempts: 1 }; });
  const e3f = failed.elements.find((e) => e.elementId === "E3")!;
  show("control: when the model review did not run, the narrative was not checked, so the field result stands", `${e3f.status}/${e3f.qualifier}`, "present/recorded_unknown");
}
console.log(`\n${failures} reproduction check(s) not as expected.`);
