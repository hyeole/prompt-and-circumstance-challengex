import type { ModelOutput } from "./schema";

const CITATION_RANK = { consistent: 0, insufficient_information: 1, needs_human_review: 2, likely_mismatch: 3 } as const;

/**
 * Merge parallel samples. Issues: union (each is still evidence-verified later; near-duplicates are removed).
 * Elements: "present" with sentence references wins, so a single sample cannot create a false "missing" flag.
 * Citation: the more cautious status wins; a mismatch is still downgraded later if its evidence does not verify.
 */
export const issueKey = (i: ModelOutput["issues"][number]) => `${i.type}:${i.evidence.map((e) => e.field_path ?? e.sentence_id ?? "").sort().join("|")}`;

/** How many samples reported an issue with the same type and evidence sources. */
export function agreement(outs: ModelOutput[], i: ModelOutput["issues"][number]) {
  return outs.filter((o) => o.issues.some((x) => issueKey(x) === issueKey(i))).length;
}

export function mergeOutputs(outs: ModelOutput[]): ModelOutput {
  if (outs.length === 1) return outs[0];
  const elements = new Map<string, ModelOutput["elements"][number]>();
  for (const o of outs)
    for (const e of o.elements) {
      const prev = elements.get(e.element_id);
      const better = !prev || (e.status === "present" && e.sentence_ids.length > 0 && !(prev.status === "present" && prev.sentence_ids.length > 0));
      if (better) elements.set(e.element_id, e);
    }
  const issues: ModelOutput["issues"] = [];
  for (const o of outs) for (const i of o.issues) if (!issues.some((x) => issueKey(x) === issueKey(i))) issues.push(i);
  const citation = outs.map((o) => o.citation).sort((a, b) => CITATION_RANK[b.status] - CITATION_RANK[a.status])[0];
  return {
    elements: [...elements.values()],
    issues,
    citation,
    human_review: { required: outs.some((o) => o.human_review.required), reasons: [...new Set(outs.flatMap((o) => o.human_review.reasons))] },
  };
}
