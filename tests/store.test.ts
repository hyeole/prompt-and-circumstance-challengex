import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { sha } from "../lib/text";

process.env.NC_STORE_DIR = mkdtempSync(path.join(tmpdir(), "nc-store-"));
const store = await import("../lib/store");

const snap = (text: string) => ({ narrative: { text }, facts: [], selectedCharges: [{ citation: "INA 212(a)(6)(A)(i)", source: "officer-selected" as const }] });
const review = (text: string, id: string, status = "ok") => ({ reviewId: id, narrativeHash: sha(text), modelStatus: status, findings: [{ id: "M-E2" }], humanReview: { required: false } }) as never;

test("versions are appended and earlier versions are never changed", () => {
  const v1 = store.appendVersion("T001", snap("First text."), review("First text.", "R-1"));
  const v2 = store.appendVersion("T001", snap("Second text."), review("Second text.", "R-2", "failed"));
  assert.deepEqual([v1, v2], [1, 2]);
  const h = store.getHistory("T001");
  assert.equal(h.versions[0].snapshot.narrative.text, "First text.");
  assert.equal(h.versions[1].completion, "partial");
});

test("a review that does not match the snapshot is rejected", () => {
  assert.throws(() => store.appendVersion("T001", snap("Edited text."), review("Other text.", "R-3")), /does not match/);
});

test("decisions are stored apart from the model output and need a known finding", () => {
  store.setDecision("T001", "R-1", "M-E2", { state: "dismissed", note: "Place is in the attached form" });
  const h = store.getHistory("T001");
  assert.equal(h.decisions["R-1"]["M-E2"].state, "dismissed");
  assert.equal(h.versions[0].review.findings.length, 1, "the finding itself is kept");
  assert.throws(() => store.setDecision("T001", "R-1", "NOPE", { state: "acknowledged" }), /Unknown finding/);
});

test("ids are validated and only real PDFs are stored", () => {
  assert.throws(() => store.getHistory("../etc"), /Invalid case id/);
  assert.throws(() => store.savePdf("T001", Buffer.from("not a pdf")), /not a PDF/);
  const f = store.savePdf("T001", Buffer.from("%PDF-1.4 test"));
  assert.equal(readFileSync(f, "latin1").slice(0, 5), "%PDF-");
});
