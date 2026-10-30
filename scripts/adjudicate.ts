/**
 * Record a manual adjudication of a non-planted finding (a person reads the source and decides).
 * Usage: npx tsx scripts/adjudicate.ts <run-dir> <case-id> <finding-id> <valid_observation|false_flag> "<reason>" [--claim]
 * --claim: record a manual adjudication for this finding's exact claim in the claim migration
 * (eval/migrations/2026-10-30-adjudication-claims.json) instead; the original records are never changed by it.
 * --case: with --claim, the record applies only to this case (a variant whose text differs from the base case).
 * Adjudications are stored per BASE case in eval/adjudications.json and reused across variants and runs.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ReviewResult } from "../lib/types";
import { findingClaim, findingKey } from "./finding-key";

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
  const mfile = "eval/migrations/2026-10-30-adjudication-claims.json";
  const m = JSON.parse(readFileSync(mfile, "utf8"));
  const key = findingKey(r, f), claim = findingClaim(f);
  const only = process.argv.includes("--case") ? id : undefined;
  m.manual = (m.manual ?? []).filter((x: { base: string; key: string; claim: string; case?: string }) => !(x.base === base && x.key === key && x.claim === claim && x.case === only));
  m.manual.push({ base, key, claim, ...(only ? { case: only } : {}), verdict, note, example: `${id} ${fid} ${f.title}`, run: run.split("/").pop(), date: new Date().toISOString().slice(0, 10) });
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
db.items = db.items.filter((x: { base: string; key: string }) => !(x.base === base && x.key === key));
db.items.push({ base, key, verdict, note, example: `${id} ${fid} ${f.title}`, date: new Date().toISOString().slice(0, 10) });
writeFileSync(file, JSON.stringify(db, null, 2) + "\n");
console.log(`${verdict}: ${base} ${key}`);
