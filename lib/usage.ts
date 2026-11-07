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
  6: () => ["duplicate", "This review request is already running. Nothing more was run.", undefined],
};

const WRITE_NOUN: Record<WriteKind, string> = { case: "cases", version: "saved reviews", decision: "decisions", pdf: "PDF uploads" };

/** The six ADMIT_WRITE keys and nine arguments for one write of `kind` and `bytes`. */
function writeParts(p: { vid: string; ip: string }, kind: WriteKind, bytes: number) {
  const l = writeLimits(), day = utcDay(), b = Math.max(0, Math.ceil(bytes));
  const keys = [`q:v:${p.vid}:${kind}`, `q:vb:${p.vid}`, `q:ip:${p.ip}:${kind}:${day}`, `q:g:${kind}:${day}`, `q:g:${kind}:total`, "q:g:bytes:total"];
  const args = [b, l.perVisitor[kind], l.visitorBytes, l.perIpDay[kind], l.globalPerDay[kind], l.globalTotal[kind], l.globalBytes, retentionSeconds(), 2 * 86_400];
  return { keys, args, b };
}

function writeRefusal(kind: WriteKind, r: number): LimitError {
  const l = writeLimits(), noun = WRITE_NOUN[kind];
  const msg: Record<number, [string, string, number | undefined]> = {
    1: ["visitor_limit", `This browser has reached its limit of ${l.perVisitor[kind]} ${noun}. Nothing was saved.`, undefined],
    2: ["visitor_bytes", `This browser has reached its storage allowance. Nothing was saved.`, undefined],
    3: ["ip_day_limit", `This network has reached today's limit for ${noun} (resets at 00:00 UTC). Nothing was saved.`, secondsToNextUtcDay()],
    4: ["day_limit", `The demo has reached today's limit for ${noun} (resets at 00:00 UTC). Nothing was saved.`, secondsToNextUtcDay()],
    5: ["total_limit", `The demo's total allowance for ${noun} has been used. Nothing was saved.`, undefined],
    6: ["storage_full", `The demo's storage allowance has been used. Nothing was saved.`, undefined],
  };
  const [code, text, retry] = msg[r] ?? msg[6];
  return new LimitError(code, text, retry);
}

export type Admission = {
  /** Release this request's own concurrency lease (call in `finally`). */
  release: () => Promise<void>;
  /** Return the save capacity reserved at admission when nothing was saved (cancelled, failed or refused save). */
  refundSave: () => Promise<void>;
};

/**
 * Admit one live review, and when `saveBytes` is given the capacity to save it, in ONE atomic script: either every
 * limit is reserved or nothing is, so a refused review consumes neither review allowance nor saving quota. Throws
 * LimitError (HTTP 429) before any model call. A request id that already holds a lease is refused (code "duplicate").
 */
export async function admitReview(p: { vid: string; ip: string; judgeSid: string; requestId: string; saveBytes?: number }): Promise<Admission> {
  const none: Admission = { release: async () => {}, refundSave: async () => {} };
  if (!publicDemo()) return none;
  const l = reviewLimits(), kv = getKv(), now = Date.now();
  const member = `${p.vid}:${p.requestId}`;
  const w = p.saveBytes !== undefined ? writeParts(p, "version", p.saveBytes) : null;
  const r = Number(await kv.exec(["EVAL", ADMIT_REVIEW, w ? 11 : 5,
    `rl:judge:${p.judgeSid}:${utcHour(now)}`, `rl:ipr:${p.ip}:${utcDay(now)}`, `cap:review:day:${utcDay(now)}`, "cap:review:total", "cap:review:leases",
    ...(w ? w.keys : []),
    now, member, now + l.leaseMs, l.perJudgeHour, l.perIpDay, l.perDay, l.total, l.inflight, 2 * 3600, 2 * 86_400,
    ...(w ? w.args : [])]));
  if (r >= 11) throw writeRefusal("version", r - 10);
  if (r !== 0) {
    const [code, msg, retry] = (REVIEW_REFUSALS[r] ?? REVIEW_REFUSALS[5])(l);
    throw new LimitError(code, msg, retry);
  }
  let refunded = false;
  return {
    // The lease member is unique to this request (claims refuse duplicate ids), so this removes only its own lease.
    release: async () => { await kv.exec(["ZREM", "cap:review:leases", member]).catch(() => {}); },
    refundSave: async () => {
      if (!w || refunded) return;
      refunded = true;
      const [vc, vb, ip, gd, gt, gb] = w.keys;
      await kv.pipeline([["DECR", vc], ["DECRBY", vb, w.b], ["DECR", ip], ["DECR", gd], ["DECR", gt], ["DECRBY", gb, w.b]]).catch(() => {});
    },
  };
}

/** Admit one storage write of `bytes` stored bytes, or throw LimitError (HTTP 429) before anything is written. */
export async function admitWrite(p: { vid: string; ip: string }, kind: WriteKind, bytes: number): Promise<void> {
  if (!publicDemo()) return;
  const w = writeParts(p, kind, bytes);
  const r = Number(await getKv().exec(["EVAL", ADMIT_WRITE, 6, ...w.keys, ...w.args]));
  if (r !== 0) throw writeRefusal(kind, r);
}

/** Cancel requests per 10 minutes, per IP and per visitor (public demo). Cancelling needs no judge session. */
export const CANCELS_PER_WINDOW = 30;
const CANCEL_WINDOW_S = 600;
export async function countCancel(vid: string, ip: string) {
  if (!publicDemo()) return;
  const w = Math.floor(Date.now() / 1000 / CANCEL_WINDOW_S);
  const [a, , b] = (await getKv().pipeline([["INCR", `rl:cancel:ip:${ip}:${w}`], ["EXPIRE", `rl:cancel:ip:${ip}:${w}`, CANCEL_WINDOW_S], ["INCR", `rl:cancel:v:${vid}:${w}`], ["EXPIRE", `rl:cancel:v:${vid}:${w}`, CANCEL_WINDOW_S]])) as number[];
  if (Number(a) > CANCELS_PER_WINDOW || Number(b) > CANCELS_PER_WINDOW)
    throw new LimitError("cancel_limit", "Too many cancel requests. Wait a few minutes and try again.", CANCEL_WINDOW_S);
}
