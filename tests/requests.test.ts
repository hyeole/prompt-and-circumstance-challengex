// Audit item 7: cancellation is decided on the server, so a cancelled review is never saved and a late cancel is told the truth.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cancelRequest, saveUnlessCancelled, startRequest, finishRequest } from "../lib/reviewRequests";

test("a request cancelled before it finishes is never saved, and its model calls are aborted", () => {
  const signal = startRequest("req-cancel-1");
  assert.deepEqual(cancelRequest("req-cancel-1"), { status: "cancelled", version: undefined });
  assert.ok(signal.aborted);
  let saved = false;
  assert.equal(saveUnlessCancelled("req-cancel-1", () => { saved = true; return 3; }), null);
  assert.equal(saved, false);
});

test("a cancel that arrives after the save reports the saved version instead of claiming nothing was saved", () => {
  startRequest("req-late-cancel");
  assert.equal(saveUnlessCancelled("req-late-cancel", () => 4), 4);
  assert.deepEqual(cancelRequest("req-late-cancel"), { status: "saved", version: 4 });
});

test("an unknown or finished request is reported as such", () => {
  assert.equal(cancelRequest("req-never-started").status, "unknown");
  startRequest("req-eval-run");
  finishRequest("req-eval-run");
  assert.equal(cancelRequest("req-eval-run").status, "finished");
});
