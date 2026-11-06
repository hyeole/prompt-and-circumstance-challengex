// Shared request checks and error responses for the API routes (hosting-free-1).
import "server-only";
import { NextResponse } from "next/server";
import { BudgetError, KvError } from "./kv";
import { LimitError } from "./usage";
import { VisitorError } from "./visitor";

/** Private: never stored by a browser, proxy or CDN cache. */
export const PRIVATE = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { ...PRIVATE, ...headers } });

export const fail = (status: number, code: string, error: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  json({ code, error, ...extra }, status, headers);

export { sameOriginProblem } from "./originCheck";

/** Matched by the error's fixed `name` string: a production bundle can hold more than one copy of a module (so
 *  `instanceof` misses errors from the other copy) and minification renames classes (so `Class.name` differs). Both
 *  were seen in the hosting-free-1 outage check, where a storage error became a 500. */
export const is = <T extends Error>(e: unknown, name: string): e is T => e instanceof Error && e.name === name;

/** Maps storage, budget, limit and visitor errors to clear responses; anything else is a 500 without details. */
export function errorResponse(e: unknown, context: string) {
  if (is<LimitError>(e, "LimitError")) return fail(429, e.code, e.message, e.retryAfter ? { retryAfter: e.retryAfter } : {}, e.retryAfter ? { "Retry-After": String(e.retryAfter) } : {});
  if (is<BudgetError>(e, "BudgetError")) return fail(503, "budget_exhausted", e.message);
  if (is<KvError>(e, "KvError")) {
    console.error(`[${context}] storage unavailable: ${e.message}`);
    return fail(503, "storage_unavailable", "Storage is unavailable right now, so saving and live reviews are paused. Nothing was saved. Try again in a few minutes.");
  }
  if (is<VisitorError>(e, "VisitorError")) return fail(403, "visitor", e.message);
  console.error(`[${context}] unexpected failure:`, (e as Error)?.message);
  return fail(500, "internal", "The request could not be completed.");
}
