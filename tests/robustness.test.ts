// Robustness corrections (branch improve/robustness-1, from 5ab93f1). Offline: fake model. POST-OBSERVATION: the XE02
// reproductions restate the event-type contradiction seen in the rejected ex-1 candidate (ex-1 team-authored case);
// the scope reproduction restates the bottleneck fixture SC-modelclaim. Controls are new wordings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT, type FactsOutput } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

type E = FactsOutput["entry_statements"][number];
const ALL = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8"];
const run = (c: CaseRecord, facts: FactsOutput, issues: object[] = []) => {
  const out = JSON.stringify({ elements: ALL.map((id) => ({ element_id: id, status: "present", sentence_ids: [], note: "" })), issues, citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
  const fake: Complete = async (system) => ({ text: system === FACTS_SYSTEM_PROMPT ? JSON.stringify(facts) : out, attempts: 1 });
  return reviewCase(c, fake);
};
const sid = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text, c.narrative.pageSpans).find((s) => s.text.includes(needle))!.id;
const txt = (c: CaseRecord, needle: string) => splitSentences(c.narrative.text, c.narrative.pageSpans).find((s) => s.text.includes(needle))!.text;
const en = (c: CaseRecord, needle: string, year: number | null, o: Partial<E> = {}): E => ({ sentence_id: sid(c, needle), quote: txt(c, needle), event: "us_entry", country: "United States", year, manner: "unknown", person: "unclear", uncertainty: "stated", ...o });
const F = (entry_statements: E[]): FactsOutput => ({ entry_statements, removal_statements: [], status_statements: [] });
const claim = (c: CaseRecord, needles: string[], field = "entry.date", title = "Entry date conflict") =>
  ({ type: "inconsistency", title, explanation: "The narrative's entry differs from the form.", evidence: [{ field_path: field }, ...needles.map((n) => ({ sentence_id: sid(c, n), quote: n }))], needs_human_review: true, reason: title });
const dateFindings = (r: Awaited<ReturnType<typeof run>>) => r.findings.filter((f) => f.id === "F-ENTRY-DATE").map((f) => f.evidence.find((e) => e.sentenceId)?.sentenceId);
const modelKept = (r: Awaited<ReturnType<typeof run>>) => r.findings.filter((f) => f.source === "model" && f.category === "inconsistency");
const anotherCountry = (r: Awaited<ReturnType<typeof run>>) => r.discarded.some((d) => /another country/.test(d.reason));
const earlierWithheld = (r: Awaited<ReturnType<typeof run>>) => r.discarded.some((d) => /earlier \(first or previous\) entry/.test(d.reason));

const XE02 = JSON.parse(readFileSync("eval/ex-1/cases/XE02.json", "utf8")) as CaseRecord; // designated rear passenger: March 2020; form 03/2022
const base = JSON.parse(readFileSync("eval/diag-1/cases/DN01.json", "utf8")) as CaseRecord; // form 03/03/2019, near Roma, TX, EWI AFOOT
const R = "[REDACTED (b)(6), (b)(7)(C)]";
const mk = (entry: string, people = false): CaseRecord => ({ ...base, id: "SYN",
  narrative: { text: `ENCOUNTER:\nOn September 14, 2023, Border Patrol Agents encountered ${people ? `${R} and ${R}` : "the subject"} near Kalamazoo, Michigan. ${people ? "Both men" : "The subject"} stated that ${people ? "they are citizens" : "he is a citizen"} of Honduras without immigration documents.\nENTRY:\n${entry}\nDISPOSITION:\nThe subject was processed for a Notice to Appear.` } });

// ---- 1. Event type against the source ----
test("type: a U.S. crossing typed as another-country entry no longer hides the source's reading (XE02, designated subject)", async () => {
  const r = await run(XE02, F([en(XE02, "waded across", 2020, { event: "other_country_entry", manner: "without_inspection" })]));
  assert.deepEqual(dateFindings(r), [sid(XE02, "waded across")]);
});
test("type: the review model's correct claim on that sentence is not withheld as 'another country'", async () => {
  const r = await run(XE02, F([en(XE02, "waded across", 2020, { event: "other_country_entry" })]), [claim(XE02, ["waded across the Rio Grande near Roma, Texas, in March 2020"])]);
  assert.ok(!anotherCountry(r));
});
test("type control: domestic travel with country 'United States' is not turned into an entry", async () => {
  const c = mk("The subject stated that he waded across the river near Roma, Texas, on 03/03/2019. In 2021 he traveled by bus from Houston to Kalamazoo to work in the United States.");
  const r = await run(c, F([en(c, "waded across", 2019, { manner: "without_inspection" }), en(c, "traveled by bus", 2021, { event: "travel" })]));
  assert.ok(!r.findings.some((f) => f.category === "inconsistency"));
});
test("type control: an entry into another country stays out of the U.S. comparison, and a claim on it is withheld", async () => {
  const c = mk("The subject stated that he crossed into Mexico from Guatemala at Tecun Uman in 2017. He waded across the river near Roma, Texas, on 03/03/2019.");
  const r = await run(c, F([en(c, "Tecun Uman", 2017, { event: "other_country_entry", country: "Mexico" }), en(c, "waded across", 2019)]), [claim(c, ["he crossed into Mexico from Guatemala at Tecun Uman in 2017"])]);
  assert.deepEqual(dateFindings(r), []);
  assert.ok(anotherCountry(r) && !modelKept(r).length);
});
test("type control: an entry into Mexico mislabelled with country 'United States' is still not a U.S. entry", async () => {
  const c = mk("The subject stated that he crossed into Mexico from Guatemala at Tecun Uman in 2017. He waded across the river near Roma, Texas, on 03/03/2019.");
  const r = await run(c, F([en(c, "Tecun Uman", 2017, { event: "other_country_entry", country: "United States" }), en(c, "waded across", 2019)]));
  assert.deepEqual(dateFindings(r), []);
});
test("type control: unclear identity: a recovered U.S. entry of an unidentified person is routed, never a contradiction", async () => {
  const c = mk(`${R} stated that he waded across the Rio Grande into the United States near Roma, Texas, in 2016.`, true);
  const r = await run(c, F([en(c, "waded across", 2016, { event: "other_country_entry" })]));
  assert.deepEqual(dateFindings(r), []);
  assert.ok((r.humanReview.accounts ?? []).some((a) => a.sentenceIds.includes(sid(c, "waded across"))));
});

// ---- 2. Sequence scope in model-claim verification ----
const SEQ = (second: string, recent: string) => mk(`The subject said he has crossed the border three times. ${second} ${recent}`);
test("scope: a model claim on 'the second time' (an earlier entry in a stated sequence) is withheld", async () => {
  const c = SEQ("The second time, in 2012, he came in near Nogales, Arizona.", "His most recent crossing was on 03/03/2019 when he waded across the river near Roma, Texas.");
  const facts = F([en(c, "second time", 2012), en(c, "most recent", 2019, { manner: "without_inspection" })]);
  const r = await run(c, facts, [claim(c, ["The second time, in 2012, he came in near Nogales, Arizona"])]);
  assert.ok(earlierWithheld(r) && !modelKept(r).length);
});
test("scope control: a genuine last-entry conflict in a model claim is kept", async () => {
  const c = SEQ("The second time, in 2012, he came in near Nogales, Arizona.", "His most recent crossing was in 2016 when he waded across the river near Roma, Texas.");
  const facts = F([en(c, "second time", 2012), en(c, "most recent", 2016)]);
  const r = await run(c, facts, [claim(c, ["His most recent crossing was in 2016"])]);
  assert.ok(modelKept(r).length === 1 && !earlierWithheld(r));
});
test("scope control: a mixed claim keeps its supported last-entry part and drops the earlier sentence", async () => {
  const c = SEQ("The second time, in 2012, he came in near Nogales, Arizona.", "His most recent crossing was in 2016 when he waded across the river near Roma, Texas.");
  const facts = F([en(c, "second time", 2012), en(c, "most recent", 2016)]);
  const r = await run(c, facts, [claim(c, ["The second time, in 2012, he came in near Nogales, Arizona", "His most recent crossing was in 2016"])]);
  const kept = modelKept(r);
  assert.equal(kept.length, 1);
  assert.ok(kept[0].evidence.every((e) => e.sentenceId !== sid(c, "second time")), "the earlier sentence is not cited");
  assert.ok(r.discarded.some((d) => /^Part withheld/.test(d.reason)));
});
test("scope control: a 'second time' with no later entry may be the last; a claim on it is not withheld for scope", async () => {
  const c = mk("The subject stated that the first time he crossed was in 2010. The second time he crossed was in 2016, near Roma, Texas.");
  const facts = F([en(c, "first time", 2010), en(c, "second time", 2016)]);
  const r = await run(c, facts, [claim(c, ["The second time he crossed was in 2016"])]);
  assert.ok(!earlierWithheld(r) && modelKept(r).length === 1);
});
test("scope control: several people: an unattributed ordinal is not reordered by another person's 'most recent' crossing", async () => {
  const c = mk(`${R} stated that the second time he crossed was in 2012. ${R} stated that his most recent crossing was in 2016.`, true);
  const facts = F([en(c, "second time", 2012), en(c, "most recent", 2016)]);
  const r = await run(c, facts, [claim(c, ["the second time he crossed was in 2012"])]);
  assert.ok(!earlierWithheld(r), "not withheld on scope grounds (other person safeguards may still apply)");
});
