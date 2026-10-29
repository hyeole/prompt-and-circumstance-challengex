/**
 * Score a run directory against eval/expected/. See eval/README.md for the matching policy.
 * Usage: npx tsx scripts/score-eval.ts eval/runs/<timestamp>
 * Writes <run>/summary.json and <run>/REPORT.md (sanitized; safe to commit).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import type { CaseRecord, Finding, ReviewResult } from "../lib/types";

type Plant = { type: "missing_element"; elementId: string } | { type: "inconsistency"; anchors: string[]; fieldPaths: string[] } | { type: "citation" } | { type: "human_review" };
type Expected = { id: string; base: string; split: string; description: string; plants: Plant[] };

const dir = process.argv[2];
if (!dir) throw new Error("usage: score-eval.ts eval/runs/<timestamp>");
const expected = readdirSync("eval/expected").map((f) => JSON.parse(readFileSync(`eval/expected/${f}`, "utf8")) as Expected);
const latency = JSON.parse(readFileSync(`${dir}/latency.json`, "utf8")) as { id: string; ms: number; ok: boolean; modelStatus?: string }[];
const load = (id: string) => (existsSync(`${dir}/raw/${id}.json`) ? (JSON.parse(readFileSync(`${dir}/raw/${id}.json`, "utf8")) as ReviewResult) : null);
const caseOf = (id: string) => JSON.parse(readFileSync(`eval/cases/${id}.json`, "utf8")) as CaseRecord;

const low = (s: string) => s.toLowerCase();
function sentenceTexts(r: ReviewResult, f: Finding) {
  return f.evidence.filter((e) => e.kind === "sentence").map((e) => low(r.sentences.find((s) => s.id === e.sentenceId)?.text ?? e.quote ?? ""));
}
function matches(r: ReviewResult, f: Finding, p: Plant): boolean {
  switch (p.type) {
    case "missing_element": return (f.category === "missing_element" || f.category === "unclear") && f.referenceIds.includes(p.elementId);
    case "inconsistency": return (f.category === "inconsistency" || f.category === "unclear") &&
      (sentenceTexts(r, f).some((t) => p.anchors.some((a) => t.includes(low(a)))) || f.evidence.some((e) => e.kind === "field" && p.fieldPaths.includes(e.fieldPath!)));
    case "citation": return f.category === "citation";
    case "human_review": return f.category === "human_review";
  }
}
function detected(r: ReviewResult, p: Plant): boolean {
  switch (p.type) {
    case "missing_element": return ["absent", "unclear"].includes(r.elements.find((e) => e.elementId === p.elementId)?.status ?? "") || r.findings.some((f) => matches(r, f, p));
    case "inconsistency": return r.findings.some((f) => matches(r, f, p));
    case "citation": return ["likely_mismatch", "needs_human_review"].includes(r.citation.status);
    case "human_review": return r.humanReview.required;
  }
}
/** Signature used to recognise a finding that already existed on the unmodified base case. */
const sig = (r: ReviewResult, f: Finding) => [f.category, ...f.evidence.map((e) => e.fieldPath ?? e.elementId ?? (r.sentences.find((s) => s.id === e.sentenceId)?.text ?? "").slice(0, 60))].join("|");

function evidenceValid(c: CaseRecord, r: ReviewResult) {
  let ok = 0, total = 0;
  for (const f of r.findings) {
    total++;
    const good = f.evidence.length > 0 && f.evidence.every((e) => {
      if (e.kind === "missing") return !!e.elementId;
      if (e.kind === "field") return c.facts.some((x) => x.path === e.fieldPath) || e.fieldPath === "selectedCharges";
      return e.start != null && e.end != null && c.narrative.text.slice(e.start, e.end) === e.quote;
    });
    if (good) ok++;
  }
  return { ok, total };
}

type Row = { id: string; split: string; base: string; ms: number; ok: boolean; plants: number; detected: number; tp: number; dup: number; inherited: number; unexpected: string[]; plantResults: { type: string; hit: boolean }[]; citation: string; humanReview: boolean };
const rows: Row[] = [];
let evOk = 0, evTotal = 0;
for (const ex of expected.sort((a, b) => a.id.localeCompare(b.id))) {
  const lat = latency.find((l) => l.id === ex.id);
  const r = load(ex.id);
  if (!lat) continue; // not part of this run
  const row: Row = { id: ex.id, split: ex.split, base: ex.base, ms: lat.ms, ok: !!r && r.modelStatus === "ok", plants: ex.plants.length, detected: 0, tp: 0, dup: 0, inherited: 0, unexpected: [], plantResults: [], citation: r?.citation.status ?? "n/a", humanReview: r?.humanReview.required ?? false };
  if (r) {
    const ev = evidenceValid(caseOf(ex.id), r); evOk += ev.ok; evTotal += ev.total;
    for (const p of ex.plants) { const hit = detected(r, p); row.plantResults.push({ type: p.type, hit }); if (hit) row.detected++; }
    if (ex.plants.length) {
      const baseRun = load(ex.base);
      const baseSigs = new Set(baseRun ? baseRun.findings.map((f) => sig(baseRun, f)) : []);
      const used = new Set<number>();
      for (const f of r.findings) {
        const pi = ex.plants.findIndex((p) => matches(r, f, p));
        if (pi >= 0) { if (used.has(pi)) row.dup++; else { used.add(pi); row.tp++; } }
        else if (baseSigs.has(sig(r, f))) row.inherited++;
        else row.unexpected.push(`${f.id} ${f.category}: ${f.title}`);
      }
    } else row.unexpected = r.findings.map((f) => `${f.id} ${f.category}: ${f.title}`); // base cases: unadjudicated observations
  }
  rows.push(row);
}

const variants = rows.filter((r) => r.plants > 0);
const bases = rows.filter((r) => r.plants === 0);
const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(0)}% (${a}/${b})` : "n/a");
const byType = (t: string, rs = variants) => { const all = rs.flatMap((r) => r.plantResults.filter((p) => p.type === t)); return pct(all.filter((p) => p.hit).length, all.length); };
const sum = (rs: Row[], k: "detected" | "plants" | "tp") => rs.reduce((a, r) => a + r[k], 0);
const unexpectedN = (rs: Row[]) => rs.reduce((a, r) => a + r.unexpected.length, 0);
const ms = latency.map((l) => l.ms).sort((a, b) => a - b);
const q = (p: number) => (ms.length ? (ms[Math.min(ms.length - 1, Math.floor(p * ms.length))] / 1000).toFixed(1) + "s" : "n/a");

const summary = {
  run: dir, cases: rows.length, variantCases: variants.length, baseCases: bases.length,
  modelFailures: rows.filter((r) => !r.ok).map((r) => r.id),
  recall: { all: pct(sum(variants, "detected"), sum(variants, "plants")),
    dev: pct(sum(variants.filter((r) => r.split === "dev"), "detected"), sum(variants.filter((r) => r.split === "dev"), "plants")),
    heldout: pct(sum(variants.filter((r) => r.split === "heldout"), "detected"), sum(variants.filter((r) => r.split === "heldout"), "plants")),
    missing_element: byType("missing_element"), inconsistency: byType("inconsistency"), citation: byType("citation"), human_review: byType("human_review") },
  incorrectFlagProportion: pct(unexpectedN(variants), sum(variants, "tp") + unexpectedN(variants)),
  humanReviewRouting: byType("human_review"),
  evidenceValidity: pct(evOk, evTotal),
  baseCaseObservations: bases.map((b) => ({ id: b.id, citation: b.citation, humanReview: b.humanReview, findings: b.unexpected })),
  latency: { p50: q(0.5), p90: q(0.9), max: q(0.999), over60s: latency.filter((l) => l.ms > 60_000).length, failed: latency.filter((l) => !l.ok).length },
  rows,
};
writeFileSync(`${dir}/summary.json`, JSON.stringify(summary, null, 2));

const md = `# Evaluation run ${dir.split("/").pop()}

**Internal synthetic evaluation.** Test variants and expected findings were created by the team from adapted public records.
They are not Unissant's test set. References are provisional (see config/references.json).

| Measure | Result | Deck target |
|---|---|---|
| Detection recall, all planted issues | ${summary.recall.all} | at least 90% |
| Recall, dev split | ${summary.recall.dev} | |
| Recall, held-out split | ${summary.recall.heldout} | |
| Missing elements | ${summary.recall.missing_element} | |
| Inconsistencies | ${summary.recall.inconsistency} | |
| Citation errors | ${summary.recall.citation} | |
| Human-review routing (ambiguous or multi-charge) | ${summary.humanReviewRouting} | 100% |
| Incorrect flags among issued flags (variants, conservative) | ${summary.incorrectFlagProportion} | at most 10% |
| Evidence references valid | ${summary.evidenceValidity} | every flag |
| Latency p50 / p90 / max | ${summary.latency.p50} / ${summary.latency.p90} / ${summary.latency.max} | under 60s |
| Reviews over 60s / failed | ${summary.latency.over60s} / ${summary.latency.failed} | |

Cases: ${rows.length} (${variants.length} variants, ${bases.length} unmodified bases). Model failures: ${summary.modelFailures.join(", ") || "none"}.

## Per case

| Case | Split | Time | Planted | Detected | Citation | Human review | Unexpected flags |
|---|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.id} | ${r.split} | ${(r.ms / 1000).toFixed(1)}s | ${r.plantResults.map((p) => p.type).join(", ") || "none"} | ${r.plants ? `${r.detected}/${r.plants}` : "n/a"} | ${r.citation} | ${r.humanReview ? "yes" : "no"} | ${r.unexpected.length ? r.unexpected.join("; ") : ""} |`).join("\n")}

Unexpected flags on unmodified bases are unadjudicated observations: the public records are not an answer key.
`;
writeFileSync(`${dir}/REPORT.md`, md);
console.log(md.split("## Per case")[0]);
