// Workspace store: user-created cases, immutable review versions, officer decisions and uploaded PDFs.
// hosting-free-1: stored in key-value storage (lib/kv.ts), one hash per visitor: v:{visitorId}. A visitor can only
// read or write their own hash. Every write renews the hash's expiry, so saved data is deleted NC_RETENTION_DAYS
// (default 30) after the visitor's last change. In the public demo every write first passes the record and byte
// limits in lib/usage.ts. Field layout inside v:{vid}:
//   case:{id}               CaseRecord JSON (cases entered in the app)
//   pdf:{id}                uploaded PDF, base64
//   n:{id}                  number of saved versions (HINCRBY: atomic version numbers)
//   ver:{id}:{n}            StoredVersion JSON without its number (the number is the field name)
//   sum:{id}                summary of the latest version (for the case lists, without downloading versions)
//   rev:{id}:{reviewId}     finding ids of that review (to validate decisions)
//   dec:{id}:{reviewId}:{findingId}   Decision JSON (one field per decision: no read-modify-write)
import "server-only";
import { randomBytes } from "node:crypto";
import { completionOf } from "./completion";
import { MAX_PDF_BYTES, publicDemo, retentionSeconds, writeLimits } from "./deploy";
import { getKv } from "./kv";
import { SAVE_VERSION } from "./kvScripts";
import { LimitError, admitWrite } from "./usage";
import type { CaseRecord, ReviewResult } from "./types";
import { sha } from "./hash";

export const ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;
/** Review and finding ids: no ':' or glob characters, since they are part of field names and HSCAN patterns. */
export const PART_RE = /^[A-Za-z0-9._-]{1,64}$/;
export function assertId(id: string) {
  if (!ID_RE.test(id)) throw new Error("Invalid case id.");
  return id;
}
const assertPart = (s: string) => { if (!PART_RE.test(s)) throw new Error("Invalid id."); return s; };

/** Who is writing: the visitor (namespace and per-visitor limits) and the client IP (per-IP limits). */
export type Who = { vid: string; ip: string };
const vkey = (vid: string) => `v:${vid}`;
const bytesOf = (...s: string[]) => s.reduce((n, x) => n + Buffer.byteLength(x), 0);

async function hscan(vid: string, match: string): Promise<[string, string][]> {
  const out: [string, string][] = [];
  let cursor = "0";
  do {
    const [next, flat] = (await getKv().exec(["HSCAN", vkey(vid), cursor, "MATCH", match, "COUNT", 1000])) as [string, string[]];
    for (let i = 0; i < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
    cursor = String(next);
  } while (cursor !== "0");
  return out;
}

// ---------- user cases

export async function listUserCases(vid: string): Promise<CaseRecord[]> {
  return (await hscan(vid, "case:*")).map(([, v]) => JSON.parse(v) as CaseRecord).sort((a, b) => a.id.localeCompare(b.id));
}

export async function getUserCase(vid: string, id: string): Promise<CaseRecord | null> {
  const v = (await getKv().exec(["HGET", vkey(vid), `case:${assertId(id)}`])) as string | null;
  return v ? (JSON.parse(v) as CaseRecord) : null;
}

/** Random, so ids never collide between instances or visitors. */
export const newUserCaseId = () => `U-${randomBytes(6).toString("hex")}`;

/** Store a case entered in the app. A new case counts against the case limits; `null` is an update whose bytes were
 *  already admitted (the PDF metadata written with an upload). */
export async function saveUserCase(who: Who, c: CaseRecord, kind: "case" | null = "case") {
  const v = JSON.stringify(c);
  if (kind) await admitWrite(who, kind, bytesOf(v));
  await getKv().pipeline([["HSET", vkey(who.vid), `case:${assertId(c.id)}`, v], ["EXPIRE", vkey(who.vid), retentionSeconds()]]);
}

// ---------- uploads (source PDFs)

export class UploadError extends Error {
  constructor(message: string, public status = 400) { super(message); this.name = "UploadError"; }
}

/** Store a PDF (viewing only; no text is read from it). Counted at its stored size: base64, about 4/3 of the file,
 *  plus `extraBytes` written with it (the updated case record). */
export async function savePdf(who: Who, id: string, data: Buffer, extraBytes = 0) {
  if (data.length > MAX_PDF_BYTES) throw new UploadError(`The PDF is larger than ${MAX_PDF_BYTES / 1024 / 1024} MB.`, 413);
  if (data.subarray(0, 5).toString("latin1") !== "%PDF-") throw new UploadError("The file is not a PDF.");
  const b64 = data.toString("base64");
  await admitWrite(who, "pdf", bytesOf(b64) + extraBytes);
  await getKv().pipeline([["HSET", vkey(who.vid), `pdf:${assertId(id)}`, b64], ["EXPIRE", vkey(who.vid), retentionSeconds()]]);
}
export async function getPdf(vid: string, id: string): Promise<Buffer | null> {
  const v = (await getKv().exec(["HGET", vkey(vid), `pdf:${assertId(id)}`])) as string | null;
  return v ? Buffer.from(v, "base64") : null;
}
export async function hasPdf(vid: string, id: string) {
  return Number(await getKv().exec(["HEXISTS", vkey(vid), `pdf:${assertId(id)}`])) === 1;
}

// ---------- history: immutable versions + decisions

export type Snapshot = Pick<CaseRecord, "narrative" | "facts" | "selectedCharges">;
export type Decision = { state: "open" | "acknowledged" | "dismissed"; note?: string; decidedAt: string };
export interface StoredVersion {
  version: number;
  savedAt: string;
  snapshotHash: string;
  snapshot: Snapshot;
  review: ReviewResult;
  completion: "complete" | "partial";
}
export interface CaseHistory {
  caseId: string;
  versions: StoredVersion[];
  /** Officer decisions, keyed by reviewId then findingId. Kept apart from the model output, which is never changed. */
  decisions: Record<string, Record<string, Decision>>;
}
interface Summary { savedAt: string; completion: "complete" | "partial"; humanReview: boolean; reviewId: string; findingIds: string[]; snapshotHash: string }

export const snapshotHash = (s: Snapshot) => sha(JSON.stringify([s.narrative.text, s.facts, s.selectedCharges]));

export async function getHistory(vid: string, id: string): Promise<CaseHistory> {
  assertId(id);
  const kv = getKv();
  const n = Number(await kv.exec(["HGET", vkey(vid), `n:${id}`]) ?? 0);
  const fields = Array.from({ length: n }, (_, i) => `ver:${id}:${i + 1}`);
  const raw = n ? ((await kv.exec(["HMGET", vkey(vid), ...fields])) as (string | null)[]) : [];
  const versions = raw.flatMap((v, i) => (v ? [{ ...(JSON.parse(v) as Omit<StoredVersion, "version">), version: i + 1 }] : []));
  const decisions: CaseHistory["decisions"] = {};
  for (const [f, v] of await hscan(vid, `dec:${id}:*`)) {
    const [, , reviewId, findingId] = f.split(":");
    (decisions[reviewId] ??= {})[findingId] = JSON.parse(v) as Decision;
  }
  return { caseId: id, versions, decisions };
}

/** Room reserved for the review result on top of the snapshot when a live review is admitted. Measured versions are
 *  about 21 KB in total; anything beyond the reservation is checked atomically at save (SAVE_VERSION). */
export const REVIEW_RESULT_RESERVE_BYTES = 80_000;
/** Stored bytes to reserve at admission for saving a review of this snapshot. */
export const versionReserveBytes = (snapshot: Snapshot) => bytesOf(JSON.stringify(snapshot)) * 2 + REVIEW_RESULT_RESERVE_BYTES;

export class SaveRefused extends Error {
  constructor(public code: "duplicate", message: string) { super(message); this.name = "SaveRefused"; }
}

/**
 * Append a reviewed version atomically. Returns null when `requestId` was cancelled first (on any instance). Earlier
 * versions are never modified; concurrent saves get distinct, consecutive numbers; a second save of the same request
 * is refused (SaveRefused "duplicate"). With `reservedBytes`, capacity was reserved at admission
 * (app/api/review/route.ts) and any bytes beyond it are checked against the visitor and global byte limits inside the
 * save script, so neither limit can be exceeded (LimitError, nothing saved).
 */
export async function appendVersion(who: Who, id: string, snapshot: Snapshot, review: ReviewResult, opts: { requestId?: string; reservedBytes?: number } = {}): Promise<number | null> {
  assertId(id);
  if (review.narrativeHash !== sha(snapshot.narrative.text)) throw new Error("Review does not match the reviewed narrative.");
  const reviewId = assertPart(review.reviewId);
  const completion = completionOf(review).status;
  const version: Omit<StoredVersion, "version"> = { savedAt: new Date().toISOString(), snapshotHash: snapshotHash(snapshot), snapshot: structuredClone(snapshot), review, completion };
  const v = JSON.stringify(version);
  const summary: Summary = { savedAt: version.savedAt, completion, humanReview: review.humanReview.required, reviewId, findingIds: review.findings.map((f) => f.id), snapshotHash: version.snapshotHash };
  const s = JSON.stringify(summary), idx = JSON.stringify(summary.findingIds);
  const bytes = bytesOf(v, s, idx);
  if (opts.reservedBytes === undefined) await admitWrite(who, "version", bytes);
  const extra = opts.reservedBytes === undefined || !publicDemo() ? 0 : Math.max(0, bytes - opts.reservedBytes);
  const l = writeLimits();
  // Without a request id the save still gets its own marker, so the duplicate check never blocks a later save.
  const rid = opts.requestId ?? `anon-${randomBytes(9).toString("base64url")}`;
  const n = Number(await getKv().exec(["EVAL", SAVE_VERSION, 5, vkey(who.vid), `cancel:${rid}`, `saved:${rid}`, `q:vb:${who.vid}`, "q:g:bytes:total",
    id, v, s, retentionSeconds(), opts.requestId ? 24 * 3600 : 60, reviewId, idx, extra, l.visitorBytes, l.globalBytes]));
  if (n === -1) return null;
  if (n === -2) throw new SaveRefused("duplicate", "This review request was already saved. Nothing more was saved.");
  if (n === -3) throw new LimitError("storage_full", "The review finished, but saving it would exceed the storage allowance. Nothing was saved.");
  return n;
}

export class DecisionError extends Error { override name = "DecisionError"; }

export async function setDecision(who: Who, id: string, reviewId: string, findingId: string, d: Omit<Decision, "decidedAt">) {
  assertId(id); assertPart(reviewId); assertPart(findingId);
  const idx = (await getKv().exec(["HGET", vkey(who.vid), `rev:${id}:${reviewId}`])) as string | null;
  if (!idx) throw new DecisionError("Unknown review.");
  if (!(JSON.parse(idx) as string[]).includes(findingId)) throw new DecisionError("Unknown finding.");
  const decision: Decision = { state: d.state, note: d.note?.slice(0, 1000) || undefined, decidedAt: new Date().toISOString() };
  const v = JSON.stringify(decision);
  await admitWrite(who, "decision", bytesOf(v));
  await getKv().pipeline([["HSET", vkey(who.vid), `dec:${id}:${reviewId}:${findingId}`, v], ["EXPIRE", vkey(who.vid), retentionSeconds()]]);
  return decision;
}

export interface CaseSummary { versions: number; lastReviewedAt?: string; completion?: "complete" | "partial"; humanReview?: boolean; findings?: number; openDecisions?: number; lastSnapshotHash?: string }

/** Compact per-case status for the case lists: 2-3 storage round trips for any number of cases. */
export async function caseSummaries(vid: string, ids: string[]): Promise<Map<string, CaseSummary>> {
  const out = new Map<string, CaseSummary>();
  if (!ids.length) return out;
  const kv = getKv();
  const raw = (await kv.exec(["HMGET", vkey(vid), ...ids.flatMap((id) => [`n:${id}`, `sum:${id}`])])) as (string | null)[];
  const reviewed: { id: string; s: Summary; n: number }[] = [];
  ids.forEach((id, i) => {
    const n = Number(raw[2 * i] ?? 0), s = raw[2 * i + 1];
    if (!n || !s) { out.set(id, { versions: 0 }); return; }
    reviewed.push({ id, s: JSON.parse(s) as Summary, n });
  });
  const scans = reviewed.length ? ((await kv.pipeline(reviewed.map(({ id, s }) => ["HSCAN", vkey(vid), "0", "MATCH", `dec:${id}:${s.reviewId}:*`, "COUNT", 1000]))) as [string, string[]][]) : [];
  // COUNT is only a hint: a scan that did not finish in one pass is completed with the looping helper.
  for (let i = 0; i < reviewed.length; i++) if (String(scans[i]?.[0] ?? "0") !== "0") scans[i] = ["0", (await hscan(vid, `dec:${reviewed[i].id}:${reviewed[i].s.reviewId}:*`)).flat()];
  reviewed.forEach(({ id, s, n }, i) => {
    const flat = scans[i]?.[1] ?? [];
    const decided = new Map<string, Decision>();
    for (let j = 0; j < flat.length; j += 2) decided.set(flat[j].split(":")[3], JSON.parse(flat[j + 1]) as Decision);
    const open = s.findingIds.filter((f) => !decided.has(f) || decided.get(f)!.state === "open").length;
    out.set(id, { versions: n, lastReviewedAt: s.savedAt, completion: s.completion, humanReview: s.humanReview, findings: s.findingIds.length, openDecisions: open, lastSnapshotHash: s.snapshotHash });
  });
  return out;
}

export async function historySummary(vid: string, id: string) {
  return (await caseSummaries(vid, [id])).get(id)!;
}
