/**
 * Score a run directory against eval/expected/ using the policy in eval/README.md ("Scoring policy v2").
 * Usage: npx tsx scripts/score-eval.ts eval/runs/<timestamp> [--list-unadjudicated]
 * Writes <run>/summary.json and <run>/REPORT.md (sanitized; safe to commit).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import type { CaseRecord, Finding, ReviewResult } from "../lib/types";
import { findingKey } from "./finding-key";

export const SCORING_POLICY = "v2.1";

type Plant =
  | { type: "missing_element"; elementId: string }
  | { type: "inconsistency"; anchors: string[]; fieldPaths: string[] }
  | { type: "citation" }
  | { type: "human_review"; reason: "multi_charge" | "ambiguity"; anchors?: string[] };
type Expected = { id: string; base: string; split: string; description: string; plants: Plant[] };
type Adjudication = { base: string; key: string; verdict: "valid_observation" | "false_flag"; note: string };

const dir = process.argv[2];
if (!dir) throw new Error("usage: score-eval.ts eval/runs/<timestamp>");
const listUnadjudicated = process.argv.includes("--list-unadjudicated");
const expected = readdirSync("eval/expected").map((f) => JSON.parse(readFileSync(`eval/expected/${f}`, "utf8")) as Expected);
const latency = JSON.parse(readFileSync(`${dir}/latency.json`, "utf8")) as { id: string; ms: number; ok: boolean; modelStatus?: string }[];
const adjudications: Adjudication[] = existsSync("eval/adjudications.json") ? JSON.parse(readFileSync("eval/adjudications.json", "utf8")).items : [];
const load = (id: string) => (existsSync(`${dir}/raw/${id}.json`) ? (JSON.parse(readFileSync(`${dir}/raw/${id}.json`, "utf8")) as ReviewResult) : null);
const caseOf = (id: string) => JSON.parse(readFileSync(`eval/cases/${id}.json`, "utf8")) as CaseRecord;
const low = (s: string) => s.toLowerCase();

const sentenceText = (r: ReviewResult, id?: string) => low(r.sentences.find((s) => s.id === id)?.text ?? "");
const citesAnchor = (r: ReviewResult, f: Finding, anchors: string[]) =>
  f.evidence.some((e) => e.kind === "sentence" && anchors.some((a) => sentenceText(r, e.sentenceId).includes(low(a))));

/** Does this finding specifically address this plant? */
function matches(r: ReviewResult, f: Finding, p: Plant): boolean {
  switch (p.type) {
    case "missing_element": return (f.category === "missing_element" || f.category === "unclear") && f.referenceIds.includes(p.elementId);
    case "inconsistency": return (f.category === "inconsistency" || f.category === "unclear") &&
      (citesAnchor(r, f, p.anchors) || f.evidence.some((e) => e.kind === "field" && p.fieldPaths.includes(e.fieldPath!)));
    case "citation": return f.category === "citation";
    case "human_review": return p.reason === "multi_charge" ? f.id === "R-MULTI-CHARGE" : f.needsHumanReview && citesAnchor(r, f, p.anchors ?? []);
  }
}

type Outcome = "detected" | "routed_only" | "missed" | "not_completed";
/** Strict outcome per plant. Failed or partial model reviews earn credit only for what the rules decide alone. */
function outcome(r: ReviewResult | null, p: Plant): Outcome {
  if (!r) return "not_completed";
  if (r.modelStatus !== "ok") {
    // Failed or partial model check: only findings produced by deterministic rules can earn credit.
    const ruleHit = r.findings.some((f) => f.source === "rule" && matches(r, f, p));
    return ruleHit ? "detected" : "not_completed";
  }
  switch (p.type) {
    case "missing_element": {
      const st = r.elements.find((e) => e.elementId === p.elementId)?.status;
      return st === "absent" || r.findings.some((f) => matches(r, f, p)) ? "detected" : st === "unclear" ? "routed_only" : "missed";
    }
    case "inconsistency": return r.findings.some((f) => matches(r, f, p)) ? "detected" : "missed";
    case "citation":
      if (r.citation.status === "likely_mismatch" && r.citation.evidence.length > 0) return "detected";
      return r.citation.status === "needs_human_review" ? "routed_only" : "missed";
    case "human_review":
      if (!r.humanReview.required) return "missed";
      return r.findings.some((f) => matches(r, f, p)) ? "detected" : "routed_only";
  }
}

function evidenceValid(c: CaseRecord, f: Finding) {
  return f.evidence.length > 0 && f.evidence.every((e) => {
    if (e.kind === "missing") return !!e.elementId;
    if (e.kind === "field") return c.facts.some((x) => x.path === e.fieldPath) || e.fieldPath === "selectedCharges";
    return e.start != null && e.end != null && c.narrative.text.slice(e.start, e.end) === e.quote;
  });
}

type FlagRow = { id: string; finding: string; key: string; status: "planted" | "duplicate" | "valid_observation" | "false_flag" | "unadjudicated"; note?: string };
type Row = {
  id: string; split: string; base: string; ms: number; completed: boolean; modelStatus: string;
  plants: { type: string; outcome: Outcome }[]; flags: FlagRow[]; citation: string; humanReview: boolean; routingExpected: boolean; evidenceOk: number; evidenceTotal: number;
};

const rows: Row[] = [];
for (const ex of expected.sort((a, b) => a.id.localeCompare(b.id))) {
  const lat = latency.find((l) => l.id === ex.id);
  if (!lat) continue;
  const r = load(ex.id);
  const c = caseOf(ex.id);
  const routingExpected = ex.plants.some((p) => p.type === "human_review" || p.type === "inconsistency" || p.type === "citation");
  const row: Row = {
    id: ex.id, split: ex.split, base: ex.base, ms: lat.ms, completed: r?.modelStatus === "ok", modelStatus: r?.modelStatus ?? "no_result",
    plants: ex.plants.map((p) => ({ type: p.type === "human_review" ? `human_review:${p.reason}` : p.type, outcome: outcome(r, p) })),
    flags: [], citation: r?.citation.status ?? "n/a", humanReview: r?.humanReview.required ?? false, routingExpected, evidenceOk: 0, evidenceTotal: 0,
  };
  if (r) {
    const used = new Set<number>();
    for (const f of r.findings) {
      row.evidenceTotal++;
      if (evidenceValid(c, f)) row.evidenceOk++;
      const key = findingKey(r, f);
      const label = `${f.id} ${f.category}: ${f.title}`;
      const pi = ex.plants.findIndex((p) => matches(r, f, p));
      if (pi >= 0) { row.flags.push({ id: f.id, finding: label, key, status: used.has(pi) ? "duplicate" : "planted" }); used.add(pi); continue; }
      const adj = adjudications.find((a) => a.base === ex.base && a.key === key);
      row.flags.push({ id: f.id, finding: label, key, status: adj ? adj.verdict : "unadjudicated", note: adj?.note });
    }
  }
  rows.push(row);
}

const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(0)}% (${a}/${b})` : "n/a");
const plantsOf = (rs: Row[], t?: string) => rs.flatMap((r) => r.plants).filter((p) => !t || p.type.startsWith(t));
const det = (ps: { outcome: Outcome }[]) => ps.filter((p) => p.outcome === "detected").length;
const recall = (rs: Row[], t?: string) => pct(det(plantsOf(rs, t)), plantsOf(rs, t).length);
const flags = rows.flatMap((r) => r.flags);
const flagCount = (s: FlagRow["status"]) => flags.filter((f) => f.status === s).length;
const nonDup = flags.filter((f) => f.status !== "duplicate").length;
const ms = latency.map((l) => l.ms).sort((a, b) => a - b);
const q = (p: number) => (ms.length ? (ms[Math.min(ms.length - 1, Math.floor(p * ms.length))] / 1000).toFixed(1) + "s" : "n/a");
const noRouteCases = rows.filter((r) => !r.routingExpected);
const outcomeCounts = (["detected", "routed_only", "missed", "not_completed"] as Outcome[]).map((o) => `${o}: ${plantsOf(rows).filter((p) => p.outcome === o).length}`).join(", ");
let info: Record<string, unknown> = {};
try { info = JSON.parse(readFileSync(`${dir}/run-info.json`, "utf8")); } catch { /* older runs: see eval/RUNS.md */ }

const summary = {
  run: dir, scoringPolicy: SCORING_POLICY, runInfo: info, cases: rows.length,
  completion: pct(rows.filter((r) => r.completed).length, rows.length),
  recall: {
    all: recall(rows), dev: recall(rows.filter((r) => r.split === "dev")), heldout: recall(rows.filter((r) => r.split === "heldout")),
    missing_element: recall(rows, "missing_element"), inconsistency: recall(rows, "inconsistency"), citation: recall(rows, "citation"),
    routing_multi_charge: recall(rows, "human_review:multi_charge"), routing_ambiguity: recall(rows, "human_review:ambiguity"),
    outcomes: outcomeCounts,
  },
  flags: {
    issued: flags.length, planted: flagCount("planted"), duplicates: flagCount("duplicate"),
    validObservations: flagCount("valid_observation"), falseFlags: flagCount("false_flag"), unadjudicated: flagCount("unadjudicated"),
    incorrectProportion: pct(flagCount("false_flag") + flagCount("unadjudicated"), nonDup),
    incorrectProportionNote: "False flags plus unadjudicated flags, over all issued flags except duplicates. Base cases included.",
  },
  unnecessaryRouting: pct(noRouteCases.filter((r) => r.humanReview).length, noRouteCases.length),
  evidenceValidity: pct(rows.reduce((a, r) => a + r.evidenceOk, 0), rows.reduce((a, r) => a + r.evidenceTotal, 0)),
  evidenceMatch: (() => {
    const evs = rows.flatMap((r) => { const res = load(r.id); return res ? res.findings.flatMap((f) => f.evidence.filter((e) => e.kind === "sentence")) : []; });
    return { exact: evs.filter((e) => e.match === "exact").length, partial: evs.filter((e) => e.match === "partial").length, unlabelled: evs.filter((e) => !e.match).length,
      note: "unlabelled = runs before the exact-match fix (or rule-made evidence); those quotes are only known to equal the source text at their offsets" };
  })(),
  latency: { p50: q(0.5), p90: q(0.9), max: q(0.999), over60s: latency.filter((l) => l.ms > 60_000).length, httpFailures: latency.filter((l) => !l.ok).length },
  rows,
};
writeFileSync(`${dir}/summary.json`, JSON.stringify(summary, null, 2));

const md = `# Evaluation run ${dir.split("/").pop()} (scoring policy ${SCORING_POLICY})

**Label: ${(info.label as string) ?? "see eval/RUNS.md"}.** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | ${summary.completion} | |
| Detection recall, strict (failures count as missed) | ${summary.recall.all} | at least 90% |
| Missing elements | ${summary.recall.missing_element} | |
| Inconsistencies | ${summary.recall.inconsistency} | |
| Citation errors (mismatch with verified evidence) | ${summary.recall.citation} | |
| Routing: multi-charge (rule fired) | ${summary.recall.routing_multi_charge} | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | ${summary.recall.routing_ambiguity} | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | ${summary.flags.incorrectProportion} | at most 10% |
| Unnecessary human-review routing (cases with nothing that calls for review) | ${summary.unnecessaryRouting} | |
| Evidence references valid (quote = source text at offsets) | ${summary.evidenceValidity} | every flag |
| Sentence evidence by match type | exact ${summary.evidenceMatch.exact} · partial ${summary.evidenceMatch.partial} · unlabelled ${summary.evidenceMatch.unlabelled} | |
| Latency p50 / p90 / max (full HTTP review) | ${summary.latency.p50} / ${summary.latency.p90} / ${summary.latency.max} | under 60s |

Plant outcomes: ${outcomeCounts}. "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: ${flags.length} = ${flagCount("planted")} planted + ${flagCount("duplicate")} duplicates + ${flagCount("valid_observation")} adjudicated valid observations + ${flagCount("false_flag")} adjudicated false flags + ${flagCount("unadjudicated")} unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.id} | ${r.split} | ${(r.ms / 1000).toFixed(1)}s | ${r.completed ? "yes" : r.modelStatus} | ${r.plants.map((p) => `${p.type} (${p.outcome})`).join(", ") || "none"} | ${r.humanReview ? "yes" : "no"}${!r.routingExpected && r.humanReview ? " (not expected)" : ""} | ${r.flags.filter((f) => f.status !== "planted").map((f) => `${f.finding} [${f.status}]`).join("; ")} |`).join("\n")}
`;
writeFileSync(`${dir}/REPORT.md`, md);
console.log(md.split("## Per case")[0]);
if (listUnadjudicated)
  for (const r of rows) for (const f of r.flags) if (f.status === "unadjudicated") console.log(`UNADJ ${r.base} ${r.id} ${f.finding}\n   key=${f.key}`);
