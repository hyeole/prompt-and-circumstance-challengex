import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import type { CaseRecord } from "../lib/types";

const cases = readdirSync("eval/cases").map((f) => JSON.parse(readFileSync(`eval/cases/${f}`, "utf8")) as CaseRecord & Record<string, unknown>);

test("runtime eval inputs contain no expected answers", () => {
  for (const c of cases) {
    const raw = JSON.stringify(c);
    assert.ok(!("plants" in c), c.id);
    assert.ok(!/"plants"|anchors|expected/i.test(raw), c.id);
  }
});

test("page spans stay inside the narrative and in order after edits", () => {
  for (const c of cases) {
    const spans = c.narrative.pageSpans ?? [];
    for (const [i, s] of spans.entries()) {
      assert.ok(s.start >= 0 && s.end <= c.narrative.text.length && s.start <= s.end, `${c.id} span ${i}`);
      if (i) assert.ok(s.start >= spans[i - 1].end, `${c.id} span order ${i}`);
    }
  }
});

test("variants never share a split with a different split of their base", () => {
  const byBase = new Map<string, Set<string>>();
  for (const c of cases) {
    const b = (c.baseCaseId as string) ?? c.id;
    byBase.set(b, (byBase.get(b) ?? new Set()).add(c.split as string));
  }
  for (const [b, s] of byBase) assert.equal(s.size, 1, b);
});

test("fresh and dev-synthetic runtime inputs contain no expected answers; variants stay with their base", () => {
  for (const dir of ["eval/fresh/cases", "eval/dev-synthetic/cases"]) {
    for (const f of readdirSync(dir)) {
      const raw = readFileSync(`${dir}/${f}`, "utf8");
      assert.ok(!/"plants"|"anchors"|"shouldNotFlag"|"elementExpectations"|"labelNotes"/.test(raw), `${dir}/${f}`);
    }
  }
  const fresh = readdirSync("eval/fresh/cases").map((f) => JSON.parse(readFileSync(`eval/fresh/cases/${f}`, "utf8")));
  const legacyAndDev = new Set([...readdirSync("eval/cases"), ...readdirSync("eval/dev-synthetic/cases")].map((f) => f.replace(".json", "").split("-")[0]));
  for (const c of fresh) assert.ok(!legacyAndDev.has((c.baseCaseId ?? c.id).replace(/^F/, "C")) || !(c.baseCaseId ?? c.id).startsWith("F"), `fresh base ${c.id} reuses a legacy incident`);
});
