/**
 * Final evaluation summary across the three datasets from their scored summaries (default: claim-v2 layer).
 * Usage: npx tsx scripts/final-summary.ts <dev-run> <fresh-run> <legacy-run> [--default]
 * Prints markdown: detection, incorrect flags, raw counts, completion, routing, categories, identity documents,
 * latency, evidence matching vs support, and every missed plant with the review's outcome.
 */
import { readFileSync } from "node:fs";
const runs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const file = process.argv.includes("--default") ? "summary-v2.4.json" : "summary-v2.4-claims.json";
const fallback = process.argv.includes("--default") ? "summary.json" : file;
type Flag = { id: string; finding: string; status: string; note?: string };
type Row = { id: string; completed: boolean; ms: number; plants: { type: string; outcome: string; reason?: string }[]; flags: Flag[]; humanReview: boolean; routingExpected: boolean };
const load = (d: string) => { try { return JSON.parse(readFileSync(`${d}/${file}`, "utf8")); } catch { return JSON.parse(readFileSync(`${d}/${fallback}`, "utf8")); } };
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}% (${n}/${d})` : "n/a");
const cat = (f: Flag) => (/^[MU]-N1\b/.test(f.id) ? "identity documents" : f.finding.split(" ")[1]?.replace(":", "") ?? "?");
const all: Row[] = [];
console.log("| Dataset | Completion | Strict detection | Incorrect flags | False | Duplicates | Unadjudicated | Unnecessary routing | Should-not-flag violations | Latency p50 / p90 / max |");
console.log("|---|---|---|---|---|---|---|---|---|---|");
for (const d of runs) {
  const s = load(d); const rows = s.rows as Row[]; all.push(...rows);
  const plants = rows.flatMap((r) => r.plants); const det = plants.filter((p) => p.outcome === "detected").length;
  const flags = rows.flatMap((r) => r.flags); const nd = flags.filter((f) => f.status !== "duplicate");
  const bad = nd.filter((f) => f.status === "false_flag" || f.status === "unadjudicated").length;
  console.log(`| ${s.dataset ?? d} | ${s.completion} | ${pct(det, plants.length)} | ${pct(bad, nd.length)} | ${flags.filter((f) => f.status === "false_flag").length} | ${flags.filter((f) => f.status === "duplicate").length} | ${flags.filter((f) => f.status === "unadjudicated").length} | ${s.unnecessaryRouting} | ${s.shouldNotFlagViolations.length} | ${s.latency.p50} / ${s.latency.p90} / ${s.latency.max} |`);
}
const P = all.flatMap((r) => r.plants), F = all.flatMap((r) => r.flags), ND = F.filter((f) => f.status !== "duplicate");
console.log(`\n**Pooled:** strict detection ${pct(P.filter((p) => p.outcome === "detected").length, P.length)}; incorrect flags ${pct(ND.filter((f) => f.status === "false_flag" || f.status === "unadjudicated").length, ND.length)}; completion ${pct(all.filter((r) => r.completed).length, all.length)}.`);
console.log("\n**Detection by plant type (pooled):**\n\n| Plant type | Detected |\n|---|---|");
for (const t of [...new Set(P.map((p) => p.type + (p.reason ? `:${p.reason}` : "")))]) { const ps = all.flatMap((r) => r.plants).filter((p) => p.type + (p.reason ? `:${p.reason}` : "") === t); console.log(`| ${t} | ${pct(ps.filter((p) => p.outcome === "detected").length, ps.length)} |`); }
console.log("\n**Flags by finding category (pooled, excluding duplicates):**\n\n| Category | Flags | Incorrect | Valid observations | Planted |\n|---|---|---|---|---|");
for (const c of [...new Set(ND.map(cat))].sort()) { const fs = ND.filter((f) => cat(f) === c); console.log(`| ${c} | ${fs.length} | ${fs.filter((f) => f.status === "false_flag" || f.status === "unadjudicated").length} | ${fs.filter((f) => f.status === "valid_observation").length} | ${fs.filter((f) => f.status === "planted").length} |`); }
const nonId = ND.filter((f) => cat(f) !== "identity documents");
console.log(`\n**Incorrect flags excluding identity-document observations:** ${pct(nonId.filter((f) => f.status === "false_flag" || f.status === "unadjudicated").length, nonId.length)}.`);
console.log("\n**Missed or not-detected plants:**\n\n| Case | Plant | Outcome | Completed |\n|---|---|---|---|");
for (const r of all) for (const p of r.plants) if (p.outcome !== "detected") console.log(`| ${r.id} | ${p.type}${p.reason ? `:${p.reason}` : ""} | ${p.outcome} | ${r.completed} |`);
console.log("\n**Incorrect flags:**\n");
for (const r of all) for (const f of r.flags) if (f.status === "false_flag" || f.status === "unadjudicated") console.log(`- ${r.id} ${f.finding} [${f.status}]${f.note ? `: ${f.note.slice(0, 200)}` : ""}`);
