// Explicit, verified mapping of a saved result's sentence IDs to the current splitter's sentences, for offline replays.
// A change in sentence boundaries (e.g. "8 U.S.C. 1326" no longer split) shifts every later sentence ID, so a saved
// extraction or model output cannot be replayed with its old IDs. Each old sentence is mapped by character offsets to
// the new sentence that contains it; every quoted item is then checked against the new sentence's text. Items that cannot
// be mapped (an old sentence split across several new ones with the quote not inside one of them, or a quote not found)
// are dropped and reported, never re-pointed blindly. The saved record itself is never modified (a clone is returned).
import type { CaseRecord, ReviewResult, Sentence } from "../lib/types";
import { splitSentences } from "../lib/text";
import { legacySplitSentences } from "./legacy-split-df11086";

export type RemapReport = { changed: number; dropped: { where: string; oldId: string; quote?: string; why: string }[]; mapping: Record<string, string> };

export function remapSaved(saved: ReviewResult, c: CaseRecord): { saved: ReviewResult; report: RemapReport } {
  const text = c.narrative.text;
  const next = splitSentences(text, c.narrative.pageSpans);
  const prev: Sentence[] = (saved as { sentences?: Sentence[] }).sentences?.length
    ? (saved as { sentences: Sentence[] }).sentences : legacySplitSentences(text, c.narrative.pageSpans);
  const mapping: Record<string, string> = {};
  for (const o of prev) {
    const hits = next.filter((n) => n.start <= o.start && o.end <= n.end);
    if (hits.length === 1) mapping[o.id] = hits[0].id;
  }
  const report: RemapReport = { changed: Object.entries(mapping).filter(([a, b]) => a !== b).length, dropped: [], mapping };
  const same = prev.length === next.length && prev.every((o, i) => o.start === next[i].start && o.end === next[i].end);
  if (same) return { saved, report };
  const clone = structuredClone(saved) as ReviewResult & { factsExtraction?: { output?: Record<string, { sentence_id: string; quote: string }[]> } };
  const textOf = (id: string) => next.find((n) => n.id === id)?.text ?? "";
  // One item: map its old ID; if the old sentence did not map to one new sentence, locate the quote among the new
  // sentences overlapping the old one. Returns the new ID or null (dropped and reported).
  const mapOne = (where: string, oldId: string, quote?: string): string | null => {
    const o = prev.find((x) => x.id === oldId);
    let id = mapping[oldId];
    if (!id && o && quote) {
      const cands = next.filter((n) => n.end > o.start && n.start < o.end && n.text.includes(quote));
      if (cands.length === 1) id = cands[0].id;
    }
    if (!id) { report.dropped.push({ where, oldId, quote, why: o ? "old sentence spans several new sentences" : "old sentence ID not found" }); return null; }
    if (quote && !textOf(id).includes(quote) && !textOf(id).replace(/\s+/g, " ").includes(quote.replace(/\s+/g, " "))) {
      // The quote was not verbatim in the old sentence either (paraphrased): keep the mapped ID, the app verifies again.
      if (o && o.text.includes(quote)) { report.dropped.push({ where, oldId, quote, why: "quote not found in the mapped sentence" }); return null; }
    }
    return id;
  };
  // Fact extraction
  const out = clone.factsExtraction?.output;
  if (out) for (const k of ["entry_statements", "removal_statements", "status_statements"]) {
    const list = out[k] ?? [];
    out[k] = list.flatMap((e) => { const id = mapOne(`facts.${k}`, e.sentence_id, e.quote); return id ? [{ ...e, sentence_id: id }] : []; });
  }
  // Findings evidence, element sentence IDs, citation evidence (what the reconstructed model output is rebuilt from)
  clone.findings = clone.findings.map((f) => ({ ...f, evidence: f.evidence.flatMap((e) => {
    if (!e.sentenceId) return [e];
    const id = mapOne(`finding ${f.id}`, e.sentenceId, e.quote);
    if (!id) return [];
    const n = next.find((x) => x.id === id)!;
    const at = e.quote ? n.text.indexOf(e.quote) : -1;
    return [{ ...e, sentenceId: id, ...(at >= 0 ? { start: n.start + at, end: n.start + at + e.quote!.length } : { start: n.start, end: n.end }) }];
  }) }));
  clone.elements = clone.elements.map((el) => ({ ...el, sentenceIds: (el.sentenceIds ?? []).flatMap((s) => { const id = mapOne(`element ${el.elementId}`, s); return id ? [id] : []; }) }));
  clone.citation = { ...clone.citation, evidence: (clone.citation.evidence ?? []).flatMap((e) => { if (!e.sentenceId) return [e]; const id = mapOne("citation", e.sentenceId, e.quote); return id ? [{ ...e, sentenceId: id }] : []; }) };
  clone.humanReview = { ...clone.humanReview, accounts: (clone.humanReview.accounts ?? []).map((g) => ({ ...g, sentenceIds: g.sentenceIds.flatMap((s) => { const id = mapOne("account", s); return id ? [id] : []; }) })) };
  // Reasons that name sentence IDs ("S8, S9 may conflict") are rewritten with the same mapping, or reported.
  clone.humanReview.reasons = clone.humanReview.reasons.map((r) => r.replace(/\bS(\d+)\b/g, (m) => mapping[m] ?? (report.dropped.push({ where: "reason", oldId: m, why: "unmapped ID in a reason" }), m)));
  clone.sentences = next as never;
  return { saved: clone, report };
}
