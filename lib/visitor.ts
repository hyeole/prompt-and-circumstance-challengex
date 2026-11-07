// Visitor identity (hosting-free-1). Each browser gets a random visitor id in an httpOnly cookie signed with
// NC_VISITOR_SECRET (HMAC-SHA256), so it cannot be forged or guessed. Every stored record is namespaced by it.
// Used by proxy.ts (issues the cookie) and by every route handler and server page (verifies it again).
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { publicDemo, retentionSeconds } from "./deploy";

export const VID_COOKIE = "nc_vid";
export const JUDGE_COOKIE = "nc_judge";
export const VID_RE = /^[A-Za-z0-9_-]{22}$/;
const LOCAL_SECRET = "local-single-user-tool-secret-not-for-any-deployment";

export class VisitorError extends Error {
  constructor(message: string) { super(message); this.name = "VisitorError"; }
}

/** The signing secret; null in the public demo when it is missing or short (the app then refuses requests). */
export function visitorSecret(): string | null {
  const s = process.env.NC_VISITOR_SECRET;
  if (s && s.length >= 32 && !isKnownExampleValue(s)) return s;
  return publicDemo() ? null : LOCAL_SECRET;
}

/**
 * Values published in this repository: the .env.example placeholders (in any deployment), and the offline-rehearsal
 * test values in eval/hosting-free-1/local-test.env (on Vercel). The public demo refuses them as secrets or codes.
 */
export function isKnownExampleValue(v: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (/replace-with|changeme|change-me|placeholder|example|your-?(key|secret|code)/i.test(v)) return true;
  if (v === LOCAL_SECRET) return true;
  return !!env.VERCEL && /^(local-judge-|local-test-visitor-secret-|local-shim-token-)/.test(v);
}

const mac = (secret: string, purpose: string, value: string) => createHmac("sha256", secret).update(`${purpose}:${value}`).digest("base64url");

export function sign(value: string, purpose: "vid" | "judge", secret = visitorSecret()): string {
  if (!secret) throw new VisitorError("The server is not configured.");
  return `${value}.${mac(secret, purpose, value)}`;
}

/** Returns the signed value, or null when the token is missing, malformed or signed with another key or purpose. */
export function verify(token: string | undefined | null, purpose: "vid" | "judge", secret = visitorSecret()): string | null {
  if (!token || !secret) return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const value = token.slice(0, i), got = Buffer.from(token.slice(i + 1)), want = Buffer.from(mac(secret, purpose, value));
  return got.length === want.length && timingSafeEqual(got, want) ? value : null;
}

export const newVisitorId = () => randomBytes(16).toString("base64url");

export const visitorCookieOptions = (secure: boolean) => ({
  httpOnly: true, secure, sameSite: "lax" as const, path: "/",
  // Outlives the data it points to: data expires 30 days after the last change; the cookie is refreshed on every visit.
  maxAge: retentionSeconds() + 86_400,
});

/** The verified visitor id of the current request (route handlers and server components). */
export async function currentVisitor(): Promise<string> {
  const { cookies } = await import("next/headers");
  const vid = verify((await cookies()).get(VID_COOKIE)?.value, "vid");
  if (!vid || !VID_RE.test(vid)) throw new VisitorError("Your browser session is missing. Reload the page and try again.");
  return vid;
}

/** The judge-session cookie value of the current request (verified against storage by lib/judge.ts). */
export async function judgeCookie(): Promise<string | undefined> {
  const { cookies } = await import("next/headers");
  return (await cookies()).get(JUDGE_COOKIE)?.value;
}

/** Client IP for per-IP limits. On Vercel this is the platform-set x-forwarded-for; locally it may be absent. */
export function clientIp(headers: Headers): string {
  const ip = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip && /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : "unknown";
}
