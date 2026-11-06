// retry-reachable-1: the one configured retry must be reachable inside the SAME total budget when a request stalls.
// Controlled failures with a fake HTTP client (no network): stalls that honour the timeout and abort signals (rejecting
// asynchronously, as the real client does), early 5xx/4xx errors, slow-but-working requests and caller cancellation.
// Budgets are scaled down (600 ms total, 250 ms reserve, 50 ms minimum attempt) so the tests run quickly.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { completeJSON, __setClientForTests, ModelError } from "../lib/llm";
import { reviewCase, type Complete } from "../lib/review/review";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import type { CaseRecord } from "../lib/types";

type Step = { kind: "ok"; after: number; text?: string } | { kind: "stall" } | { kind: "http"; after: number; status: number };
const later = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** A fake client that plays one scripted behaviour per request, in order (per prompt when `bySystem` is given). */
function fake(steps: Step[] | ((system: string, n: number) => Step)) {
  let n = 0;
  const started: number[] = [];
  const t0 = Date.now();
  const c = { chat: { completions: { create: (body: Record<string, unknown>, opts: { timeout: number; signal?: AbortSignal }) => {
    const system = (body.messages as { content: string }[])[0].content;
    const step = typeof steps === "function" ? steps(system, n++) : steps[n++] ?? { kind: "stall" as const };
    started.push(Date.now() - t0);
    return new Promise<{ choices: { message: { content: string } }[] }>((resolve, reject) => {
      const timers: ReturnType<typeof setTimeout>[] = [];
      const clear = () => timers.forEach(clearTimeout);
      // Real-client behaviour: the rejection for an abort or a timeout arrives asynchronously.
      opts.signal?.addEventListener("abort", () => { clear(); setTimeout(() => reject(Object.assign(new Error("Request was aborted."), { name: "APIUserAbortError" })), 5); }, { once: true });
      timers.push(setTimeout(() => { clear(); reject(Object.assign(new Error("Request timed out."), { name: "APIConnectionTimeoutError" })); }, opts.timeout));
      if (step.kind === "ok") timers.push(setTimeout(() => { clear(); resolve({ choices: [{ message: { content: step.text ?? "{\"ok\":true}" } }] }); }, step.after));
      if (step.kind === "http") timers.push(setTimeout(() => { clear(); reject(Object.assign(new Error(`${step.status}`), { status: step.status })); }, step.after));
    });
  } } } };
  __setClientForTests(c);
  return started;
}
const O = { reserveMs: 250, minAttemptMs: 50 };
const B = 600;
afterEach(() => __setClientForTests(null));

test("a fast answer uses one request; no second request is started", async () => {
  const started = fake([{ kind: "ok", after: 40 }]);
  const r = await completeJSON("s", "u", B, undefined, O);
  assert.equal(r.attempts, 1);
  await later(450);
  assert.equal(started.length, 1);
});
test("a stalled first request: the retry starts when only the reserve remains and its answer is used, within the budget", async () => {
  fake([{ kind: "stall" }, { kind: "ok", after: 60 }]);
  const t = Date.now();
  const r = await completeJSON("s", "u", B, undefined, O);
  const took = Date.now() - t;
  assert.equal(r.attempts, 2);
  assert.ok(took >= 350 && took < B, `answered at ${took} ms`);
  assert.deepEqual(r.attemptLog.map((a) => [a.n, a.outcome, a.why ?? null]), [[1, "cancelled", null], [2, "ok", "concurrent-retry"]]);
  assert.ok(r.attemptLog[0].ms >= 400, "the cancelled first request is recorded with its duration at cancellation");
});
test("a slow but working first request is not cut short: it still wins after the retry has started", async () => {
  fake([{ kind: "ok", after: 450 }, { kind: "stall" }]);
  const r = await completeJSON("s", "u", B, undefined, O);
  assert.equal(r.attempts, 2);
  assert.deepEqual(r.attemptLog.map((a) => [a.n, a.outcome]), [[1, "ok"], [2, "cancelled"]]);
});
test("both requests stall: a timeout at the total budget (never later), 2 attempts, both recorded", async () => {
  fake([{ kind: "stall" }, { kind: "stall" }]);
  const t = Date.now();
  await assert.rejects(completeJSON("s", "u", B, undefined, O), (e: unknown) => {
    const m = e as ModelError;
    assert.equal(m.kind, "timeout"); assert.equal(m.attempts, 2);
    assert.deepEqual(m.attemptLog.map((a) => a.outcome), ["timeout", "timeout"]);
    return true;
  });
  assert.ok(Date.now() - t < B + 60, "no time beyond the budget");
});
test("an early 5xx is retried in sequence, as before", async () => {
  fake([{ kind: "http", after: 30, status: 502 }, { kind: "ok", after: 40 }]);
  const r = await completeJSON("s", "u", B, undefined, O);
  assert.equal(r.attempts, 2);
  assert.deepEqual(r.attemptLog.map((a) => [a.outcome, a.why ?? null]), [["http", null], ["ok", "retry"]]);
});
test("a 4xx is not retried", async () => {
  const started = fake([{ kind: "http", after: 30, status: 400 }, { kind: "ok", after: 40 }]);
  await assert.rejects(completeJSON("s", "u", B, undefined, O), (e: unknown) => (e as ModelError).kind === "http" && (e as ModelError).attempts === 1);
  await later(400);
  assert.equal(started.length, 1);
});
test("caller cancellation (sample grace) cancels the request and starts nothing more", async () => {
  const started = fake([{ kind: "stall" }, { kind: "ok", after: 10 }]);
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 100);
  await assert.rejects(completeJSON("s", "u", B, ctrl.signal, O), (e: unknown) => /cancelled/.test((e as Error).message) && (e as ModelError).attemptLog[0].outcome === "cancelled");
  await later(450);
  assert.equal(started.length, 1);
});
test("a budget smaller than the reserve (e.g. a late facts retry) makes one request only", async () => {
  const started = fake([{ kind: "stall" }, { kind: "ok", after: 10 }]);
  await assert.rejects(completeJSON("s", "u", 200, undefined, O), (e: unknown) => (e as ModelError).kind === "timeout" && (e as ModelError).attempts === 1);
  assert.equal(started.length, 1);
});
test("with retries configured off, no second request is ever started", async () => {
  const started = fake([{ kind: "stall" }, { kind: "ok", after: 10 }]);
  await assert.rejects(completeJSON("s", "u", B, undefined, { ...O, maxRetries: 0 }), (e: unknown) => (e as ModelError).attempts === 1);
  assert.equal(started.length, 1);
});

// ---- Pipeline: attempts are recorded; incomplete checks stay marked; supported findings are kept ----
const ALL = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8"];
const REVIEW = JSON.stringify({ elements: ALL.map((id) => ({ element_id: id, status: "present", sentence_ids: [], note: "" })), issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const scaled: Complete = (s, u, b, sig) => completeJSON(s, u, b === undefined ? B : Math.min(b, B), sig, O);
const XE07 = JSON.parse(readFileSync("eval/ex-1/cases/XE07.json", "utf8")) as CaseRecord; // single subject; crossing 11/14/2015, form 11/14/2017
const FACTS = JSON.stringify({ entry_statements: [], removal_statements: [], status_statements: [] });

test("pipeline: a stalled fact extraction is rescued by the retry; the call records both attempts; the review is complete", async () => {
  fake((system, n) => system === FACTS_SYSTEM_PROMPT ? (n === 0 ? { kind: "stall" } : { kind: "ok", after: 30, text: FACTS }) : { kind: "ok", after: 20, text: REVIEW });
  const r = await reviewCase(XE07, scaled);
  const f = r.calls.find((c) => c.role === "facts")!;
  assert.equal(f.status, "ok"); assert.equal(f.attempts, 2);
  assert.deepEqual(f.attemptLog?.map((a) => a.outcome), ["cancelled", "ok"]);
  assert.equal(r.modelConfig.factsStatus, "ok");
  assert.ok(r.findings.some((x) => x.id === "F-ENTRY-DATE"), "the source-supported date conflict is found");
});
test("pipeline: when both fact requests stall, the review is still marked partial and the source-text finding is kept", async () => {
  fake((system) => system === FACTS_SYSTEM_PROMPT ? { kind: "stall" } : { kind: "ok", after: 20, text: REVIEW });
  const r = await reviewCase(XE07, scaled);
  const f = r.calls.find((c) => c.role === "facts")!;
  assert.equal(f.status, "failed"); assert.equal(f.attempts, 2);
  assert.equal(r.modelConfig.factsStatus, "failed");
  assert.equal(r.completion?.status, "partial");
  assert.ok(r.findings.some((x) => x.id === "F-ENTRY-DATE"), "the fallback still finds the date conflict");
});
