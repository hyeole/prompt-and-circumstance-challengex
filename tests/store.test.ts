import { test } from "node:test";
import assert from "node:assert/strict";
import { sha } from "../lib/hash";
import { MemoryKv, setKvForTests } from "../lib/kv";

const kv = new MemoryKv();
setKvForTests(kv);
const store = await import("../lib/store");

const A = { vid: "visitorAAAAAAAAAAAAAAA", ip: "203.0.113.1" };
const B = { vid: "visitorBBBBBBBBBBBBBBB", ip: "203.0.113.2" };
const snap = (text: string) => ({ narrative: { text }, facts: [], selectedCharges: [{ citation: "INA 212(a)(6)(A)(i)", source: "officer-selected" as const }] });
const review = (text: string, id: string, status = "ok") => ({ reviewId: id, narrativeHash: sha(text), modelStatus: status, findings: [{ id: "M-E2" }], humanReview: { required: false } }) as never;

test("versions are appended and earlier versions are never changed", async () => {
  const v1 = await store.appendVersion(A, "T001", snap("First text."), review("First text.", "R-1"));
  const v2 = await store.appendVersion(A, "T001", snap("Second text."), review("Second text.", "R-2", "failed"));
  assert.deepEqual([v1, v2], [1, 2]);
  const h = await store.getHistory(A.vid, "T001");
  assert.equal(h.versions[0].snapshot.narrative.text, "First text.");
  assert.equal(h.versions[0].version, 1);
  assert.equal(h.versions[1].completion, "partial");
});

test("a review that does not match the snapshot is rejected", async () => {
  await assert.rejects(store.appendVersion(A, "T001", snap("Edited text."), review("Other text.", "R-3")), /does not match/);
});

test("decisions are stored apart from the model output and need a known finding", async () => {
  await store.setDecision(A, "T001", "R-1", "M-E2", { state: "dismissed", note: "Place is in the attached form" });
  const h = await store.getHistory(A.vid, "T001");
  assert.equal(h.decisions["R-1"]["M-E2"].state, "dismissed");
  assert.equal(h.versions[0].review.findings.length, 1, "the finding itself is kept");
  await assert.rejects(store.setDecision(A, "T001", "R-1", "NOPE", { state: "acknowledged" }), /Unknown finding/);
  await assert.rejects(store.setDecision(A, "T001", "R-404", "M-E2", { state: "acknowledged" }), /Unknown review/);
});

test("ids are validated and only real PDFs within 3 MB are stored", async () => {
  await assert.rejects(store.getHistory(A.vid, "../etc"), /Invalid case id/);
  await assert.rejects(store.savePdf(A, "T001", Buffer.from("not a pdf")), /not a PDF/);
  await assert.rejects(store.savePdf(A, "T001", Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(3 * 1024 * 1024)])), /larger than 3 MB/);
  await store.savePdf(A, "T001", Buffer.from("%PDF-1.4 test"));
  assert.equal((await store.getPdf(A.vid, "T001"))!.toString("latin1").slice(0, 5), "%PDF-");
});

test("one visitor cannot see another visitor's cases, versions, decisions or PDFs", async () => {
  const c = { id: "U-aaaaaaaaaaaa", title: "Entered", kind: "user-case", narrative: { text: "x" }, facts: [], selectedCharges: [], provenance: {} } as never;
  await store.saveUserCase(A, c);
  assert.equal((await store.listUserCases(A.vid)).length, 1);
  assert.equal((await store.listUserCases(B.vid)).length, 0);
  assert.equal(await store.getUserCase(B.vid, "U-aaaaaaaaaaaa"), null);
  assert.equal((await store.getHistory(B.vid, "T001")).versions.length, 0);
  assert.equal(await store.getPdf(B.vid, "T001"), null);
  await assert.rejects(store.setDecision(B, "T001", "R-1", "M-E2", { state: "acknowledged" }), /Unknown review/);
});

test("case ids are random, and every write renews the visitor's 30-day expiry", async () => {
  assert.notEqual(store.newUserCaseId(), store.newUserCaseId());
  assert.match(store.newUserCaseId(), store.ID_RE);
  const ttl = Number(kv.call("TTL", `v:${A.vid}`));
  assert.ok(ttl > 30 * 86_400 - 5 && ttl <= 30 * 86_400, `TTL ${ttl}`);
});

test("the case list summary needs no version download and counts open decisions", async () => {
  const s = (await store.caseSummaries(A.vid, ["T001", "C999"])).get("T001")!;
  assert.equal(s.versions, 2);
  assert.equal(s.completion, "partial");
  assert.equal(s.openDecisions, 1, "R-2 is the latest review; its finding has no decision");
  assert.equal((await store.caseSummaries(A.vid, ["C999"])).get("C999")!.versions, 0);
});

test("the local single-user tool keeps its data in one file across restarts", async () => {
  const { FileKv } = await import("../lib/kv");
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const file = (await import("node:path")).join(mkdtempSync((await import("node:path")).join(tmpdir(), "nc-kv-")), "kv.json");
  const first = new FileKv(file);
  await first.exec(["HSET", "v:local", "case:U-1", "{}"]);
  await first.exec(["EXPIRE", "v:local", 60]);
  const second = new FileKv(file); // a restart
  assert.equal(await second.exec(["HGET", "v:local", "case:U-1"]), "{}");
  assert.ok(Number(await second.exec(["TTL", "v:local"])) > 0, "expiry survives the restart");
});
