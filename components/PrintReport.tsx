import type { CaseRecord, ReviewResult } from "@/lib/types";
import type { Disposition } from "./FindingsPanel";
import { CATEGORY, CITATION_STATUS, ELEMENT_STATUS, CHECK_STATUS } from "./categories";

/** One-page printable report. Hidden on screen; shown by the browser's print dialog. Never includes rewritten narrative text. */
export default function PrintReport({ kase, review, dispositions, edited }: { kase: CaseRecord; review: ReviewResult; dispositions: Record<string, Disposition>; edited: boolean }) {
  const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  return (
    <article className="print-only report">
      <header className="r-head">
        <div>
          <div className="r-title">NarrativeCheck gap report</div>
          <div className="r-sub">
            Case {kase.id} · {kase.title} · {kase.kind === "adapted-public-record" ? "adapted public record" : "team test case"}
            {edited ? " · reviewed an edited copy" : ""}
          </div>
        </div>
        <div className={`r-hr ${review.humanReview.required ? "yes" : "no"}`}>{review.humanReview.required ? "HUMAN REVIEW REQUIRED" : "No human-review trigger"}</div>
      </header>

      <section className="r-grid">
        <div>
          <h3>Citation check</h3>
          <p>
            <b>{review.citation.citation || "No charge selected"}</b>: {CITATION_STATUS[review.citation.status]}
          </p>
          <p>{trunc(review.citation.explanation, 260)}</p>
          {review.humanReview.reasons.length > 0 && (
            <>
              <h3>Why a person should review</h3>
              <ul>
                {review.humanReview.reasons.slice(0, 4).map((r, i) => (
                  <li key={i}>{trunc(r, 160)}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div>
          <h3>Required elements</h3>
          <table>
            <tbody>
              {review.elements.map((e) => (
                <tr key={e.elementId}>
                  <td>{e.label}</td>
                  <td>{ELEMENT_STATUS[e.status].label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3>Findings ({review.findings.length})</h3>
        {review.findings.length === 0 && <p>No findings from checks that ran.</p>}
        <ol className="r-findings">
          {review.findings.slice(0, 9).map((f) => (
            <li key={f.id}>
              <b>
                [{CATEGORY[f.category].short}] {f.title}
              </b>{" "}
              ({f.id}). {trunc(f.explanation, 220)}
              <div className="r-ev">
                Evidence:{" "}
                {f.evidence
                  .map((e) => (e.kind === "sentence" ? `${e.sentenceId}${e.page ? ` p.${e.page}` : ""} "${trunc(e.quote ?? "", 70)}"` : e.kind === "field" ? `field ${e.fieldPath}${e.page ? ` p.${e.page}` : ""}` : `required element ${e.elementId} not stated`))
                  .join(" | ")}
              </div>
              {dispositions[f.id] && <div className="r-ev">Reviewer: {dispositions[f.id].state === "acknowledged" ? "acknowledged" : `dismissed (${dispositions[f.id].reason}); not confirmed fixed`}</div>}
            </li>
          ))}
        </ol>
        {review.findings.length > 9 && <p>{review.findings.length - 9} more findings are in the application.</p>}
      </section>

      <footer className="r-foot">
        <div>
          Checks: {review.checks.map((c) => `${c.label}: ${CHECK_STATUS[c.status]}`).join(" · ")}
        </div>
        <div>
          Reviewed {new Date(review.createdAt).toLocaleString()} · {review.model} · prompt {review.promptVersion} · references {review.referenceVersion} (provisional, team-compiled) · {(review.latencyMs / 1000).toFixed(1)}s
        </div>
        <div>Decision support only. Not a legal determination. The officer&apos;s narrative and selected charge were not changed. Built by Prompt &amp; Circumstance.</div>
      </footer>
    </article>
  );
}
