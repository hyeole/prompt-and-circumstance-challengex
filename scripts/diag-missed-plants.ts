// Diagnostic. Usage: npx tsx scripts/diag-missed-plants.ts <run>. Every planted issue not detected in a run, with what the review did instead.
import { readFileSync, readdirSync } from "node:fs";
import { matches, isComplete, citesAnchor, type Plant } from "./score-match";
import type { ReviewResult } from "../lib/types";
const run = process.argv[2];
const info = JSON.parse(readFileSync(`eval/runs/${run}/run-info.json`, "utf8"));
const exp = (info.dataset ?? "eval") === "eval" ? "eval/expected" : `${info.dataset}/expected`;
for (const f of readdirSync(`eval/runs/${run}/raw`).sort()) {
  const r = JSON.parse(readFileSync(`eval/runs/${run}/raw/${f}`, "utf8")) as ReviewResult;
  const ex = JSON.parse(readFileSync(`${exp}/${r.caseId}.json`, "utf8")) as { description: string; plants: (Plant & { anchors?: string[] })[] };
  for (const p of ex.plants) {
    const hit = r.findings.some((fd) => matches(r, fd, p) && (isComplete(r) || fd.source === "rule"));
    const elementAbsent = p.type === "missing_element" && isComplete(r) && r.elements.find((e) => e.elementId === p.elementId)?.status === "absent";
    const citeOk = p.type === "citation" && isComplete(r) && r.citation.status === "likely_mismatch" && r.citation.evidence.length > 0;
    if (hit || elementAbsent || citeOk) continue;
    const anchorIds = r.sentences.filter((s) => (p.anchors ?? []).some((a) => s.text.toLowerCase().includes(a.toLowerCase()))).map((s) => s.id);
    const routedNaming = r.humanReview.reasons.filter((h) => anchorIds.some((id) => new RegExp(`\\b${id}\\b`).test(h)));
    const related = r.findings.filter((fd) => fd.evidence.some((e) => anchorIds.includes(e.sentenceId ?? "") || ("fieldPaths" in p && p.fieldPaths.includes(e.fieldPath ?? ""))) || (p.type === "missing_element" && fd.referenceIds.includes(p.elementId)));
    const supp = r.discarded.filter((d) => /attribut|different people|same manner|another country/.test(d.reason)).map((d) => `${d.title}: ${d.reason.slice(0, 70)}`);
    console.log(JSON.stringify({
      case: r.caseId, plant: p.type === "missing_element" ? `missing ${p.elementId}` : p.type === "human_review" ? `routing:${p.reason}` : p.type === "inconsistency" ? `inconsistency ${p.fieldPaths.join(",")}` : p.type,
      expected: ex.description.slice(0, 110), complete: isComplete(r), failed: (r.completion?.failed ?? []).map((x) => x.check),
      multiPerson: r.notes.length > 0, anchors: anchorIds, element: p.type === "missing_element" ? r.elements.find((e) => e.elementId === p.elementId)?.status : undefined,
      citation: r.citation.status, related: related.map((fd) => `${fd.id} ${fd.category} "${fd.title.slice(0, 50)}"`), routedNaming: routedNaming.map((h) => h.slice(0, 90)), suppressed: supp,
    }));
  }
}
