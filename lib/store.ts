// Local workspace store: user-created cases, immutable review versions, and officer decisions.
// Plain JSON files under data/local/ (git-ignored, excluded from sharing ZIPs). Single-user, on this computer only.
import "server-only";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CaseRecord, ReviewResult } from "./types";
import { sha } from "./text";

const ROOT = process.env.NC_STORE_DIR ?? path.join(process.cwd(), "data", "local");
const DIRS = { cases: path.join(ROOT, "cases"), history: path.join(ROOT, "history"), uploads: path.join(ROOT, "uploads") };

export const ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;
export function assertId(id: string) {
  if (!ID_RE.test(id)) throw new Error("Invalid case id.");
  return id;
}

function writeJSON(file: string, value: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2));
  renameSync(tmp, file); // atomic replace
}
const readJSON = <T>(file: string): T | null => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : null);

// ---------- user cases

export function listUserCases(): CaseRecord[] {
  if (!existsSync(DIRS.cases)) return [];
  return readdirSync(DIRS.cases).filter((f) => f.endsWith(".json")).sort().map((f) => readJSON<CaseRecord>(path.join(DIRS.cases, f))!).filter(Boolean);
}

export function getUserCase(id: string) {
  return readJSON<CaseRecord>(path.join(DIRS.cases, `${assertId(id)}.json`));
}

export function newUserCaseId() {
  const n = existsSync(DIRS.cases) ? readdirSync(DIRS.cases).length : 0;
  return `U${String(n + 1).padStart(3, "0")}-${Date.now().toString(36).slice(-4)}`;
}

export function saveUserCase(c: CaseRecord) {
  writeJSON(path.join(DIRS.cases, `${assertId(c.id)}.json`), c);
}

// ---------- uploads (source PDFs)

export function savePdf(id: string, data: Buffer) {
  if (data.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("The file is not a PDF.");
  const file = path.join(DIRS.uploads, `${assertId(id)}.pdf`);
  mkdirSync(DIRS.uploads, { recursive: true });
  writeFileSync(file, data);
  return file;
}
export const uploadedPdfPath = (id: string) => {
  const f = path.join(DIRS.uploads, `${assertId(id)}.pdf`);
  return existsSync(f) ? f : null;
};

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

export const snapshotHash = (s: Snapshot) => sha(JSON.stringify([s.narrative.text, s.facts, s.selectedCharges]));

export function getHistory(id: string): CaseHistory {
  return readJSON<CaseHistory>(path.join(DIRS.history, `${assertId(id)}.json`)) ?? { caseId: id, versions: [], decisions: {} };
}

/** Append a reviewed version. Earlier versions are never modified. Returns the new version number. */
export function appendVersion(id: string, snapshot: Snapshot, review: ReviewResult): number {
  if (review.narrativeHash !== sha(snapshot.narrative.text)) throw new Error("Review does not match the reviewed narrative.");
  const h = getHistory(id);
  const version = h.versions.length + 1;
  h.versions.push({
    version, savedAt: new Date().toISOString(), snapshotHash: snapshotHash(snapshot),
    snapshot: structuredClone(snapshot), review, completion: review.modelStatus === "ok" ? "complete" : "partial",
  });
  writeJSON(path.join(DIRS.history, `${assertId(id)}.json`), h);
  return version;
}

export function setDecision(id: string, reviewId: string, findingId: string, d: Omit<Decision, "decidedAt">) {
  const h = getHistory(id);
  const v = h.versions.find((x) => x.review.reviewId === reviewId);
  if (!v) throw new Error("Unknown review.");
  if (!v.review.findings.some((f) => f.id === findingId)) throw new Error("Unknown finding.");
  h.decisions[reviewId] ??= {};
  h.decisions[reviewId][findingId] = { state: d.state, note: d.note?.slice(0, 1000) || undefined, decidedAt: new Date().toISOString() };
  writeJSON(path.join(DIRS.history, `${assertId(id)}.json`), h);
  return h.decisions[reviewId][findingId];
}

/** Compact per-case status for the case list. */
export function historySummary(id: string) {
  const h = getHistory(id);
  const last = h.versions.at(-1);
  return last
    ? { versions: h.versions.length, lastReviewedAt: last.savedAt, completion: last.completion, humanReview: last.review.humanReview.required, findings: last.review.findings.length, lastSnapshotHash: last.snapshotHash }
    : { versions: 0 };
}
