// Review-state and case-group labels shared by the Workspace and Cases pages.
export const STATE_LABEL = { not_reviewed: "Not reviewed", incomplete: "Review incomplete", needs_human_review: "Needs human review", reviewed: "Reviewed" } as const;
export const GROUP_LABEL = { source: "Adapted source record", variant: "Synthetic test variant", entered: "Entered case" } as const;
const TONE = { not_reviewed: "pill-neutral", incomplete: "pill-warn", needs_human_review: "pill-review", reviewed: "pill-ok" } as const;

export function StatePill({ state }: { state: keyof typeof STATE_LABEL }) {
  return <span className={`pill ${TONE[state]}`}><span className="dot" />{STATE_LABEL[state]}</span>;
}
export function GroupTag({ group }: { group: keyof typeof GROUP_LABEL }) {
  return <span className={`tag ${group === "variant" ? "tag-variant" : group === "entered" ? "tag-user" : "tag-source"}`}>{GROUP_LABEL[group]}</span>;
}
export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");
