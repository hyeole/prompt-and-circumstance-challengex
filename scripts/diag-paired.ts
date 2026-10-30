// Paired per-case comparison of two scored runs on the same cases (claim layer by default).
// Usage: npx tsx scripts/diag-paired.ts <checkpointRunDir> <newRunDir> [--default]
import { existsSync, readFileSync } from "node:fs";

const [a, b] = process.argv.slice(2);
const file = process.argv.includes("--default") ? "summary.json" : "summary-v2.3-claims.json";
type Row = { id: string; completed: boolean; plants: { outcome: string }[]; flags: { id: string; status: string }[]; citation: string; humanReview: boolean; routingExpected: boolean };
const rows = (d: string) => new Map((JSON.parse(readFileSync(`${d}/${file}`, "utf8")).rows as Row[]).map((r) => [r.id, r]));
const accounts = (d: string, id: string) => {
  const p = `${d}/raw/${id}.json`;
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")).humanReview.accounts ?? []).map((g: { fieldPath?: string; sentenceIds: string[] }) => `${g.fieldPath ?? "-"}:${g.sentenceIds.join("+")}`).join(" ") || "none" : "?";
};
const A = rows(a), B = rows(b);
const flagStr = (r: Row) => r.flags.map((f) => `${f.id}=${f.status.replace("valid_observation", "valid").replace("false_flag", "FALSE").replace("planted", "plant")}`).join(", ") || "none";
console.log(`| Case | Plants (checkpoint → new) | Flags checkpoint | Flags new | Citation | Routed (expected) | Accounts checkpoint → new | Completed | Change |`);
console.log(`|---|---|---|---|---|---|---|---|---|`);
for (const [id, n] of B) {
  const o = A.get(id);
  if (!o) { console.log(`| ${id} | not in checkpoint | | | | | | | |`); continue; }
  const po = o.plants.map((p) => p.outcome).join("+") || "—", pn = n.plants.map((p) => p.outcome).join("+") || "—";
  const fo = o.flags.filter((f) => f.status === "false_flag").length, fn = n.flags.filter((f) => f.status === "false_flag").length;
  const det = (r: Row) => r.plants.filter((p) => p.outcome === "detected").length;
  const unn = (r: Row) => r.humanReview && !r.routingExpected;
  const ch: string[] = [];
  if (det(n) < det(o)) ch.push("**REGRESSION: detection lost**");
  if (det(n) > det(o)) ch.push("detection gained");
  if (fn > fo) ch.push("**REGRESSION: more false flags**");
  if (fn < fo) ch.push("fewer false flags");
  if (unn(n) && !unn(o)) ch.push("**REGRESSION: new unnecessary routing**");
  if (!unn(n) && unn(o)) ch.push("unnecessary routing removed");
  if (n.completed !== o.completed) ch.push(n.completed ? "now complete" : "**REGRESSION: partial**");
  if (o.citation !== n.citation) ch.push(`citation ${o.citation} → ${n.citation}`);
  console.log(`| ${id} | ${po} → ${pn} | ${flagStr(o)} | ${flagStr(n)} | ${o.citation} → ${n.citation} | ${o.humanReview} → ${n.humanReview} (${n.routingExpected}) | ${accounts(a, id)} → ${accounts(b, id)} | ${o.completed} → ${n.completed} | ${ch.join("; ") || "same"} |`);
}
