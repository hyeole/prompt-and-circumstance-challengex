// hosting-free-1: visitor signing, judge sessions bound to the visitor, attempt limits, same-origin checks, production
// endpoint guard, fail-closed storage, monthly budget, and storage selection. Public-demo mode, in-process storage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BudgetError, KvError, MemoryKv, getKv, metered, setKvForTests } from "../lib/kv";

process.env.NC_PUBLIC_DEMO = "1";
process.env.NC_VISITOR_SECRET = "test-visitor-secret-0123456789abcdef0123456789";
const visitor = await import("../lib/visitor");
const judge = await import("../lib/judge");
const { sameOriginProblem } = await import("../lib/originCheck");
const { productionEndpointProblem } = await import("../lib/llm");
const { admitReview, LimitError } = await import("../lib/usage");
const store = await import("../lib/store");

test("visitor ids are signed: tampering, another purpose or another secret is rejected", () => {
  const vid = visitor.newVisitorId();
  assert.match(vid, visitor.VID_RE);
  const tok = visitor.sign(vid, "vid");
  assert.equal(visitor.verify(tok, "vid"), vid);
  assert.equal(visitor.verify(tok.replace(/.$/, (c) => (c === "A" ? "B" : "A")), "vid"), null);
  assert.equal(visitor.verify(`${visitor.newVisitorId()}.${tok.split(".")[1]}`, "vid"), null);
  assert.equal(visitor.verify(tok, "judge"), null);
  assert.equal(visitor.verify(tok, "vid", "another-secret-0123456789abcdef0123456789"), null);
});

test("the public demo refuses to run without a visitor secret", () => {
  const s = process.env.NC_VISITOR_SECRET;
  delete process.env.NC_VISITOR_SECRET;
  assert.equal(visitor.visitorSecret(), null);
  process.env.NC_VISITOR_SECRET = "short";
  assert.equal(visitor.visitorSecret(), null);
  process.env.NC_VISITOR_SECRET = s;
});

test("a judge session works only for the visitor that unlocked it", async () => {
  setKvForTests(new MemoryKv());
  const a = visitor.newVisitorId(), b = visitor.newVisitorId();
  const cookie = await judge.grantJudge(a);
  assert.ok(await judge.judgeSession(a, cookie));
  assert.equal(await judge.judgeSession(b, cookie), null, "a copied cookie does not work for another visitor");
  assert.equal(await judge.judgeSession(a, cookie.slice(0, -2) + "xx"), null);
  assert.equal(await judge.judgeSession(a, undefined), null);
  await judge.endJudge(a, cookie);
  assert.equal(await judge.judgeSession(a, cookie), null, "ended sessions stop working");
});

test("access codes are compared in constant time and attempts are limited per IP and per visitor", async () => {
  setKvForTests(new MemoryKv());
  assert.equal(judge.codeMatches("correct-horse-battery", "correct-horse-battery"), true);
  assert.equal(judge.codeMatches("correct-horse-batterx", "correct-horse-battery"), false);
  process.env.NC_JUDGE_CODE = "short";
  assert.equal(judge.judgeCode(), null, "codes under 16 characters are treated as not configured");
  for (let i = 0; i < 5; i++) await judge.countAttempt("v1", "203.0.113.9");
  await assert.rejects(judge.countAttempt("v1", "203.0.113.9"), (e: unknown) => e instanceof LimitError && e.code === "access_attempts");
  await assert.rejects(judge.countAttempt("v2", "203.0.113.9"), LimitError, "a new cookie does not reset the per-IP limit");
});

test("state-changing requests must come from this origin in the public demo", () => {
  const h = (o: Record<string, string>) => new Headers({ host: "demo.example", ...o });
  assert.equal(sameOriginProblem("GET", h({})), null);
  assert.equal(sameOriginProblem("POST", h({ origin: "https://demo.example" })), null);
  assert.ok(sameOriginProblem("POST", h({ origin: "https://evil.example" })));
  assert.equal(sameOriginProblem("POST", h({ "sec-fetch-site": "same-origin" })), null);
  assert.ok(sameOriginProblem("PUT", h({ "sec-fetch-site": "cross-site" })));
  assert.ok(sameOriginProblem("POST", h({})), "no origin information: refused in the demo");
});

test("production refuses a local or plain-HTTP model endpoint and the offline-fixture key", () => {
  const prod = { VERCEL_ENV: "production" } as unknown as NodeJS.ProcessEnv;
  assert.equal(productionEndpointProblem("http://localhost:4555/v1", "offline-fixture-not-a-key", {} as unknown as NodeJS.ProcessEnv), null, "local tool: allowed");
  assert.ok(productionEndpointProblem("http://localhost:4555/v1", "k-123", prod));
  assert.ok(productionEndpointProblem("https://127.0.0.1/v1", "k-123", prod));
  assert.ok(productionEndpointProblem("https://api.example/v1", "offline-fixture-not-a-key", prod));
  assert.equal(productionEndpointProblem("https://api.example/v1", "k-123", prod), null);
});

test("storage failures fail closed: no admission, no write, no budgeted request", async () => {
  const kv = new MemoryKv();
  kv.failing = true;
  setKvForTests(kv);
  await assert.rejects(admitReview({ vid: "v", ip: "i", judgeSid: "s", requestId: "req-fail-1" }), KvError);
  await assert.rejects(store.saveUserCase({ vid: "v", ip: "i" }, { id: "U-1" } as never), KvError);
  let ran = false;
  await assert.rejects(metered(async () => { ran = true; }), KvError);
  assert.equal(ran, false, "work does not start when the budget cannot be checked");
});

test("the monthly storage budget stops requests once used up", async () => {
  const kv = new MemoryKv();
  setKvForTests(kv);
  await metered(async () => { await kv.exec(["SET", "x", "y".repeat(1000)]); });
  const m = new Date().toISOString().slice(0, 7);
  assert.ok(Number(kv.call("GET", `budget:bytes:${m}`)) > 1000, "bandwidth is measured");
  assert.ok(Number(kv.call("GET", `budget:cmds:${m}`)) >= 2, "commands are counted");
  kv.call("SET", `budget:bytes:${m}`, String(9 * 1024 ** 3));
  await assert.rejects(metered(async () => {}), BudgetError);
});

test("the public demo never falls back to local files when storage is not configured", () => {
  setKvForTests(undefined);
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.NC_KV;
  assert.throws(() => getKv(), KvError);
});
