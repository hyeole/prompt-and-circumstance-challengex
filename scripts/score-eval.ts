/**
 * Score a run directory against eval/expected/ using the policy in eval/README.md ("Scoring policy v2").
 * Usage: npx tsx scripts/score-eval.ts eval/runs/<timestamp> [--list-unadjudicated]
 * Writes <run>/summary.json and <run>/REPORT.md (sanitized; safe to commit).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import type { CaseRecord, Finding, ReviewResult } from "../lib/types";
import { findingClaimV2, findingKey } from "./finding-key";
import { citesAnchor, isComplete, matches, type Plant } from "./score-match";

// v2.3 = v2.2 + a finding must identify the planted discrepancy; completion covers every required check.
// v2.4 = v2.3 + the discrepancy must be stated about the planted fact of the planted event (a clause that says that fact
// agrees, or a conflict about another fact or event, does not count); an ambiguity plant needs a review-marked finding
// about conflicting or unattributable accounts; the claim-aware layer uses claim v2 (per-clause source and polarity).
// Historical v2.3 outputs are kept; v2.4 rescoring is written beside them.
export const SCORING_POLICY = "v2.4";

type Expected = { id: string; base: string; split: string; description: string; plants: Plant[]; elementExpectations?: Record<string, string>; shouldNotFlag?: string[] };
type Adjudication = { base: string; key: string; verdict: "valid_observation" | "false_flag"; note: string };

const dir = process.argv[2];
if (!dir) throw new Error("usage: score-eval.ts eval/runs/<timestamp>");
const listUnadjudicated = process.argv.includes("--list-unadjudicated");
let info0: { dataset?: string } = {};
try { info0 = JSON.parse(readFileSync(`${dir}/run-info.json`, "utf8")); } catch { /* older runs: legacy dataset */ }
const dataset = (process.argv.includes("--dataset") ? process.argv[process.argv.indexOf("--dataset") + 1] : info0.dataset) ?? "eval";
const expectedDir = dataset === "eval" ? "eval/expected" : `${dataset}/expected`;
const casesDir = dataset === "eval" ? "eval/cases" : `${dataset}/cases`;
const expected = readdirSync(expectedDir).map((f) => JSON.parse(readFileSync(`${expectedDir}/${f}`, "utf8")) as Expected);
const latency = JSON.parse(readFileSync(`${dir}/latency.json`, "utf8")) as { id: string; ms: number; ok: boolean; modelStatus?: string }[];
const adjudications: Adjudication[] = existsSync("eval/adjudications.json") ? JSON.parse(readFileSync("eval/adjudications.json", "utf8")).items : [];
// Optional claim-aware layer (--adjudication-claims). The original adjudication records are not changed: the claim of
// each record, and the manual adjudications made for claims that differ, live in a separate migration file. With the
// layer on, a verdict is inherited only when base case, evidence key AND claim are identical; anything else is left
// unadjudicated for a person. Results are written beside the default ones (suffix "-claims"), never over them.
const CLAIMS = process.argv.includes("--adjudication-claims");
type ClaimMigration = { records: { base: string; key: string; example: string; claims: string[] }[]; manual: (Adjudication & { claim: string; example: string; case?: string; explanation?: string })[] };
const MIGRATION = "eval/migrations/2026-10-30-adjudication-claims-v2.json";
const migration: ClaimMigration | null = CLAIMS ? JSON.parse(readFileSync(MIGRATION, "utf8")) : null;
// A case-specific manual record (a variant whose text differs from the case the original verdict was made on) takes
// precedence over records that apply to every variant of the base case.
function adjudicationFor(base: string, key: string, claim: string, caseId: string, explanation: string): Adjudication | undefined {
  if (!migration) return adjudications.find((a) => a.base === base && a.key === key);
  // An UNCERTAIN claim identifies too little to be shared: its manual decision applies only to the same case and the
  // same explanation text, and it is never inherited from an original record.
  if (claim.endsWith("UNCERTAIN")) return migration.manual.find((m) => m.case === caseId && m.base === base && m.key === key && m.claim === claim && m.explanation === explanation);
  const manual = migration.manual.find((m) => m.case === caseId && m.base === base && m.key === key && m.claim === claim)
    ?? migration.manual.find((m) => !m.case && m.base === base && m.key === key && m.claim === claim);
  if (manual) return manual;
  return adjudications.find((a) => a.base === base && a.key === key &&
    migration.records.some((m) => m.base === base && m.key === key && m.example === (a as { example?: string }).example && m.claims.includes(claim)));
}
const load = (id: string) => (existsSync(`${dir}/raw/${id}.json`) ? (JSON.parse(readFileSync(`${dir}/raw/${id}.json`, "utf8")) as ReviewResult) : null);
const caseOf = (id: string) => JSON.parse(readFileSync(`${casesDir}/${id}.json`, "utf8")) as CaseRecord;

type Outcome = "detected" | "routed_only" | "missed" | "not_completed";
/** Strict outcome per plant. Failed or partial model reviews earn credit only for what the rules decide alone. */
function outcome(r: ReviewResult | null, p: Plant): Outcome {
  if (!r) return "not_completed";
  if (!isComplete(r)) {
    // Partial review (any required check failed): only findings produced by deterministic rules can earn credit.
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
    id: ex.id, split: ex.split, base: ex.base, ms: lat.ms, completed: r ? isComplete(r) : false, modelStatus: r?.modelStatus ?? "no_result",
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
      const adj = adjudicationFor(ex.base, key, findingClaimV2(f), ex.id, f.explanation);
      row.flags.push({ id: f.id, finding: label, key, status: adj ? adj.verdict : "unadjudicated", note: adj?.note });
    }
  }
  rows.push(row);
}

// Checklist expectations (dev-synthetic and later datasets): expected status per item, reported apart from recall.
const elementChecks: { id: string; elementId: string; expected: string; actual: string }[] = [];
const shouldNotFlagViolations: { id: string; anchor: string; finding: string }[] = [];
for (const ex of expected) {
  const r = load(ex.id);
  if (!r || !isComplete(r)) continue;
  for (const [elementId, want] of Object.entries(ex.elementExpectations ?? {}))
    elementChecks.push({ id: ex.id, elementId, expected: want, actual: r.elements.find((e) => e.elementId === elementId)?.status ?? "missing" });
  for (const anchor of ex.shouldNotFlag ?? [])
    for (const f of r.findings)
      if ((f.category === "inconsistency" || f.category === "unclear") && citesAnchor(r, f, [anchor])) shouldNotFlagViolations.push({ id: ex.id, anchor, finding: `${f.id} ${f.title}` });
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
// Routing on a case with no planted reason is "justified" when it rests on an adjudicated valid observation
// (a real discrepancy in the source record), and "unnecessary" otherwise.
const noRouteCases = rows.filter((r) => !r.routingExpected);
const justified = (r: Row) => r.flags.some((f) => f.status === "valid_observation");
const outcomeCounts = (["detected", "routed_only", "missed", "not_completed"] as Outcome[]).map((o) => `${o}: ${plantsOf(rows).filter((p) => p.outcome === o).length}`).join(", ");
let info: Record<string, unknown> = {};
try { info = JSON.parse(readFileSync(`${dir}/run-info.json`, "utf8")); } catch { /* older runs: see eval/RUNS.md */ }

const summary = {
  run: dir, scoringPolicy: SCORING_POLICY, adjudicationLayer: CLAIMS ? `claims v2 (${MIGRATION})` : "key only", runInfo: info, cases: rows.length,
  completion: pct(rows.filter((r) => r.completed).length, rows.length),
  partialReviews: rows.filter((r) => !r.completed).map((r) => {
    const res = load(r.id);
    return { id: r.id, modelStatus: r.modelStatus, seconds: +(r.ms / 1000).toFixed(1), calls: res?.calls?.map((c) => `${c.role}:${c.status}`).join(" ") ?? "n/a",
      plants: r.plants.map((p) => `${p.type}=${p.outcome}`).join(", ") || "none" };
  }),
  recallCompletedOnly: (() => {
    const done = rows.filter((r) => r.completed);
    return { value: recall(done), note: "Secondary figure: planted issues in reviews whose model check completed. The headline recall counts failed reviews as missed." };
  })(),
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
  unnecessaryRouting: pct(noRouteCases.filter((r) => r.humanReview && !justified(r)).length, noRouteCases.length),
  routingJustifiedByObservation: noRouteCases.filter((r) => r.humanReview && justified(r)).map((r) => r.id),
  dataset,
  checklistExpectations: { accuracy: pct(elementChecks.filter((c) => c.expected === c.actual).length, elementChecks.length), mismatches: elementChecks.filter((c) => c.expected !== c.actual) },
  shouldNotFlagViolations,
  evidenceValidity: pct(rows.reduce((a, r) => a + r.evidenceOk, 0), rows.reduce((a, r) => a + r.evidenceTotal, 0)),
  evidenceMatch: (() => {
    const evs = rows.flatMap((r) => { const res = load(r.id); return res ? res.findings.flatMap((f) => f.evidence.filter((e) => e.kind === "sentence")) : []; });
    return { exact: evs.filter((e) => e.match === "exact").length, partial: evs.filter((e) => e.match === "partial").length, unlabelled: evs.filter((e) => !e.match).length,
      note: "unlabelled = runs before the exact-match fix (or rule-made evidence); those quotes are only known to equal the source text at their offsets" };
  })(),
  latency: { p50: q(0.5), p90: q(0.9), max: q(0.999), over60s: latency.filter((l) => l.ms > 60_000).length, httpFailures: latency.filter((l) => !l.ok).length },
  rows,
};
// A run already scored under another policy keeps its original files; the rescoring is written beside them.
let prevPolicy: string | undefined;
try { prevPolicy = JSON.parse(readFileSync(`${dir}/summary.json`, "utf8")).scoringPolicy; } catch { /* first scoring */ }
const suffix = CLAIMS ? `-${SCORING_POLICY}-claims` : prevPolicy && prevPolicy !== SCORING_POLICY ? `-${SCORING_POLICY}` : "";
writeFileSync(`${dir}/summary${suffix}.json`, JSON.stringify(summary, null, 2));

const md = `# Evaluation run ${dir.split("/").pop()} (scoring policy ${SCORING_POLICY}${CLAIMS ? " + claim-aware adjudication layer" : ""}, dataset ${dataset})

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
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | ${summary.unnecessaryRouting} | |
| Routed because of an adjudicated real discrepancy in the source | ${summary.routingJustifiedByObservation.join(", ") || "none"} | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | ${summary.checklistExpectations.accuracy} | |
| "Should not flag" violations (resolved explanations, unattributable statements) | ${summary.shouldNotFlagViolations.length} | 0 |
| Evidence references valid (quote = source text at offsets) | ${summary.evidenceValidity} | every flag |
| Sentence evidence by match type | exact ${summary.evidenceMatch.exact} · partial ${summary.evidenceMatch.partial} · unlabelled ${summary.evidenceMatch.unlabelled} | |
| Latency p50 / p90 / max (full HTTP review) | ${summary.latency.p50} / ${summary.latency.p90} / ${summary.latency.max} | under 60s |

Plant outcomes: ${outcomeCounts}.

**Partial reviews (a required check did not complete): ${summary.partialReviews.length}.** ${summary.partialReviews.map((p) => `${p.id} (${p.modelStatus}, ${p.seconds}s; ${p.calls}; plants: ${p.plants})`).join("; ") || "none"}.
Recall over completed reviews only (secondary): ${summary.recallCompletedOnly.value}. "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: ${flags.length} = ${flagCount("planted")} planted + ${flagCount("duplicate")} duplicates + ${flagCount("valid_observation")} adjudicated valid observations + ${flagCount("false_flag")} adjudicated false flags + ${flagCount("unadjudicated")} unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.id} | ${r.split} | ${(r.ms / 1000).toFixed(1)}s | ${r.completed ? "yes" : r.modelStatus} | ${r.plants.map((p) => `${p.type} (${p.outcome})`).join(", ") || "none"} | ${r.humanReview ? "yes" : "no"}${!r.routingExpected && r.humanReview ? " (not expected)" : ""} | ${r.flags.filter((f) => f.status !== "planted").map((f) => `${f.finding} [${f.status}]`).join("; ")} |`).join("\n")}
`;
writeFileSync(`${dir}/REPORT${suffix}.md`, md);
if (suffix) console.log(`Rescored under ${SCORING_POLICY}; original ${prevPolicy} files kept.`);
console.log(md.split("## Per case")[0]);
if (listUnadjudicated)
  for (const r of rows) for (const f of r.flags) if (f.status === "unadjudicated") console.log(`UNADJ ${r.base} ${r.id} ${f.finding}\n   key=${f.key}`);
