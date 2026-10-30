import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applies, caseContext, detect } from "../lib/review/checklist";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const load = (id: string) => JSON.parse(readFileSync(`eval/cases/${id}.json`, "utf8")) as CaseRecord;
const ss = (c: CaseRecord) => splitSentences(c.narrative.text, c.narrative.pageSpans);
const item = (id: string, appliesIn = ["all"]) => ({ id, label: id, fieldPaths: [], appliesIn });

test("legacy Border Patrol cases are interior encounters; a historical expedited removal is not current processing (C013)", () => {
  const c = load("C013");
  const ctx = caseContext(c, ss(c));
  assert.deepEqual(ctx.contexts, ["interior"]);
  assert.equal(ctx.source, "inferred");
});

test("port-of-entry items are not applicable to an interior case, and unclear when the context is unknown", () => {
  assert.equal(applies(item("N3", ["port_of_entry"]), { contexts: ["interior"] }), false);
  assert.equal(applies(item("N3", ["port_of_entry"]), { contexts: [] }), "unclear");
  assert.equal(applies(item("E5", ["all"]), { contexts: [] }), true);
  const poe = { ...load("C001"), narrative: { text: "The traveler applied for admission at the Detroit port of entry and was referred to secondary inspection." }, facts: [] } as CaseRecord;
  assert.deepEqual(caseContext(poe, splitSentences(poe.narrative.text)).contexts, ["port_of_entry"]);
});

test("specific ground: stated and explained (C012), or absent (C001)", () => {
  const c12 = load("C012");
  assert.equal(detect(item("N5"), c12, ss(c12))?.status, "present");
  const c1 = load("C001");
  assert.equal(detect(item("N5"), c1, ss(c1))?.status, "absent");
});

test("a bare credibility assertion is not a stated ground", () => {
  const c = { ...load("C001"), narrative: { text: "The officer found the traveler not credible and not a bona fide visitor." } } as CaseRecord;
  assert.equal(detect(item("N5"), c, splitSentences(c.narrative.text))?.status, "unclear");
});

test("disposition and identifying documents are detected from narrative wording", () => {
  const c12 = load("C012");
  assert.equal(detect(item("N7"), c12, ss(c12))?.status, "present");
  const c1 = load("C001");
  assert.equal(detect(item("N1"), c1, ss(c1))?.status, "present", "C001 mentions identification cards and a driver's license");
});
