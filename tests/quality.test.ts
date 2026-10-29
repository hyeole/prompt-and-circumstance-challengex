import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fieldQuality } from "../lib/fieldQuality";
import { runRules } from "../lib/review/rules";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

test("populated is not the same as known", () => {
  assert.equal(fieldQuality("Unknown Date, Unknown Time"), "unknown");
  assert.equal(fieldQuality("0 mile(s) of UNK"), "unknown");
  assert.equal(fieldQuality("mile(s) of UNK"), "unknown");
  assert.equal(fieldQuality("02/21/2012, Unknown Time"), "partly_unknown");
  assert.equal(fieldQuality("NEW DELHI, UNK, INDIA"), "partly_unknown");
  assert.equal(fieldQuality("See Narrative"), "see_narrative");
  assert.equal(fieldQuality("POSITIVE - See Narrative"), "known");
  assert.equal(fieldQuality("05/15/2014, 2200"), "known");
  assert.equal(fieldQuality("0 mile(s) of LAR"), "known");
  assert.equal(fieldQuality("EWI AFOOT"), "known");
});

test("an element covered only by an 'unknown' field is qualified, not plain present", () => {
  const c = JSON.parse(readFileSync("data/cases/C012-M2.json", "utf8")) as CaseRecord;
  const r = runRules(c, splitSentences(c.narrative.text));
  assert.equal(r.elementsFromFields.get("E1")?.qualifier, "recorded_unknown");
  assert.equal(r.elementsFromFields.get("E3")?.qualifier, undefined);
});
