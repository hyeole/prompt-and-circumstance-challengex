/**
 * Writes eval/migrations/2026-10-30-adjudication-claims-v2.json (claim v2, scoring policy v2.4). Nothing earlier is
 * changed: eval/adjudications.json and the v1 migration stay as they are.
 * - records: each ORIGINAL adjudication record with the v2 claims of the finding instances it was recorded on (same
 *   case, finding id, title and evidence key, in runs on disk). Identified only if those instances make exactly one
 *   claim and it is certain; otherwise the record is never inherited under v2 and every match needs a person.
 * - manual: v1 manual decisions carried forward only when the instances they were made on map to exactly one certain
 *   v2 claim; the rest are listed under needsReadjudication (not carried).
 * - Manual v2 decisions added later by adjudicate.ts --claim are kept.
 * Usage: npx tsx scripts/migrate-adjudication-claims-v2.ts
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { findingClaim, findingClaimV2, findingKey } from "./finding-key";
import type { ReviewResult } from "../lib/types";

const OUT = "eval/migrations/2026-10-30-adjudication-claims-v2.json";
const items = JSON.parse(readFileSync("eval/adjudications.json", "utf8")).items as { base: string; key: string; example: string }[];
const v1 = JSON.parse(readFileSync("eval/migrations/2026-10-30-adjudication-claims.json", "utf8")) as { manual: { base: string; key: string; claim: string; case?: string; verdict: string; note: string; example: string }[] };
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { manual: [] };
const baseOf = new Map<string, string>();
for (const d of ["eval/expected", "eval/fresh/expected", "eval/dev-synthetic/expected"]) for (const f of readdirSync(d)) {
  const e = JSON.parse(readFileSync(`${d}/${f}`, "utf8")); baseOf.set(e.id, e.base);
}
const byInstance = new Map<string, Set<string>>();
const byV1 = new Map<string, Set<string>>(); // base|key|v1claim|case -> v2 claims
const add = (m: Map<string, Set<string>>, k: string, v: string) => { if (!m.has(k)) m.set(k, new Set()); m.get(k)!.add(v); };
for (const run of readdirSync("eval/runs").filter((r) => existsSync(`eval/runs/${r}/raw`))) {
  for (const f of readdirSync(`eval/runs/${run}/raw`)) {
    const r = JSON.parse(readFileSync(`eval/runs/${run}/raw/${f}`, "utf8")) as ReviewResult;
    const base = baseOf.get(r.caseId) ?? r.caseId;
    for (const fd of r.findings) {
      const key = findingKey(r, fd), c2 = findingClaimV2(fd), c1 = findingClaim(fd);
      add(byInstance, `${r.caseId} ${fd.id} ${fd.title}|${key}`, c2);
      add(byV1, `${base}|${key}|${c1}|${r.caseId}`, c2);
      add(byV1, `${base}|${key}|${c1}|*`, c2);
    }
  }
}
const certainOne = (s?: Set<string>) => (s && s.size === 1 && ![...s][0].endsWith("UNCERTAIN") ? [...s][0] : null);
const records = items.map((it) => {
  const s = byInstance.get(`${it.example}|${it.key}`);
  const c = certainOne(s);
  return { base: it.base, key: it.key, example: it.example, claims: c ? [c] : [],
    status: c ? "claim identified" : !s ? "uncertain: adjudicated instance not found on disk" : s.size > 1 ? `uncertain: ${s.size} instances make different claims` : "uncertain: claim sources or topics not identifiable" };
});
const carried: unknown[] = [], needsReadjudication: unknown[] = [];
for (const m of v1.manual) {
  const c = certainOne(byV1.get(`${m.base}|${m.key}|${m.claim}|${m.case ?? "*"}`));
  if (c) carried.push({ ...m, claim: c, migratedFromV1Claim: m.claim });
  else needsReadjudication.push({ ...m, reason: "its instances do not map to exactly one certain v2 claim" });
}
const manualV2 = (prev.manual ?? []).filter((m: { migratedFromV1Claim?: string }) => !m.migratedFromV1Claim);
writeFileSync(OUT, JSON.stringify({
  about: "Claim-aware adjudication migration, claim v2 (scoring policy v2.4). Original records in eval/adjudications.json and the v1 migration are unchanged. A verdict is inherited only for an identical, certain v2 claim on the same base case and evidence key. Claims ending in UNCERTAIN are never inherited. 'manual' holds v1 manual decisions carried forward (migratedFromV1Claim) and decisions made under v2.",
  claimFunction: "scripts/finding-key.ts findingClaimV2 (kind, ordered values, per-clause source:polarity:topics, subject/event of evidence)",
  records, manual: [...carried, ...manualV2], needsReadjudication,
}, null, 2) + "\n");
const n = (p: string) => records.filter((r) => r.status.startsWith(p)).length;
console.log(`records ${records.length}: identified ${n("claim identified")}, uncertain ${records.length - n("claim identified")}; v1 manual carried ${carried.length}, needs re-adjudication ${needsReadjudication.length}; v2 manual ${manualV2.length}`);
