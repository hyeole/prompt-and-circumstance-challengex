// Usage limits (hosting-free-1). Applied only in the public demo; the local single-user tool and the evaluation
// scripts are not limited. Each admission is ONE atomic script that checks every limit and reserves all of them,
// or none (lib/kvScripts.ts). Concurrency uses an expiring lease per request; a request releases only its own lease.
import "server-only";
import { publicDemo, retentionSeconds, reviewLimits, utcDay, utcHour, writeLimits, type WriteKind } from "./deploy";
import { getKv } from "./kv";
import { ADMIT_REVIEW, ADMIT_WRITE } from "./kvScripts";

export class LimitError extends Error {
  constructor(public code: string, message: string, public retryAfter?: number) { super(message); this.name = "LimitError"; }
}

const secondsToNextUtcDay = (t = Date.now()) => Math.max(60, Math.ceil((Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth(), new Date(t).getUTCDate() + 1) - t) / 1000));
const secondsToNextUtcHour = (t = Date.now()) => Math.max(60, 3600 - Math.floor((t % 3_600_000) / 1000));

const REVIEW_REFUSALS: Record<number, (l: ReturnType<typeof reviewLimits>) => [string, string, number | undefined]> = {
  1: (l) => ["judge_hour_limit", `This judge session has used its ${l.perJudgeHour} live reviews for this hour. Try again later. Nothing was run.`, secondsToNextUtcHour()],
  2: (l) => ["ip_day_limit", `This network has reached today's limit of ${l.perIpDay} live reviews (resets at 00:00 UTC). Nothing was run.`, secondsToNextUtcDay()],
  3: (l) => ["day_limit", `The demo has reached today's limit of ${l.perDay} live reviews (resets at 00:00 UTC). Nothing was run.`, secondsToNextUtcDay()],
  4: (l) => ["total_limit", `The demo's total allowance of ${l.total} live reviews has been used. Nothing was run.`, undefined],
  5: (l) => ["busy", `${l.inflight} live reviews are already running. Try again in a minute. Nothing was run.`, 60],
};

/**
 * Admit one live review, or throw LimitError (HTTP 429) before any model call. Returns the function that releases
 * this request's own concurrency lease (call it in `finally`).
 */
export async function admitReview(p: { vid: string; ip: string; judgeSid: string; requestId: string }): Promise<() => Promise<void>> {
  if (!publicDemo()) return async () => {};
  const l = reviewLimits(), kv = getKv(), now = Date.now();
  const member = `${p.vid}:${p.requestId}`;
  const r = Number(await kv.exec(["EVAL", ADMIT_REVIEW, 5,
    `rl:judge:${p.judgeSid}:${utcHour(now)}`, `rl:ipr:${p.ip}:${utcDay(now)}`, `cap:review:day:${utcDay(now)}`, "cap:review:total", "cap:review:leases",
    now, member, now + l.leaseMs, l.perJudgeHour, l.perIpDay, l.perDay, l.total, l.inflight, 2 * 3600, 2 * 86_400]));
  if (r !== 0) {
    const [code, msg, retry] = (REVIEW_REFUSALS[r] ?? REVIEW_REFUSALS[5])(l);
    throw new LimitError(code, msg, retry);
  }
  return async () => { await kv.exec(["ZREM", "cap:review:leases", member]).catch(() => {}); };
}

const WRITE_NOUN: Record<WriteKind, string> = { case: "cases", version: "saved reviews", decision: "decisions", pdf: "PDF uploads" };

/** Admit one storage write of `bytes` stored bytes, or throw LimitError (HTTP 429) before anything is written. */
export async function admitWrite(p: { vid: string; ip: string }, kind: WriteKind, bytes: number): Promise<void> {
  if (!publicDemo()) return;
  const l = writeLimits(), kv = getKv(), day = utcDay(), b = Math.max(0, Math.ceil(bytes));
  const r = Number(await kv.exec(["EVAL", ADMIT_WRITE, 6,
    `q:v:${p.vid}:${kind}`, `q:vb:${p.vid}`, `q:ip:${p.ip}:${kind}:${day}`, `q:g:${kind}:${day}`, `q:g:${kind}:total`, "q:g:bytes:total",
    b, l.perVisitor[kind], l.visitorBytes, l.perIpDay[kind], l.globalPerDay[kind], l.globalTotal[kind], l.globalBytes, retentionSeconds(), 2 * 86_400]));
  if (r === 0) return;
  const noun = WRITE_NOUN[kind];
  const msg: Record<number, [string, string, number | undefined]> = {
    1: ["visitor_limit", `This browser has reached its limit of ${l.perVisitor[kind]} ${noun}. Nothing was saved.`, undefined],
    2: ["visitor_bytes", `This browser has reached its storage allowance. Nothing was saved.`, undefined],
    3: ["ip_day_limit", `This network has reached today's limit for ${noun} (resets at 00:00 UTC). Nothing was saved.`, secondsToNextUtcDay()],
    4: ["day_limit", `The demo has reached today's limit for ${noun} (resets at 00:00 UTC). Nothing was saved.`, secondsToNextUtcDay()],
    5: ["total_limit", `The demo's total allowance for ${noun} has been used. Nothing was saved.`, undefined],
    6: ["storage_full", `The demo's storage allowance has been used. Nothing was saved.`, undefined],
  };
  const [code, text, retry] = msg[r] ?? msg[6];
  throw new LimitError(code, text, retry);
}
