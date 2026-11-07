// Regression tests for the issues reproduced by the independent review of hosting-free-1 at 5474b34. Each test fails on
// 5474b34 and passes after the fix. They run on the in-process twin, and also on a real Redis-compatible server when
// NC_TEST_REDIS_REST_URL / NC_TEST_REDIS_REST_TOKEN point at the Upstash-REST shim in front of Valkey.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { sha } from "../lib/hash";
import { MemoryKv, UpstashKv, setKvForTests, type Kv } from "../lib/kv";

process.env.NC_PUBLIC_DEMO = "1";
const { admitReview, LimitError } = await import("../lib/usage");
const usage = (await import("../lib/usage")) as Record<string, unknown>;
const store = await import("../lib/store");
const requests = await import("../lib/reviewRequests");

const backends: [string, () => Kv][] = [["in-process twin", () => new MemoryKv()]];
if (process.env.NC_TEST_REDIS_REST_URL) backends.push(["Valkey via Upstash-REST shim", () => new UpstashKv(process.env.NC_TEST_REDIS_REST_URL!, process.env.NC_TEST_REDIS_REST_TOKEN ?? "")]);

const setEnv = (e: Record<string, string>) => { for (const [k, v] of Object.entries(e)) process.env[k] = v; };
const generous = { NC_MAX_INFLIGHT: "3", NC_CAP_PER_DAY: "1000", NC_CAP_TOTAL: "1000", NC_RL_IP_PER_DAY: "1000", NC_RL_JUDGE_PER_HOUR: "1000",
  NC_W_VERSIONS_PER_VISITOR: "1000", NC_W_VERSIONS_PER_IP_DAY: "1000", NC_W_VERSIONS_PER_DAY: "1000", NC_W_VERSIONS_TOTAL: "1000",
  NC_W_BYTES_PER_VISITOR: String(12 * 1024 * 1024), NC_W_BYTES_TOTAL: String(160 * 1024 * 1024) };
const review = (text: string, id: string) => ({ reviewId: id, narrativeHash: sha(text), modelStatus: "ok", findings: [{ id: "F-1" }], humanReview: { required: false } }) as never;
const snap = (text: string, pad = "") => ({ narrative: { text, ...(pad ? { pad } : {}) }, facts: [], selectedCharges: [] }) as never;
const day = () => new Date().toISOString().slice(0, 10);
const num = async (kv: Kv, k: string) => Number((await kv.exec(["GET", k])) ?? 0);

for (const [name, make] of backends) {
  const fresh = async () => {
    const kv = make();
    setKvForTests(kv);
    if (kv.kind === "upstash") await kv.exec(["FLUSHDB"]);
    setEnv(generous);
    return kv;
  };

  // Issue 1: one visitor reusing one request id.
  test(`[${name}] issue 1: a request id can be claimed for only one execution (running or completed)`, async () => {
    await fresh();
    await requests.registerRequest("v1", "req-dup-claim-1");
    await assert.rejects(requests.registerRequest("v1", "req-dup-claim-1"), /already in use/, "same visitor, same id, while running");
    await store.appendVersion({ vid: "v1", ip: "i" }, "C001", snap("A."), review("A.", "R-a"), { requestId: "req-dup-claim-1" });
    await assert.rejects(requests.registerRequest("v1", "req-dup-claim-1"), /already in use/, "same id after it completed");
  });

  test(`[${name}] issue 1: a second lease for the same request is refused, so the in-flight cap holds`, async () => {
    const kv = await fresh();
    const p = { vid: "v1", ip: "i", judgeSid: "s", requestId: "req-dup-lease-1" };
    const first = await admitReview(p);
    await assert.rejects(admitReview(p), (e: unknown) => e instanceof LimitError && e.code === "duplicate");
    assert.equal(Number(await kv.exec(["ZCARD", "cap:review:leases"])), 1);
    await (first as unknown as { release: () => Promise<void> }).release();
    assert.equal(Number(await kv.exec(["ZCARD", "cap:review:leases"])), 0);
  });

  test(`[${name}] issue 1: a request id saves at most once, and a late cancel is told the truth`, async () => {
    await fresh();
    const who = { vid: "v1", ip: "i" };
    await requests.registerRequest("v1", "req-dup-save-1");
    const v = await store.appendVersion(who, "C001", snap("A."), review("A.", "R-a"), { requestId: "req-dup-save-1" });
    await assert.rejects(store.appendVersion(who, "C001", snap("B."), review("B.", "R-b"), { requestId: "req-dup-save-1" }), /already saved/);
    assert.equal((await store.getHistory("v1", "C001")).versions.length, 1);
    assert.deepEqual(await requests.cancelShared("v1", "req-dup-save-1"), { status: "saved", version: v });
  });

  test(`[${name}] issue 1: early cancellation still wins (cancel before the request claims its id)`, async () => {
    await fresh();
    assert.equal((await requests.cancelShared("v1", "req-early-1")).status, "cancelled");
    assert.equal(await requests.registerRequest("v1", "req-early-1"), "cancelled");
    assert.equal(await store.appendVersion({ vid: "v1", ip: "i" }, "C001", snap("A."), review("A.", "R-a"), { requestId: "req-early-1" }), null);
    await assert.rejects(requests.registerRequest("v2", "req-early-1"), /already in use/, "another visitor cannot take it over");
    assert.equal((await requests.cancelShared("v2", "req-early-1")).status, "unknown");
  });

  // Issue 2: saved versions larger than the reservation.
  test(`[${name}] issue 2: bytes beyond the reservation are checked atomically; the visitor byte limit is never exceeded`, async () => {
    const kv = await fresh();
    setEnv({ NC_W_BYTES_PER_VISITOR: "300000" });
    const who = { vid: "big", ip: "i" };
    const pad = "x".repeat(250_000);
    await requests.registerRequest("big", "req-big-1");
    // Reserved 1,000 bytes at admission; the version is ~250 KB. (The `reserved` flag is how 5474b34 marked it.)
    const opts = { requestId: "req-big-1", reservedBytes: 1000, reserved: true } as never;
    await kv.exec(["SET", "q:vb:big", "100000"]);
    await assert.rejects(store.appendVersion(who, "C001", snap("A.", pad), review("A.", "R-a"), opts), (e: unknown) => e instanceof LimitError && e.code === "storage_full");
    assert.equal(await num(kv, "q:vb:big"), 100000, "nothing was added");
    assert.equal((await store.getHistory("big", "C001")).versions.length, 0, "nothing was saved");
  });

  test(`[${name}] issue 2: the global byte limit is checked the same way`, async () => {
    const kv = await fresh();
    setEnv({ NC_W_BYTES_TOTAL: "200000" });
    await kv.exec(["SET", "q:g:bytes:total", "190000"]);
    await requests.registerRequest("g", "req-big-2");
    const opts = { requestId: "req-big-2", reservedBytes: 1000, reserved: true } as never;
    await assert.rejects(store.appendVersion({ vid: "g", ip: "i" }, "C001", snap("A.", "y".repeat(50_000)), review("A.", "R-a"), opts), (e: unknown) => e instanceof LimitError);
    assert.equal(await num(kv, "q:g:bytes:total"), 190000);
  });

  // Issue 3: refused reviews consuming quota.
  test(`[${name}] issue 3: review and save capacity are admitted together; a refused review consumes neither`, async () => {
    const kv = await fresh();
    setEnv({ NC_RL_JUDGE_PER_HOUR: "1" });
    const go = (rid: string, sid = "s1") => admitReview({ vid: "v1", ip: "i", judgeSid: sid, requestId: rid, saveBytes: 1000 } as never);
    await go("req-q-1");
    await assert.rejects(go("req-q-2"), (e: unknown) => e instanceof LimitError && e.code === "judge_hour_limit");
    await assert.rejects(go("req-q-3"), LimitError);
    assert.equal(await num(kv, `q:g:version:${day()}`), 1, "only the admitted review holds save capacity");
    assert.equal(await num(kv, "q:g:bytes:total"), 1000);
    assert.equal(await num(kv, "cap:review:total"), 1);
    // A save-capacity refusal consumes no review allowance either.
    setEnv({ NC_RL_JUDGE_PER_HOUR: "1000", NC_W_VERSIONS_PER_DAY: "1" });
    await assert.rejects(go("req-q-4", "s2"), (e: unknown) => e instanceof LimitError && e.code === "day_limit");
    assert.equal(await num(kv, "cap:review:total"), 1, "no review allowance used");
    assert.equal(Number(await kv.exec(["ZCARD", "cap:review:leases"])), 1, "no lease taken");
  });

  test(`[${name}] issue 3: save capacity reserved for a review that saved nothing is returned`, async () => {
    const kv = await fresh();
    const a = (await admitReview({ vid: "v1", ip: "i", judgeSid: "s", requestId: "req-refund-1", saveBytes: 5000 } as never)) as unknown as { refundSave: () => Promise<void>; release: () => Promise<void> };
    assert.equal(await num(kv, "q:g:bytes:total"), 5000);
    await a.refundSave();
    await a.refundSave(); // idempotent
    await a.release();
    assert.equal(await num(kv, "q:g:bytes:total"), 0);
    assert.equal(await num(kv, `q:g:version:${day()}`), 0);
    assert.equal(await num(kv, "q:vb:v1"), 0);
  });

  test(`[${name}] cancellation is rate-limited per IP and per visitor, without a judge session`, async () => {
    await fresh();
    const countCancel = usage.countCancel as (vid: string, ip: string) => Promise<void>;
    for (let i = 0; i < 30; i++) await countCancel("v1", "203.0.113.5");
    await assert.rejects(countCancel("v1", "203.0.113.5"), (e: unknown) => e instanceof LimitError && e.code === "cancel_limit");
    await assert.rejects(countCancel("v-new-cookie", "203.0.113.5"), LimitError, "a new cookie does not reset the per-IP limit");
  });
}

// Issue 2: only supported fields are taken from the client, and the body is bounded before parsing.
test("issue 2: only supported editable fields are kept; unknown properties are dropped", async () => {
  const { EditableCase } = await import("../lib/reviewInput");
  const parsed = EditableCase.parse({ narrative: { text: "A.", pad: "x".repeat(10) }, facts: [{ path: "p", label: "l", value: "v", status: "present", junk: 1 }], selectedCharges: [{ citation: "INA", source: "officer-selected", extra: true }], title: "ignored" });
  assert.deepEqual(parsed, { narrative: { text: "A." }, facts: [{ path: "p", label: "l", value: "v", status: "present" }], selectedCharges: [{ citation: "INA", source: "officer-selected" }] });
});

test("issue 2: every sample and benchmark case passes the strict schema unchanged (the engine input is the same)", async () => {
  const { EditableCase } = await import("../lib/reviewInput");
  let n = 0;
  for (const dir of ["data/cases", "eval/cases", "eval/fresh/cases", "eval/dev-synthetic/cases"]) {
    let files: string[] = [];
    try { files = readdirSync(dir).filter((f) => f.endsWith(".json")); } catch { continue; }
    for (const f of files) {
      const c = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
      const e = { narrative: c.narrative, facts: c.facts, selectedCharges: c.selectedCharges };
      assert.deepEqual(EditableCase.parse(e), e, `${dir}/${f}`);
      n++;
    }
  }
  assert.ok(n >= 13, `checked ${n} cases`);
});

test("issue 2: the request body is bounded before parsing", async () => {
  const { readBodyLimited, MAX_REVIEW_BODY_BYTES } = await import("../lib/reviewInput");
  const small = new Request("http://x/", { method: "POST", body: "{}" });
  assert.equal(await readBodyLimited(small), "{}");
  const declared = new Request("http://x/", { method: "POST", body: "x", headers: { "content-length": String(MAX_REVIEW_BODY_BYTES + 1) } });
  await assert.rejects(readBodyLimited(declared), (e: unknown) => (e as Error).name === "BodyTooLarge");
  const streamed = new Request("http://x/", { method: "POST", body: new ReadableStream({ start(c) { for (let i = 0; i < 30; i++) c.enqueue(new Uint8Array(10_000)); c.close(); } }), duplex: "half" } as RequestInit);
  await assert.rejects(readBodyLimited(streamed), (e: unknown) => (e as Error).name === "BodyTooLarge");
});

test("published example values are refused as the visitor secret and the judge code", async () => {
  const visitor = await import("../lib/visitor");
  const judge = await import("../lib/judge");
  const env = { secret: process.env.NC_VISITOR_SECRET, code: process.env.NC_JUDGE_CODE };
  process.env.NC_VISITOR_SECRET = "replace-with-32-plus-random-characters";
  process.env.NC_JUDGE_CODE = "replace-with-16-plus-character-code";
  assert.equal(visitor.visitorSecret(), null);
  assert.equal(judge.judgeCode(), null);
  process.env.NC_VISITOR_SECRET = "a-genuinely-random-value-9f3c1b7e2d4a6c8e0f";
  process.env.NC_JUDGE_CODE = "judges-only-7k2m9q4w";
  assert.ok(visitor.visitorSecret());
  assert.ok(judge.judgeCode());
  const isKnown = (visitor as Record<string, unknown>).isKnownExampleValue as (v: string, e: NodeJS.ProcessEnv) => boolean;
  assert.equal(isKnown("local-judge-000000000000", { VERCEL: "1" } as unknown as NodeJS.ProcessEnv), true, "offline test values are refused on Vercel");
  for (const [k, v] of [["NC_VISITOR_SECRET", env.secret], ["NC_JUDGE_CODE", env.code]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
});
