// Locked scoring checks for diag-2 (written before the run; adapted from the diag-1 scorer, plus "noElementFlag"). Reads a run folder's raw results and eval/diag-2/checks.json,
// and reports each check per case, plus completion, routing and every finding for manual adjudication. It does not
// adjudicate: whether each finding is correct is decided by a person against the source, separately.
// Usage: npx tsx --conditions=react-server eval/diag-2/score-diag2.ts <run-dir> > score.json
import { readFileSync, existsSync } from "node:fs";
import { splitSentences } from "../../lib/text";
import type { CaseRecord, ReviewResult } from "../../lib/types";

type Check = { kind: string; category?: string | string[]; anchor?: string; field?: string; element?: string; elements?: string[]; status?: string | string[] };
const dir = process.argv[2];
const checks = JSON.parse(readFileSync("eval/diag-2/checks.json", "utf8")) as Record<string, { category: string; checks: Check[] }>;
const list = (x?: string | string[]) => (x === undefined ? undefined : Array.isArray(x) ? x : [x]);
const out: unknown[] = [];
for (const [id, spec] of Object.entries(checks)) {
  const c = JSON.parse(readFileSync(`eval/diag-2/cases/${id}.json`, "utf8")) as CaseRecord;
  const path = `${dir}/raw/${id}.json`;
  if (!existsSync(path)) { out.push({ id, category: spec.category, status: "no result" }); continue; }
  const r = JSON.parse(readFileSync(path, "utf8")) as ReviewResult;
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const sidOf = (anchor: string) => ss.find((s) => s.text.includes(anchor))?.id;
  const cites = (f: ReviewResult["findings"][number], sid?: string) => !!sid && f.evidence.some((e) => e.sentenceId === sid);
  const results = spec.checks.map((k) => {
    const cats = list(k.category), sid = k.anchor ? sidOf(k.anchor) : undefined;
    let pass = false, detail = "";
    switch (k.kind) {
      case "finding": {
        const hit = r.findings.filter((f) => (!cats || cats.includes(f.category)) && cites(f, sid) && (!k.field || f.evidence.some((e) => e.fieldPath === k.field)));
        pass = hit.length > 0; detail = hit.map((f) => f.id).join(",") || `none citing ${sid} and ${k.field}`; break;
      }
      case "missing": {
        const m = r.findings.find((f) => f.id === `M-${k.element}`), u = r.findings.find((f) => f.id === `U-${k.element}`);
        pass = !!m; detail = m ? m.id : u ? `only ${u.id} (unclear, not missing)` : `element ${k.element}: ${r.elements.find((e) => e.elementId === k.element)?.status}`; break;
      }
      case "citation": pass = r.citation.status === k.status; detail = r.citation.status; break;
      case "citationNot": pass = r.citation.status !== k.status; detail = r.citation.status; break;
      case "citationIn": pass = list(k.status)!.includes(r.citation.status); detail = r.citation.status; break;
      case "routed": pass = r.humanReview.required; detail = String(r.humanReview.required); break;
      case "route": {
        const named = (r.humanReview.accounts ?? []).some((g) => g.sentenceIds.includes(sid!)) ||
          r.findings.some((f) => f.needsHumanReview && cites(f, sid)) ||
          r.humanReview.reasons.some((x) => new RegExp(`\\b${sid}\\b`).test(x));
        pass = r.humanReview.required && named; detail = `routed=${r.humanReview.required}; ${sid} named=${named}`; break;
      }
      case "noContradiction": {
        const hit = r.findings.filter((f) => f.category === "inconsistency" && cites(f, sid));
        pass = !hit.length; detail = hit.map((f) => f.id).join(",") || "none"; break;
      }
      case "noFinding": {
        const hit = r.findings.filter((f) => cats!.includes(f.category) && (!k.field || f.evidence.some((e) => e.fieldPath === k.field)));
        pass = !hit.length; detail = hit.map((f) => f.id).join(",") || "none"; break;
      }
      case "noMissing": {
        const hit = r.findings.filter((f) => f.category === "missing_element" && (!k.elements || k.elements.includes(f.id.slice(2))));
        pass = !hit.length; detail = hit.map((f) => f.id).join(",") || "none"; break;
      }
      case "noElementFlag": {
        // Neither "missing" (M-) nor "unclear" (U-) for the listed elements.
        const hit = r.findings.filter((f) => (f.category === "missing_element" || f.category === "unclear") && (k.elements ?? []).includes(f.id.slice(2)));
        pass = !hit.length; detail = hit.map((f) => f.id).join(",") || "none"; break;
      }
      default: detail = "unknown check";
    }
    return { ...k, sentence: sid, pass, detail };
  });
  out.push({
    id, category: spec.category, checksPassed: results.every((x) => x.pass), checks: results,
    completion: r.completion?.status, completionFailed: r.completion?.failed ?? [], modelStatus: r.modelStatus,
    routed: r.humanReview.required, reasons: r.humanReview.reasons, accounts: r.humanReview.accounts ?? [],
    citation: { status: r.citation.status, explanation: r.citation.explanation },
    findings: r.findings.map((f) => ({ id: f.id, category: f.category, source: f.source, title: f.title, explanation: f.explanation, evidence: f.evidence.map((e) => e.sentenceId ?? e.fieldPath ?? e.elementId), needsHumanReview: f.needsHumanReview })),
    latencyMs: r.latencyMs, calls: (r.calls ?? []).map((x) => ({ role: x.role, status: x.status, attempts: x.attempts, ms: x.ms })),
  });
}
console.log(JSON.stringify(out, null, 1));
