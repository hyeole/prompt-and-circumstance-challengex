/**
 * Writes eval/migrations/2026-10-30-adjudication-claims.json from the ORIGINAL adjudication records (left unchanged).
 * For each record, find the finding instances it was recorded on (same case, finding id, title and evidence key) in the
 * runs on disk, and record their claim (scripts/finding-key.ts findingClaim). If those instances do not all make the
 * same claim, the instance the adjudicator saw cannot be identified: the record gets no claim, so under the
 * claim-aware layer every match needs manual adjudication. Manual adjudications already in the migration are kept.
 * Usage: npx tsx scripts/migrate-adjudication-claims.ts
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { findingClaim, findingKey } from "./finding-key";
import type { ReviewResult } from "../lib/types";

const OUT = "eval/migrations/2026-10-30-adjudication-claims.json";
const items = JSON.parse(readFileSync("eval/adjudications.json", "utf8")).items as { base: string; key: string; example: string }[];
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { manual: [] };
const seen = new Map<string, Set<string>>();
for (const run of readdirSync("eval/runs").filter((r) => existsSync(`eval/runs/${r}/raw`))) {
  for (const f of readdirSync(`eval/runs/${run}/raw`)) {
    const r = JSON.parse(readFileSync(`eval/runs/${run}/raw/${f}`, "utf8")) as ReviewResult;
    for (const fd of r.findings) {
      const id = `${r.caseId} ${fd.id} ${fd.title}|${findingKey(r, fd)}`;
      if (!seen.has(id)) seen.set(id, new Set());
      seen.get(id)!.add(findingClaim(fd));
    }
  }
}
const records = items.map((it) => {
  const claims = [...(seen.get(`${it.example}|${it.key}`) ?? [])];
  return { base: it.base, key: it.key, example: it.example, claims: claims.length === 1 ? claims : [],
    status: claims.length === 1 ? "claim identified" : claims.length === 0 ? "uncertain: adjudicated instance not found on disk" : `uncertain: ${claims.length} instances make different claims` };
});
writeFileSync(OUT, JSON.stringify({
  about: "Claim-aware adjudication migration (2026-10-30). The original records in eval/adjudications.json are unchanged. Each record's claim is the claim of the finding it was recorded on; a record with no identified claim is never inherited under the claim-aware layer. 'manual' holds adjudications made by a person for findings whose claim differs from every original record. Used only with score-eval --adjudication-claims; results are written to separate files.",
  claimFunction: "scripts/finding-key.ts findingClaim (kind, ordered values, direction, negation, subject/event of evidence)",
  records, manual: prev.manual ?? [],
}, null, 2) + "\n");
const c = (s: string) => records.filter((r) => r.status.startsWith(s)).length;
console.log(`records ${records.length}: identified ${c("claim identified")}, uncertain ${records.length - c("claim identified")}; manual ${(prev.manual ?? []).length}`);
