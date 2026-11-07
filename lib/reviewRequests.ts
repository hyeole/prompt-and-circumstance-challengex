import "server-only";
import { getKv } from "./kv";
import { CANCEL_REQUEST, CLAIM_REQUEST } from "./kvScripts";

/**
 * In-flight review requests (audit item 7; hosting-free-1). Cancellation is decided on the server: a cancelled request
 * is never saved, and a cancel that arrives after the save is told which version was saved.
 * Two layers:
 * - In memory (this instance): aborts the model calls at once when the cancel reaches the same instance.
 * - In storage (every instance): req:{id} records which visitor claimed the id and whether an execution or an early
 *   cancel claimed it. CLAIM_REQUEST lets exactly one execution run per id: a second execution of a claimed, running
 *   or completed id is refused (hosting-free-1 fix). cancel:{id} and saved:{id} are written by atomic scripts, so a
 *   cancel received by another instance still prevents the save and a second save of the same request is refused
 *   (lib/kvScripts.ts SAVE_VERSION / CANCEL_REQUEST); the running request polls cancel:{id} to stop its model calls.
 * A request can only be cancelled by the visitor that owns it; any other visitor is told "unknown".
 */
type Entry = { status: "running" | "cancelled" | "saved" | "finished"; version?: number; controller: AbortController; at: number; vid?: string };
const g = globalThis as unknown as { __ncRequests?: Map<string, Entry> };
const requests = (g.__ncRequests ??= new Map());

export const REQUEST_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const TTL_MS = 10 * 60_000;
export const MARKER_TTL_S = 600;
/** How long a claimed request id stays reserved (so a completed id cannot be executed again), and its markers. */
export const REQUEST_STATE_TTL_S = 24 * 3600;

function prune() {
  const now = Date.now();
  for (const [id, e] of requests) if (now - e.at > TTL_MS) requests.delete(id);
}

/** Register a request on this instance; returns the signal that a cancel aborts. */
export function startRequest(id: string, vid?: string): AbortSignal {
  prune();
  const controller = new AbortController();
  requests.set(id, { status: "running", controller, at: Date.now(), vid });
  return controller.signal;
}

/** Cancel on this instance. Only the starting visitor may cancel; others get "unknown". */
export function cancelRequest(id: string, vid?: string): { status: Entry["status"] | "unknown"; version?: number } {
  const e = requests.get(id);
  if (!e || (e.vid !== undefined && e.vid !== vid)) return { status: "unknown" };
  if (e.status === "running") { e.status = "cancelled"; e.controller.abort("cancelled"); }
  return { status: e.status, version: e.version };
}

/** Save only if the request was not cancelled on this instance. `save` must be synchronous. */
export function saveUnlessCancelled(id: string | undefined, save: () => number): number | null {
  const e = id ? requests.get(id) : undefined;
  if (e?.status === "cancelled") return null;
  const version = save();
  if (e) Object.assign(e, { status: "saved", version });
  return version;
}

export function markSaved(id: string | undefined, version: number) {
  const e = id ? requests.get(id) : undefined;
  if (e) Object.assign(e, { status: "saved", version });
}

export function finishRequest(id: string | undefined) {
  const e = id ? requests.get(id) : undefined;
  if (e && e.status === "running") e.status = "finished";
}

export function isCancelled(id: string | undefined) {
  return !!id && requests.get(id)?.status === "cancelled";
}

// ---------- shared across instances (storage)

export class RequestConflict extends Error { override name = "RequestConflict"; }

/**
 * Claim the request id for this one execution, atomically. Returns "claimed", or "cancelled" when this visitor
 * cancelled it before it started. Throws RequestConflict when the id was already claimed by any execution (running or
 * completed, by this or another visitor) or by another visitor's cancel.
 */
export async function registerRequest(vid: string, id: string): Promise<"claimed" | "cancelled"> {
  const r = await getKv().exec(["EVAL", CLAIM_REQUEST, 1, `req:${id}`, vid, REQUEST_STATE_TTL_S]);
  if (r === "claimed" || r === "cancelled") return r;
  throw new RequestConflict("This request id is already in use. Nothing was run.");
}

/** Cancel across instances. Returns "unknown" unless this visitor started the request. */
export async function cancelShared(vid: string, id: string): Promise<{ status: "unknown" | "saved" | "cancelled"; version?: number }> {
  const r = (await getKv().exec(["EVAL", CANCEL_REQUEST, 3, `req:${id}`, `cancel:${id}`, `saved:${id}`, vid, REQUEST_STATE_TTL_S])) as string[];
  if (r[0] === "saved") return { status: "saved", version: Number(r[1]) };
  return { status: r[0] === "cancelled" ? "cancelled" : "unknown" };
}

export async function cancelledShared(id: string) {
  return Number(await getKv().exec(["EXISTS", `cancel:${id}`])) === 1;
}

/** Poll the shared cancel marker while a review runs, so a cancel received by another instance stops the model calls. */
export function watchSharedCancel(id: string, controller: AbortController, everyMs = 2_000): () => void {
  const t = setInterval(() => {
    cancelledShared(id).then((c) => { if (c) controller.abort("cancelled"); }, () => {});
  }, everyMs);
  return () => clearInterval(t);
}
