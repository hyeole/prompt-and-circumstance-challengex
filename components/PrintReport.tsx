import type { CaseRecord, ReviewResult } from "@/lib/types";
import { completionOf } from "@/lib/completion";
import type { Decision } from "./FindingsPanel";
import { CATEGORY, CITATION_STATUS, ELEMENT_STATUS, CHECK_STATUS } from "./categories";

const QUAL: Record<string, string> = { recorded_unknown: "Documented as unknown (not established)", partly_unknown: "Partly established", see_narrative: "Refers to narrative" };
const MAX_FINDINGS = 9;

/**
 * One-page gap report. Hidden on screen and shown by the print dialog, or shown on screen when `screen` is set.
 * Never includes rewritten narrative text. Anything that does not fit is named and left to the detailed audit export,
 * rather than being silently shrunk or dropped.
 */
export default function PrintReport({ kase, review, decisions = {}, edited, version, screen }: {
  kase: CaseRecord; review: ReviewResult; decisions?: Record<string, Decision>; edited: boolean; version?: number; screen?: boolean;
}) {
  const completion = completionOf(review);
  const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const applicable = review.elements.filter((e) => e.status !== "not_applicable");
  const notApplicable = review.elements.filter((e) => e.status === "not_applicable");
  const truncatedNotes = review.findings.slice(0, MAX_FINDINGS).some((f) => (decisions[f.id]?.note ?? "").length > 90);
  const kind = kase.kind === "adapted-public-record" ? "adapted source record" : kase.kind === "user-case" ? "entered case" : "synthetic test case";
  return (
    <article className={`${screen ? "report-screen" : "print-only"} report`}>
      <header className="r-head">
        <div>
          <div className="r-title">NarrativeCheck gap report</div>
          <div className="r-sub">
            Case {kase.id}{version ? ` · version ${version}` : ""} · {kase.title} · {kind}
            {edited ? " · reviewed an edited copy" : ""}
          </div>
        </div>
        <div className={`r-hr ${review.humanReview.required ? "yes" : "no"}`}>{review.humanReview.required ? "HUMAN REVIEW REQUIRED" : "No human-review trigger"}</div>
      </header>

      {completion.status === "partial" && (
        <p className="r-partial"><b>PARTIAL REVIEW.</b> Did not complete: {completion.failed.map((f) => `${f.check} (${f.reason})`).join("; ")}. Checks listed as unavailable or partial are not passes.</p>
      )}

      <section className="r-grid">
        <div>
          <h3>Citation check</h3>
          <p><b>{review.citation.citation || "No charge selected"}</b>: {CITATION_STATUS[review.citation.status]}</p>
          <p>{trunc(review.citation.explanation, 260)}</p>
          {review.humanReview.reasons.length > 0 && (
            <>
              <h3>Why a person should review</h3>
              <ul>{review.humanReview.reasons.slice(0, 4).map((r, i) => <li key={i}>{trunc(r, 160)}</li>)}</ul>
            </>
          )}
        </div>
        <div>
          <h3>Checklist{review.checklistVersion ? ` (${review.checklistVersion})` : ""}</h3>
          <table>
            <tbody>
              {applicable.map((e) => (
                <tr key={e.elementId}>
                  <td>{e.sponsorCategory ? `${e.sponsorCategory} · ` : ""}{e.label}</td>
                  <td>{e.status === "present" && e.qualifier ? QUAL[e.qualifier] : ELEMENT_STATUS[e.status].label}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {notApplicable.length > 0 && <p className="r-ev">Not applicable in this case&apos;s context: {notApplicable.map((e) => e.label).join("; ")}.</p>}
        </div>
      </section>

      <section>
        <h3>Findings ({review.findings.length})</h3>
        {review.findings.length === 0 && <p>{completion.status === "complete" ? "No findings from the checks that ran." : "No findings from the checks that completed; the review is incomplete."}</p>}
        <ol className="r-findings">
          {review.findings.slice(0, MAX_FINDINGS).map((f) => (
            <li key={f.id}>
              <b>[{CATEGORY[f.category].short}] {f.title}</b> ({f.id}). {trunc(f.explanation, 220)}
              <div className="r-ev">
                Evidence: {f.evidence.map((e) => (e.kind === "sentence" ? `${e.sentenceId}${e.page ? ` p.${e.page}` : ""} "${trunc(e.quote ?? "", 70)}"${e.match === "partial" ? " (partial quote)" : ""}` : e.kind === "field" ? `field ${e.fieldPath}${e.page ? ` p.${e.page}` : ""}` : `required element ${e.elementId} not stated`)).join(" | ")}
              </div>
              {decisions[f.id] && decisions[f.id].state !== "open" && (
                <div className="r-ev">Officer: {decisions[f.id].state === "acknowledged" ? "acknowledged" : "dismissed (not confirmed fixed)"}{decisions[f.id].note ? `: ${trunc(decisions[f.id].note!, 90)}` : ""}</div>
              )}
            </li>
          ))}
        </ol>
        {(review.findings.length > MAX_FINDINGS || truncatedNotes) && (
          <p className="r-ev"><b>Not all detail fits on one page:</b> {review.findings.length > MAX_FINDINGS ? `${review.findings.length - MAX_FINDINGS} more finding(s)` : ""}{review.findings.length > MAX_FINDINGS && truncatedNotes ? " and " : ""}{truncatedNotes ? "full officer notes" : ""} are in the detailed audit export.</p>
        )}
      </section>

      <footer className="r-foot">
        <div>Checks: {review.checks.map((c) => `${c.label}: ${CHECK_STATUS[c.status]}`).join(" · ")}</div>
        <div>
          Completion: {completion.status}{completion.unsupported.length ? ` (not checkable here: ${completion.unsupported.map((u) => u.check).join(", ")})` : ""} · reviewed {new Date(review.createdAt).toLocaleString()} · {review.model} · prompt {review.promptVersion} · references {review.referenceVersion} (team-provisional; guided by Unissant&apos;s core elements) · {(review.latencyMs / 1000).toFixed(1)}s
        </div>
        <div>Decision support only. Not a legal determination. The officer&apos;s narrative and selected charge were not changed. Built by Prompt &amp; Circumstance.</div>
      </footer>
    </article>
  );
}
