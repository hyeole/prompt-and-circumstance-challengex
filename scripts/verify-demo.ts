/**
 * Verifies, with LIVE reviews, that every demo beat behaves as the demo script says before the video is recorded.
 * Usage: npm run dev, then  npx tsx scripts/verify-demo.ts [--clean C045]
 * Writes docs/demo-verification.md. Exits non-zero if any expectation fails.
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { CaseRecord, ReviewResult } from "../lib/types";
import { isComplete } from "../lib/completion";

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const CLEAN = arg("clean", "C045");
const load = (id: string) => JSON.parse(readFileSync(`data/cases/${id}.json`, "utf8")) as CaseRecord;

async function review(c: CaseRecord): Promise<{ r: ReviewResult; ms: number }> {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case: c }), signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { r: (await res.json()) as ReviewResult, ms: Date.now() - t0 };
}

type Check = [string, (r: ReviewResult) => boolean];
const beats: { name: string; build: () => CaseRecord; checks: Check[] }[] = [
  { name: `1. Complete case (${CLEAN})`, build: () => load(CLEAN), checks: [
    ["every required check completed", (r) => isComplete(r)],
    ["no findings", (r) => r.findings.length === 0],
    ["no human-review trigger", (r) => !r.humanReview.required],
    ["citation consistent", (r) => r.citation.status === "consistent"],
  ] },
  { name: "2. Missing detail (C012-M2)", build: () => load("C012-M2"), checks: [
    ["every required check completed", (r) => isComplete(r)],
    ["place of entry (E2) reported absent", (r) => r.elements.find((e) => e.elementId === "E2")?.status === "absent"],
    ["missing finding has no invented text span", (r) => r.findings.some((f) => f.id === "M-E2" && f.evidence.every((e) => e.kind === "missing"))],
  ] },
  { name: "3. Officer correction + fresh review (C012-M2 edited)", build: () => {
      const c = load("C012-M2");
      c.narrative = { text: c.narrative.text.replace("via a river.", "via a river near Laredo, Texas.") };
      c.facts = c.facts.map((f) => (f.path === "entry.place" ? { ...f, value: "0 mile(s) of LAR", status: "present" } : f));
      return c;
    }, checks: [
    ["every required check completed", (r) => isComplete(r)],
    ["place of entry no longer missing", (r) => r.elements.find((e) => e.elementId === "E2")?.status === "present" && !r.findings.some((f) => f.id === "M-E2")],
  ] },
  { name: "4. Contradiction with both sources linked (C012-X1)", build: () => load("C012-X1"), checks: [
    ["every required check completed", (r) => isComplete(r)],
    ["conflict finding cites the tourist-visa sentence and another source", (r) => r.findings.some((f) => f.category === "inconsistency" && f.evidence.length >= 2 && f.evidence.some((e) => e.kind === "sentence" && /tourist visa/.test(r.sentences.find((s) => s.id === e.sentenceId)?.text ?? "")))],
    ["routed to human review", (r) => r.humanReview.required],
    ["citation not shown as plainly consistent", (r) => r.citation.status !== "consistent"],
  ] },
  { name: "5. Ambiguous account routed to a person (C003-AMB)", build: () => load("C003-AMB"), checks: [
    ["every required check completed", (r) => isComplete(r)],
    ["human review required", (r) => r.humanReview.required],
    ["a review-marked finding cites the border-crossing-card statement", (r) => r.findings.some((f) => f.needsHumanReview && f.evidence.some((e) => e.kind === "sentence" && /border crossing card/.test(r.sentences.find((s) => s.id === e.sentenceId)?.text ?? "")))],
  ] },
  { name: "6. Multi-charge case (C001-MC)", build: () => load("C001-MC"), checks: [
    ["multi-charge rule fired", (r) => r.findings.some((f) => f.id === "R-MULTI-CHARGE")],
    ["human review required", (r) => r.humanReview.required],
    ["no charge chosen or suggested", (r) => r.citation.status === "needs_human_review"],
  ] },
];

let md = `# Demo verification\n\nLive reviews against ${BASE} on ${new Date().toISOString()} (commit-level code as running). Every demo beat must pass before the video is recorded.\n\n`;
let failed = 0;
for (const b of beats) {
  try {
    const { r, ms } = await review(b.build());
    const results = b.checks.map(([label, fn]) => [label, fn(r)] as const);
    const ok = results.every(([, v]) => v);
    if (!ok) failed++;
    md += `## ${ok ? "PASS" : "FAIL"} ${b.name} (${(ms / 1000).toFixed(1)}s)\n${results.map(([l, v]) => `- ${v ? "✓" : "✗"} ${l}`).join("\n")}\n- findings: ${r.findings.map((f) => `${f.id} ${f.title}`).join("; ") || "none"}\n- citation: ${r.citation.status}; human review: ${r.humanReview.required}\n\n`;
    console.log(`${ok ? "PASS" : "FAIL"} ${b.name} (${(ms / 1000).toFixed(1)}s)`, results.filter(([, v]) => !v).map(([l]) => l).join("; "));
  } catch (e) {
    failed++;
    md += `## FAIL ${b.name}\n- request failed: ${(e as Error).message}\n\n`;
    console.log(`FAIL ${b.name}: ${(e as Error).message}`);
  }
}
writeFileSync("docs/demo-verification.md", md);
process.exit(failed ? 1 : 0);
