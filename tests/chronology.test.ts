// Chronology correction (branch improve/chronology-1, from 74e15fb). POST-OBSERVATION: the XE01, XE05 and XN05
// reproductions use the ex-1 cases and the fact extractions actually returned in the ex-1 live run (baseline engine;
// XE01 also the candidate engine's), copied below. Offline: fake model. The controls are new wordings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, type FactsOutput } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const ALL = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8"];
const run = (c: CaseRecord, facts: FactsOutput) => {
  const elements = ALL.map((id) => ({ element_id: id, status: "present", sentence_ids: [], note: "" }));
  const out = JSON.stringify({ elements, issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
  const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? JSON.stringify(facts) : out, attempts: 1 });
  return reviewCase(c, fake);
};
const load = (id: string) => JSON.parse(readFileSync(`eval/ex-1/cases/${id}.json`, "utf8")) as CaseRecord;
type E = FactsOutput["entry_statements"][number];
const en = (sentence_id: string, quote: string, year: number | null, extra: Partial<E> = {}): E =>
  ({ sentence_id, quote, event: "us_entry", country: "United States", year, manner: "unknown", person: "unclear", uncertainty: "stated", ...extra });
const F = (entries: E[]): FactsOutput => ({ entry_statements: entries, removal_statements: [], status_statements: [] });
const dates = (r: Awaited<ReturnType<typeof run>>) => r.findings.filter((f) => f.id === "F-ENTRY-DATE").map((f) => f.evidence.find((e) => e.sentenceId)?.sentenceId);

// ---- Reproductions (ex-1 live extractions) ----
// Baseline engine's extraction for XE01 (live run 2026-11-05).
const XE01_BASE = F([
  en("S5", "The subject said he has crossed the border three times.", null),
  en("S6", "The first time was in 2008, when he was a teenager; he was caught near Nogales and sent back the same day.", 2008),
  en("S7", "The second time, in 2012, he stayed about a year in Phoenix before going home on his own for his father's funeral.", 2012),
  en("S8", "The subject stated that his most recent crossing was in the summer of 2017", 2017),
]);
test("XE01 (live baseline extraction): the most recent crossing (S8, 2017) is reported, not the first (S6, 2008)", async () => {
  const r = await run(load("XE01"), XE01_BASE);
  assert.deepEqual(dates(r), ["S8"]);
  assert.match(r.findings.find((f) => f.id === "F-ENTRY-DATE")!.explanation, /gives 2017 for the last entry/);
});
test("XE01 (live candidate extraction): not the second time (S7, 2012) either", async () => {
  const r = await run(load("XE01"), F([
    en("S7", "The second time, in 2012, he stayed about a year in Phoenix", 2012),
    en("S8", "The subject stated that his most recent crossing was in the summer of 2017", 2017),
  ]));
  assert.deepEqual(dates(r), ["S8"]);
});
test("XE05 (live): 'his first trip north was in 2015' is not compared; the planted place conflict stays", async () => {
  const r = await run(load("XE05"), F([
    en("S5", "his first trip north was in 2015 through the desert near Nogales, Arizona", 2015, { manner: "without_inspection" }),
    en("S6", "On his last trip, in November 2021, he crossed on foot through a gap in the fence on the west side of El Paso, Texas", 2021, { manner: "without_inspection" }),
  ]));
  assert.deepEqual(dates(r), []);
  assert.ok(r.findings.some((f) => f.id === "F-ENTRY-PLACE"));
});
test("XN05 (live): 'first visited … in 2012' is not compared with the last admission (07/02/2019)", async () => {
  const r = await run(load("XN05"), F([
    en("S5", "he first visited the United States in 2012 as a tourist, was admitted at Miami International Airport", 2012, { manner: "admitted" }),
    en("S6", "He was last admitted at Detroit Metropolitan Airport on 07/02/2019 with a B2 visa", 2019, { manner: "admitted" }),
  ]));
  assert.deepEqual(dates(r), []);
  assert.ok(!r.findings.some((f) => f.category === "inconsistency"));
});

// ---- Controls (new wordings; single-person base: form 03/03/2019, near Roma, TX, EWI AFOOT) ----
const base = JSON.parse(readFileSync("eval/diag-1/cases/DN01.json", "utf8")) as CaseRecord;
const R = "[REDACTED (b)(6), (b)(7)(C)]";
const mk = (entry: string, people = false): CaseRecord => ({
  ...base, id: "SYN",
  narrative: { text: `ENCOUNTER:\nOn September 14, 2023, Border Patrol Agents encountered ${people ? `${R} and ${R}` : "the subject"} near Kalamazoo, Michigan. ${people ? "Both men" : "The subject"} stated that ${people ? "they are citizens" : "he is a citizen"} of Honduras without immigration documents.\nENTRY:\n${entry}\nDISPOSITION:\nThe subject was processed for a Notice to Appear.` },
});
const sid = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text).find((s) => s.text.includes(needle))!.id;

test("control: a second entry with no later entry stated may itself be the last; it is still compared", async () => {
  const c = mk("The subject stated that the first time he crossed was in 2010 near Nogales. The second time he crossed was in 2016, near Roma, Texas.");
  const r = await run(c, F([en(sid(c, "first time"), "the first time he crossed was in 2010", 2010), en(sid(c, "second time"), "The second time he crossed was in 2016", 2016)]));
  assert.deepEqual(dates(r), [sid(c, "second time")]);
});
test("control: an ordinal below a stated count with no other evidence of order is still earlier only for the same person", async () => {
  const c = mk("The subject stated that he has crossed the border two times. The first time was in 2016, near Roma, Texas.");
  const r = await run(c, F([en(sid(c, "first time"), "The first time was in 2016", 2016)]));
  assert.deepEqual(dates(r), [], "the first of two crossings is not the last");
});
test("control: a first-and-only crossing is the last entry and is compared", async () => {
  const c = mk("The subject stated that his first and only crossing was in 2016, near Roma, Texas.");
  const r = await run(c, F([en(sid(c, "first and only"), "his first and only crossing was in 2016", 2016)]));
  assert.deepEqual(dates(r), [sid(c, "first and only")]);
});
test("control: a genuine most-recent-crossing conflict is reported even after an earlier ordinal", async () => {
  const c = mk("The subject stated that the first time he came was in 2009. He said his most recent crossing was in 2016, near Roma, Texas.");
  const r = await run(c, F([en(sid(c, "first time"), "the first time he came was in 2009", 2009), en(sid(c, "most recent"), "his most recent crossing was in 2016", 2016)]));
  assert.deepEqual(dates(r), [sid(c, "most recent")]);
});
test("control: no conflict when the most recent crossing matches the form and earlier ordinals differ", async () => {
  const c = mk("The subject stated that the first time he crossed was in 2009. The second time he crossed was in 2013. His most recent crossing was on 03/03/2019, near Roma, Texas.");
  const r = await run(c, F([en(sid(c, "first time"), "the first time he crossed was in 2009", 2009), en(sid(c, "second time"), "The second time he crossed was in 2013", 2013), en(sid(c, "most recent"), "His most recent crossing was on 03/03/2019", 2019)]));
  assert.ok(!r.findings.some((f) => f.category === "inconsistency"));
});
test("control: an answer the narrative itself corrects stays a resolved discrepancy (unchanged rule)", async () => {
  const c = mk("When first asked, the subject said he crossed in 2016. He then corrected himself and explained that he crossed on 03/03/2019, near Roma, Texas.");
  const r = await run(c, F([en(sid(c, "When first asked"), "the subject said he crossed in 2016", 2016), en(sid(c, "corrected"), "he crossed on 03/03/2019", 2019)]));
  assert.deepEqual(dates(r), []);
});
test("control: several people: another person's 'most recent crossing' does not make an unattributed ordinal earlier; it stays routed", async () => {
  const c = mk(`${R} stated that the second time he crossed was in 2012. ${R} stated that his most recent crossing was in 2016.`, true);
  const a = sid(c, "second time"), b = sid(c, "most recent");
  const r = await run(c, F([en(a, "the second time he crossed was in 2012", 2012), en(b, "his most recent crossing was in 2016", 2016)]));
  assert.deepEqual(dates(r), []);
  const routed = (r.humanReview.accounts ?? []).flatMap((x) => x.sentenceIds);
  assert.ok(routed.includes(a) && routed.includes(b), "both unattributed statements are routed");
});
test("control: an ordinal not tied to an entry ('the second time he saw a doctor') does not make an entry earlier", async () => {
  const c = mk("The subject stated that he crossed near Roma, Texas, in 2016. The second time he saw a doctor was in 2017, the year his most recent crossing card expired.");
  const r = await run(c, F([en(sid(c, "crossed near Roma"), "he crossed near Roma, Texas, in 2016", 2016)]));
  assert.deepEqual(dates(r), [sid(c, "crossed near Roma")], "the 2016 entry is still compared with the form's 2019");
});
