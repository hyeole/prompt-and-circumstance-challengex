import "server-only";

/**
 * Server-side record of in-flight review requests (audit item 7). Cancellation is decided here, not only by the
 * browser aborting its fetch: a cancelled request is never saved, and a cancel that arrives after the save is told
 * which version was saved. Saving and cancelling are synchronous, so in this single Node process they cannot interleave.
 * Kept in memory: a server restart forgets in-flight requests, which then cannot have been saved.
 */
type Entry = { status: "running" | "cancelled" | "saved" | "finished"; version?: number; controller: AbortController; at: number };
const g = globalThis as unknown as { __ncRequests?: Map<string, Entry> };
const requests = (g.__ncRequests ??= new Map());

export const REQUEST_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const TTL_MS = 10 * 60_000;

function prune() {
  const now = Date.now();
  for (const [id, e] of requests) if (now - e.at > TTL_MS) requests.delete(id);
}

/** Register a request; returns the signal that a cancel aborts. */
export function startRequest(id: string): AbortSignal {
  prune();
  const controller = new AbortController();
  requests.set(id, { status: "running", controller, at: Date.now() });
  return controller.signal;
}

/** Cancel a request. Reports whether it had already been saved (and as which version). */
export function cancelRequest(id: string): { status: Entry["status"] | "unknown"; version?: number } {
  const e = requests.get(id);
  if (!e) return { status: "unknown" };
  if (e.status === "running") { e.status = "cancelled"; e.controller.abort("cancelled"); }
  return { status: e.status, version: e.version };
}

/** Save only if the request was not cancelled. `save` must be synchronous. Returns the version, or null if cancelled. */
export function saveUnlessCancelled(id: string | undefined, save: () => number): number | null {
  const e = id ? requests.get(id) : undefined;
  if (e?.status === "cancelled") return null;
  const version = save();
  if (e) Object.assign(e, { status: "saved", version });
  return version;
}

export function finishRequest(id: string | undefined) {
  const e = id ? requests.get(id) : undefined;
  if (e && e.status === "running") e.status = "finished";
}

export function isCancelled(id: string | undefined) {
  return !!id && requests.get(id)?.status === "cancelled";
}
