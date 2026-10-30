/**
 * Record a manual adjudication of a non-planted finding (a person reads the source and decides).
 * Usage: npx tsx scripts/adjudicate.ts <run-dir> <case-id> <finding-id> <valid_observation|false_flag> "<reason>" [--claim]
 * --claim: record a manual adjudication for this finding's exact claim (claim v2) in the claim migration
 * (eval/migrations/2026-10-30-adjudication-claims-v2.json) instead; the original records are never changed by it.
 * The v1 migration is frozen. An UNCERTAIN claim is always recorded for this case and this explanation only.
 * --case: with --claim, the record applies only to this case (a variant whose text differs from the base case).
 * Without --claim, a NEW base+key record is added to eval/adjudications.json; an existing record is never replaced.
 * Adjudications are stored per BASE case in eval/adjudications.json and reused across variants and runs.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ReviewResult } from "../lib/types";
import { findingClaimV2, findingKey } from "./finding-key";

const [run, id, fid, verdict, note] = process.argv.slice(2);
if (!note || !["valid_observation", "false_flag"].includes(verdict)) throw new Error("usage: adjudicate.ts <run> <case> <finding-id> <valid_observation|false_flag> <reason>");
const r = JSON.parse(readFileSync(`${run}/raw/${id}.json`, "utf8")) as ReviewResult;
const f = r.findings.find((x) => x.id === fid);
if (!f) throw new Error(`${fid} not found in ${id}`);
let dataset = "eval";
try { dataset = JSON.parse(readFileSync(`${run}/run-info.json`, "utf8")).dataset ?? "eval"; } catch { /* legacy run */ }
const expDir = dataset === "eval" ? "eval/expected" : `${dataset}/expected`;
const base = (JSON.parse(readFileSync(`${expDir}/${id}.json`, "utf8")) as { base: string }).base;
if (process.argv.includes("--claim")) {
  const mfile = "eval/migrations/2026-10-30-adjudication-claims-v2.json";
  const m = JSON.parse(readFileSync(mfile, "utf8"));
  const key = findingKey(r, f), claim = findingClaimV2(f);
  const uncertain = claim.endsWith("UNCERTAIN");
  const only = process.argv.includes("--case") || uncertain ? id : undefined;
  const explanation = uncertain ? f.explanation : undefined;
  m.manual = (m.manual ?? []).filter((x: { base: string; key: string; claim: string; case?: string; explanation?: string }) => !(x.base === base && x.key === key && x.claim === claim && x.case === only && x.explanation === explanation));
  m.manual.push({ base, key, claim, ...(only ? { case: only } : {}), ...(explanation ? { explanation } : {}), verdict, note, example: `${id} ${fid} ${f.title}`, run: run.split("/").pop(), date: new Date().toISOString().slice(0, 10) });
  writeFileSync(mfile, JSON.stringify(m, null, 2) + "\n");
  console.log(`${verdict} (claim-specific): ${base} ${key}`);
  process.exit(0);
}
const file = "eval/adjudications.json";
const db = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {
  about: "Manual adjudication of findings that match no planted issue. Each was checked against the case text and source PDF page. Adjudicated by the team (prepared by Claude Code, to be confirmed by Harshal Yeole). Keyed by base case so the same finding is judged the same way in every variant and run.",
  items: [],
};
const key = findingKey(r, f);
const existing = db.items.find((x: { base: string; key: string }) => x.base === base && x.key === key);
if (existing) throw new Error(`An original record already exists for ${base} ${key} (${existing.verdict}). Original records are never replaced; use --claim for a claim-specific decision.`);
db.items.push({ base, key, verdict, note, example: `${id} ${fid} ${f.title}`, date: new Date().toISOString().slice(0, 10) });
writeFileSync(file, JSON.stringify(db, null, 2) + "\n");
console.log(`${verdict}: ${base} ${key}`);
