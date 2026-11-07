// hosting-free-1: the atomic scripts behave the same in the in-process twin (always) and on a real Redis-compatible
// server (when NC_TEST_REDIS_REST_URL / NC_TEST_REDIS_REST_TOKEN point at the Upstash-REST shim in front of Valkey).
// Includes concurrency: parallel requests cannot exceed a cap, and parallel saves never lose or reuse a version.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sha } from "../lib/hash";
import { MemoryKv, UpstashKv, setKvForTests, type Kv } from "../lib/kv";

process.env.NC_PUBLIC_DEMO = "1";
const { admitReview, admitWrite, LimitError } = await import("../lib/usage");
const store = await import("../lib/store");
const requests = await import("../lib/reviewRequests");

const backends: [string, () => Kv][] = [["in-process twin", () => new MemoryKv()]];
if (process.env.NC_TEST_REDIS_REST_URL) backends.push(["Valkey via Upstash-REST shim", () => new UpstashKv(process.env.NC_TEST_REDIS_REST_URL!, process.env.NC_TEST_REDIS_REST_TOKEN ?? "")]);

const setEnv = (e: Record<string, string>) => { for (const [k, v] of Object.entries(e)) process.env[k] = v; };
const review = (text: string, id: string) => ({ reviewId: id, narrativeHash: sha(text), modelStatus: "ok", findings: [{ id: "F-1" }], humanReview: { required: false } }) as never;
const snap = (text: string) => ({ narrative: { text }, facts: [], selectedCharges: [] });

for (const [name, make] of backends) {
  const fresh = async () => {
    const kv = make();
    setKvForTests(kv);
    if (kv.kind === "upstash") await kv.exec(["FLUSHDB"]);
    return kv;
  };

  test(`[${name}] review admission: 40 parallel requests never exceed the in-flight cap`, async () => {
    await fresh();
    setEnv({ NC_MAX_INFLIGHT: "3", NC_CAP_PER_DAY: "1000", NC_CAP_TOTAL: "1000", NC_RL_IP_PER_DAY: "1000", NC_RL_JUDGE_PER_HOUR: "1000" });
    const results = await Promise.allSettled(Array.from({ length: 40 }, (_, i) => admitReview({ vid: `v${i}`, ip: "198.51.100.1", judgeSid: `s${i}`, requestId: `req-inflight-${i}` })));
    const ok = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ release: () => Promise<void> }>[];
    assert.equal(ok.length, 3);
    const refused = results.filter((r) => r.status === "rejected").map((r) => (r as PromiseRejectedResult).reason);
    assert.ok(refused.every((e) => e instanceof LimitError && e.code === "busy"));
    // Releasing one lease frees exactly one slot; a request only removes its own lease.
    await ok[0].value.release();
    await ok[0].value.release();
    const again = await Promise.allSettled([admitReview({ vid: "x", ip: "198.51.100.1", judgeSid: "sx", requestId: "req-after-1" }), admitReview({ vid: "y", ip: "198.51.100.1", judgeSid: "sy", requestId: "req-after-2" })]);
    assert.deepEqual(again.map((r) => r.status).sort(), ["fulfilled", "rejected"]);
  });

  test(`[${name}] review admission: 30 parallel requests never exceed the daily cap, and nothing is reserved on refusal`, async () => {
    const kv = await fresh();
    setEnv({ NC_MAX_INFLIGHT: "1000", NC_CAP_PER_DAY: "5", NC_CAP_TOTAL: "1000" });
    const results = await Promise.allSettled(Array.from({ length: 30 }, (_, i) => admitReview({ vid: `v${i}`, ip: `198.51.100.${i}`, judgeSid: `s${i}`, requestId: `req-day-${i}` })));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 5);
    const day = new Date().toISOString().slice(0, 10);
    assert.equal(Number(await kv.exec(["GET", `cap:review:day:${day}`])), 5);
    assert.equal(Number(await kv.exec(["GET", "cap:review:total"])), 5, "refused requests reserve nothing");
  });

  test(`[${name}] review admission: per judge session, per IP and total limits`, async () => {
    await fresh();
    setEnv({ NC_MAX_INFLIGHT: "1000", NC_CAP_PER_DAY: "1000", NC_CAP_TOTAL: "4", NC_RL_JUDGE_PER_HOUR: "2", NC_RL_IP_PER_DAY: "3" });
    const go = (sid: string, ip: string, n: number) => admitReview({ vid: "v", ip, judgeSid: sid, requestId: `req-${sid}-${ip}-${n}` });
    await go("s1", "a", 1); await go("s1", "a", 2);
    await assert.rejects(go("s1", "a", 3), (e: unknown) => e instanceof LimitError && e.code === "judge_hour_limit");
    await go("s2", "a", 4);
    await assert.rejects(go("s3", "a", 5), (e: unknown) => e instanceof LimitError && e.code === "ip_day_limit");
    await go("s3", "b", 6);
    await assert.rejects(go("s4", "c", 7), (e: unknown) => e instanceof LimitError && e.code === "total_limit");
  });

  test(`[${name}] expired leases free capacity (a crashed instance cannot hold it)`, async () => {
    await fresh();
    setEnv({ NC_MAX_INFLIGHT: "1", NC_CAP_PER_DAY: "1000", NC_CAP_TOTAL: "1000", NC_RL_JUDGE_PER_HOUR: "1000", NC_RL_IP_PER_DAY: "1000", NC_LEASE_MS: "300" });
    await admitReview({ vid: "v", ip: "i", judgeSid: "s", requestId: "req-lease-1" });
    await assert.rejects(admitReview({ vid: "v", ip: "i", judgeSid: "s", requestId: "req-lease-2" }));
    await new Promise((r) => setTimeout(r, 400));
    await admitReview({ vid: "v", ip: "i", judgeSid: "s", requestId: "req-lease-3" });
    setEnv({ NC_LEASE_MS: "120000" });
  });

  test(`[${name}] write admission: 25 parallel case writes never exceed the global daily cap, even from new cookies`, async () => {
    await fresh();
    setEnv({ NC_W_CASES_PER_VISITOR: "100", NC_W_CASES_PER_IP_DAY: "100", NC_W_CASES_PER_DAY: "7", NC_W_CASES_TOTAL: "100" });
    // 25 different visitor ids: clearing cookies gives a new visitor id but not more global capacity.
    const results = await Promise.allSettled(Array.from({ length: 25 }, (_, i) => admitWrite({ vid: `fresh-cookie-${i}`, ip: `192.0.2.${i}` }, "case", 1000)));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 7);
  });

  test(`[${name}] write admission: per-visitor records, per-IP, and byte caps (stored base64 size)`, async () => {
    await fresh();
    setEnv({ NC_W_PDFS_PER_VISITOR: "2", NC_W_PDFS_PER_IP_DAY: "3", NC_W_PDFS_PER_DAY: "100", NC_W_PDFS_TOTAL: "100", NC_W_BYTES_PER_VISITOR: String(12 * 1024 * 1024), NC_W_BYTES_TOTAL: String(9 * 1024 * 1024) });
    const pdf = Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(2 * 1024 * 1024)]); // 2 MB file = ~2.67 MB stored
    await store.savePdf({ vid: "va", ip: "a" }, "U-1", pdf);
    await store.savePdf({ vid: "va", ip: "a" }, "U-2", pdf);
    await assert.rejects(store.savePdf({ vid: "va", ip: "a" }, "U-3", pdf), (e: unknown) => e instanceof LimitError && e.code === "visitor_limit");
    await store.savePdf({ vid: "vb", ip: "a" }, "U-4", pdf);
    await assert.rejects(store.savePdf({ vid: "vc", ip: "a" }, "U-5", pdf), (e: unknown) => e instanceof LimitError && e.code === "ip_day_limit");
    // 3 stored PDFs are ~8 MB of base64; a 4th would pass 9 MB in total.
    await assert.rejects(store.savePdf({ vid: "vd", ip: "b" }, "U-6", pdf), (e: unknown) => e instanceof LimitError && e.code === "storage_full");
  });

  test(`[${name}] 25 parallel saves to one case get versions 1..25: none lost or reused`, async () => {
    await fresh();
    setEnv({ NC_W_VERSIONS_PER_VISITOR: "1000", NC_W_VERSIONS_PER_IP_DAY: "1000", NC_W_VERSIONS_PER_DAY: "1000", NC_W_VERSIONS_TOTAL: "1000", NC_W_BYTES_TOTAL: String(100 * 1024 * 1024) });
    const who = { vid: "saver", ip: "i" };
    const ns = await Promise.all(Array.from({ length: 25 }, (_, i) => store.appendVersion(who, "C001", snap(`Text ${i}.`), review(`Text ${i}.`, `R-${i}`))));
    assert.deepEqual([...ns].sort((a, b) => a! - b!), Array.from({ length: 25 }, (_, i) => i + 1));
    const h = await store.getHistory("saver", "C001");
    assert.equal(h.versions.length, 25);
    assert.equal(new Set(h.versions.map((v) => v.review.reviewId)).size, 25);
  });

  test(`[${name}] cancellation is bound to the visitor and prevents the save on any instance`, async () => {
    await fresh();
    const who = { vid: "owner", ip: "i" };
    await requests.registerRequest("owner", "req-cancel-x1");
    await assert.rejects(requests.registerRequest("intruder", "req-cancel-x1"), /already in use/);
    assert.equal((await requests.cancelShared("intruder", "req-cancel-x1")).status, "unknown", "another visitor cannot cancel");
    assert.equal(await requests.cancelledShared("req-cancel-x1"), false);
    // "Instance B" receives the owner's cancel; "instance A" then tries to save.
    assert.equal((await requests.cancelShared("owner", "req-cancel-x1")).status, "cancelled");
    assert.equal(await store.appendVersion(who, "C002", snap("A."), review("A.", "R-a"), { requestId: "req-cancel-x1" }), null);
    assert.equal((await store.getHistory("owner", "C002")).versions.length, 0, "nothing was saved");
    // A save that wins the race is reported to the late cancel.
    await requests.registerRequest("owner", "req-cancel-x2");
    const v = await store.appendVersion(who, "C002", snap("B."), review("B.", "R-b"), { requestId: "req-cancel-x2" });
    assert.deepEqual(await requests.cancelShared("owner", "req-cancel-x2"), { status: "saved", version: v });
    // A cancel that arrives before the request registered still wins, for the same visitor only.
    assert.equal((await requests.cancelShared("owner", "req-cancel-x3")).status, "cancelled");
    await requests.registerRequest("owner", "req-cancel-x3");
    assert.equal(await requests.cancelledShared("req-cancel-x3"), true);
    await assert.rejects(requests.registerRequest("intruder", "req-cancel-x3"), /already in use/);
  });
}
