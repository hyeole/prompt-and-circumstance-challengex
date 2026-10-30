import { test } from "node:test";
import assert from "node:assert/strict";
import { unsupportedValues } from "../lib/review/support";

test("bug: '0412 am' cited as evidence for the date 4/12/2017 is not support", () => {
  const missing = unsupportedValues("Narrative reports encounter on 4/12/2017 while form field lists 4/16/2017.", [
    "At 0412 am, Sector Dispatch requested a Supervisory Border Patrol Agent contact Customs.", "04/16/2017 0730",
  ]);
  assert.deepEqual(missing, ["4/12/2017"]);
});

test("dates written differently still match", () => {
  assert.deepEqual(unsupportedValues("The narrative says April 8, 2017 but the form says 04/08/2017.", ["On April 8, 2017, at approximately 2000 hours", "04/08/2017 2040"]), []);
  assert.deepEqual(unsupportedValues("Form lists 09:50; narrative says 10:30.", ["03/27/2017 0950", "At approximately 1030 hours, X was placed under arrest"]), []);
});

test("a year must appear somewhere in the evidence", () => {
  assert.deepEqual(unsupportedValues("The narrative gives 2013 for the entry.", ["entered in August 2013 by flying"]), []);
  assert.deepEqual(unsupportedValues("The narrative gives 2019 for the entry.", ["entered in August 2013 by flying"]), ["2019"]);
});
