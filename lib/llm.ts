// Server-only client for the Unissant-hosted model. The key never leaves the server.
import "server-only";
import OpenAI from "openai";

export const MODEL = process.env.CHALLENGEX_MODEL ?? "gpt-oss-20b";
const BASE_URL = process.env.CHALLENGEX_BASE_URL ?? "https://challengex-ext2.unissantmissionworks.com/v1";
const TIMEOUT_MS = Number(process.env.CHALLENGEX_TIMEOUT_MS ?? 55_000);
const MAX_RETRIES = Number(process.env.CHALLENGEX_MAX_RETRIES ?? 1);
const RESPONSE_FORMAT = (process.env.CHALLENGEX_RESPONSE_FORMAT ?? "json_object") as "json_object" | "none";
// gpt-oss reasoning effort. Measured on 2026-10-29: "low" answered in 7-10s; the default ("medium") timed out at 120s.
export const REASONING_EFFORT = (process.env.CHALLENGEX_REASONING_EFFORT ?? "low") as "low" | "medium" | "high";
/** Independent samples per review, run in parallel and merged (see lib/review/review.ts). */
export const SAMPLES = Math.max(1, Math.min(3, Number(process.env.CHALLENGEX_SAMPLES ?? 2)));
/**
 * Time reserved inside the SAME total budget for the one configured retry when the first request is still unanswered
 * (retry-reachable-1). With the 55 s budget the retry starts at 30 s, alongside the first request, which keeps running.
 * Measured on saved runs: an unanswered request rarely answers later (82 fact-call timeouts, all at the full budget,
 * with one attempt), while a fresh request usually answers in 10-15 s (median of successful calls).
 */
const RETRY_RESERVE_MS = Number(process.env.CHALLENGEX_RETRY_RESERVE_MS ?? 25_000);
/** No attempt is started with less time than this left (unchanged from before). */
const MIN_ATTEMPT_MS = 8_000;

export class ModelError extends Error {
  constructor(message: string, public kind: "config" | "timeout" | "http" | "network" | "empty", public attempts: number, public attemptLog: AttemptRecord[] = []) {
    super(message);
  }
}
/**
 * One request attempt, recorded when it settles OR when it is cancelled (never lost when another attempt wins):
 * when it started (ms after the call began), how long it ran, and how it ended.
 */
export type AttemptRecord = { n: number; startMs: number; ms: number; outcome: "ok" | "timeout" | "http" | "network" | "empty" | "cancelled"; why?: "retry" | "concurrent-retry" };

type ChatClient = { chat: { completions: { create: (body: Record<string, unknown>, opts: { timeout: number; signal?: AbortSignal }) => Promise<{ choices: { message?: { content?: string | null } }[]; usage?: unknown }> } } };
let client: ChatClient | null = null;
function getClient(): ChatClient {
  if (testClient) return testClient;
  const apiKey = process.env.CHALLENGEX_API_KEY;
  if (!apiKey || apiKey === "replace-with-your-key") throw new ModelError("CHALLENGEX_API_KEY is not configured on the server.", "config", 0);
  client ??= new OpenAI({ baseURL: BASE_URL, apiKey, maxRetries: 0 }) as unknown as ChatClient;
  return client;
}
/** Tests only: replace the HTTP client (controlled failures offline). */
let testClient: ChatClient | null = null;
export function __setClientForTests(c: ChatClient | null) { testClient = c; }

type Opts = { reserveMs?: number; minAttemptMs?: number; maxRetries?: number };
const classify = (e: unknown): ModelError => {
  if (e instanceof ModelError) return e;
  const err = e as { status?: number; name?: string; message?: string };
  if (err.name === "APIConnectionTimeoutError" || /timed? ?out/i.test(err.message ?? "")) return new ModelError("The model endpoint did not answer within the time limit.", "timeout", 0);
  if (err.status) return Object.assign(new ModelError(`The model endpoint returned HTTP ${err.status}.`, "http", 0), { status: err.status });
  return new ModelError("Could not reach the model endpoint.", "network", 0);
};
const retryable = (e: ModelError & { status?: number }) => e.kind === "timeout" || e.kind === "network" || e.kind === "empty" || (e.status ?? 0) >= 500 || e.status === 429;

/**
 * One chat completion within a total time budget, with at most 1 + MAX_RETRIES requests and no key in any message.
 *
 * Deadline handling (retry-reachable-1): before, the first request was given the whole budget, so after a timeout no
 * time was ever left for the configured retry (every recorded timeout had 1 attempt). Now:
 * - the first request still has the whole budget (a slow request that is still working is never cut short);
 * - if it fails early with a retryable error, the retry follows as before;
 * - if it is still unanswered when only RETRY_RESERVE_MS of the budget remain, the retry is started THEN, alongside it;
 *   the first answer wins and the other request is aborted and recorded as cancelled.
 * The total budget, the number of requests (at most 1 + MAX_RETRIES) and the minimum attempt time are unchanged.
 */
export async function completeJSON(system: string, user: string, budgetMs = TIMEOUT_MS, signal?: AbortSignal, opts: Opts = {}) {
  const c = getClient();
  const reserve = opts.reserveMs ?? RETRY_RESERVE_MS, minAttempt = opts.minAttemptMs ?? MIN_ATTEMPT_MS, maxRetries = opts.maxRetries ?? MAX_RETRIES;
  const t0 = Date.now(), deadline = t0 + budgetMs;
  const log: AttemptRecord[] = [];
  const body = {
    model: MODEL, temperature: 0, reasoning_effort: REASONING_EFFORT,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    ...(RESPONSE_FORMAT === "json_object" ? { response_format: { type: "json_object" as const } } : {}),
  };

  type Live = { n: number; ctrl: AbortController; p: Promise<{ text: string; usage: unknown }> };
  const live: Live[] = [];
  const start = (why?: AttemptRecord["why"]): Live | null => {
    const remaining = deadline - Date.now();
    if (remaining < minAttempt || signal?.aborted || live.length > maxRetries) return null;
    const n = live.length + 1, startMs = Date.now() - t0, ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const rec: AttemptRecord = { n, startMs, ms: 0, outcome: "cancelled", ...(why ? { why } : {}) };
    log.push(rec);
    const p = c.chat.completions.create(body, { timeout: remaining, signal: ctrl.signal }).then((r) => {
      const text = r.choices[0]?.message?.content ?? "";
      if (!text.trim()) throw new ModelError("The model returned an empty response.", "empty", n);
      return { text, usage: r.usage };
    }).then(
      (v) => { Object.assign(rec, { ms: Date.now() - t0 - startMs, outcome: "ok" }); return v; },
      (e) => { if (rec.outcome === "cancelled" && (ctrl.signal.aborted)) { rec.ms ||= Date.now() - t0 - startMs; throw e; }
        Object.assign(rec, { ms: Date.now() - t0 - startMs, outcome: classify(e).kind === "config" ? "network" : classify(e).kind }); throw e; },
    ).finally(() => signal?.removeEventListener("abort", onAbort));
    const l = { n, ctrl, p };
    live.push(l);
    return l;
  };
  /** Abort every other running attempt, recording it as cancelled at this moment (not when its rejection arrives). */
  const cancelOthers = (winner?: Live) => {
    for (const l of live) {
      const rec = log[l.n - 1];
      if (l !== winner && rec.ms === 0 && rec.outcome === "cancelled") { rec.ms = Date.now() - t0 - rec.startMs; l.ctrl.abort(); }
    }
  };

  const first = start();
  if (!first) throw new ModelError("Not enough time remained to call the model.", "timeout", 0, log);
  let lastErr: ModelError | null = null;
  return await new Promise<{ text: string; attempts: number; usage: unknown; attemptLog: AttemptRecord[] }>((resolve, reject) => {
    let settled = false, pending = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (fn: () => void) => { if (settled) return; settled = true; if (timer) clearTimeout(timer); fn(); };
    const fail = () => finish(() => {
      if (signal?.aborted) return reject(new ModelError("Sample cancelled after the grace period; another sample was used.", "timeout", live.length, log));
      const e = lastErr ?? new ModelError("Not enough time remained to call the model.", "timeout", live.length);
      reject(Object.assign(new ModelError(e.message, e.kind, live.length, log), { status: (e as { status?: number }).status }));
    });
    const watch = (l: Live) => {
      pending++;
      l.p.then(
        (v) => finish(() => { cancelOthers(l); resolve({ ...v, attempts: live.length, attemptLog: log }); }),
        (e) => {
          pending--;
          if (settled) return;
          const me = classify(e);
          if (!signal?.aborted && !(log[l.n - 1].outcome === "cancelled")) lastErr = me;
          // An early retryable failure: the retry follows now (as before), unless one is already running.
          if (!signal?.aborted && retryable(me) && pending === 0) {
            const next = start("retry");
            if (next) { if (timer) clearTimeout(timer); watch(next); return; }
          }
          if (pending === 0) fail();
        },
      );
    };
    watch(first);
    // The first request is still unanswered when only `reserve` remains: start the one retry alongside it.
    const hedgeAt = budgetMs - reserve;
    if (maxRetries > 0 && hedgeAt > 0) timer = setTimeout(() => { if (!settled && pending > 0) { const h = start("concurrent-retry"); if (h) watch(h); } }, hedgeAt);
    signal?.addEventListener("abort", () => { if (!settled) { cancelOthers(); } }, { once: true });
  });
}

export { extractJSON } from "./json";
