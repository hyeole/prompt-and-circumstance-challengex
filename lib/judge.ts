// Judge access for live reviews and PDF uploads (hosting-free-1). Public demo only; the local tool needs no code.
// A correct code (NC_JUDGE_CODE, compared in constant time) creates a server-side session bound to the visitor:
// storage holds judge:{sid} -> visitor id for 12 hours, and the httpOnly cookie carries the signed sid. A session is
// valid only for the visitor that created it, so a copied cookie does not work in another browser session.
import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ACCESS_ATTEMPTS, ACCESS_WINDOW_SECONDS, JUDGE_SESSION_SECONDS, publicDemo } from "./deploy";
import { getKv } from "./kv";
import { LimitError } from "./usage";
import { sign, verify } from "./visitor";

export const accessRequired = () => publicDemo();

/** The configured code, or null if missing or shorter than 16 characters (live reviews are then unavailable). */
export function judgeCode(): string | null {
  const c = process.env.NC_JUDGE_CODE;
  return c && c.length >= 16 ? c : null;
}

export function codeMatches(input: string, code: string): boolean {
  const a = createHash("sha256").update(input).digest(), b = createHash("sha256").update(code).digest();
  return timingSafeEqual(a, b);
}

/** Count one attempt; throws LimitError after ACCESS_ATTEMPTS per window, per IP and per visitor. */
export async function countAttempt(vid: string, ip: string) {
  const w = Math.floor(Date.now() / 1000 / ACCESS_WINDOW_SECONDS);
  const [a, , b] = (await getKv().pipeline([["INCR", `rl:acc:ip:${ip}:${w}`], ["EXPIRE", `rl:acc:ip:${ip}:${w}`, ACCESS_WINDOW_SECONDS], ["INCR", `rl:acc:v:${vid}:${w}`], ["EXPIRE", `rl:acc:v:${vid}:${w}`, ACCESS_WINDOW_SECONDS]])) as number[];
  if (Number(a) > ACCESS_ATTEMPTS || Number(b) > ACCESS_ATTEMPTS)
    throw new LimitError("access_attempts", `Too many access-code attempts. Wait ${ACCESS_WINDOW_SECONDS / 60} minutes and try again.`, ACCESS_WINDOW_SECONDS);
}

/** Create a session for this visitor; returns the cookie value. */
export async function grantJudge(vid: string): Promise<string> {
  const sid = randomBytes(18).toString("base64url");
  await getKv().exec(["SET", `judge:${sid}`, vid, "EX", JUDGE_SESSION_SECONDS]);
  return sign(sid, "judge");
}

/** The session id when the cookie is genuine, unexpired and belongs to this visitor; otherwise null. */
export async function judgeSession(vid: string, cookie: string | undefined): Promise<string | null> {
  const sid = verify(cookie, "judge");
  if (!sid || !/^[A-Za-z0-9_-]{24}$/.test(sid)) return null;
  return (await getKv().exec(["GET", `judge:${sid}`])) === vid ? sid : null;
}

export async function endJudge(vid: string, cookie: string | undefined) {
  const sid = await judgeSession(vid, cookie);
  if (sid) await getKv().exec(["DEL", `judge:${sid}`]);
}
