"use client";

import { useEffect, useRef, useState } from "react";
import type { Finding, ReviewResult } from "@/lib/types";
import { CATEGORY, CHECK_STATUS, CITATION_STATUS, ELEMENT_STATUS } from "./categories";

export type Disposition = { state: "acknowledged" | "dismissed"; reason?: string };

const ORDER: Finding["category"][] = ["human_review", "citation", "inconsistency", "missing_element", "unclear"];

export default function FindingsPanel({
  review,
  outdated,
  running,
  elapsed,
  selected,
  onSelect,
  elements,
  dispositions,
  setDisposition,
  referenceVersion,
  referenceNotice,
}: {
  review: ReviewResult | null;
  outdated: boolean;
  running: boolean;
  elapsed: number;
  selected: string | null;
  onSelect: (id: string | null) => void;
  elements: { id: string; label: string }[];
  dispositions: Record<string, Disposition>;
  setDisposition: (id: string, d: Disposition) => void;
  referenceVersion: string;
  referenceNotice: string;
}) {
  if (running && !review)
    return (
      <aside className="findings-column" aria-label="Findings">
        <div className="empty">
          <div className="spinner" aria-hidden />
          <p>
            <strong>Reviewing… {elapsed}s</strong>
          </p>
          <p className="muted">The shared model endpoint can be slow. The review stops after 90 seconds. No progress percentage is shown because the model does not report one.</p>
        </div>
      </aside>
    );
  if (!review)
    return (
      <aside className="findings-column" aria-label="Findings">
        <div className="empty">
          <p>
            <strong>No review yet</strong>
          </p>
          <p className="muted">Run a review to check required elements, consistency, clarity, and the selected charge. The narrative is never rewritten.</p>
          <details className="ref-notice">
            <summary>Reference version: {referenceVersion}</summary>
            <p>{referenceNotice}</p>
          </details>
        </div>
      </aside>
    );

  const sorted = [...review.findings].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
  const sentenceById = Object.fromEntries(review.sentences.map((s) => [s.id, s]));

  return (
    <aside className={`findings-column ${outdated ? "is-outdated" : ""}`} aria-label="Findings">
      {outdated && <div className="outdated-tag">Outdated: these findings describe an earlier version</div>}
      {running && <div className="outdated-tag">Reviewing… {elapsed}s</div>}

      <section className={`hr-banner ${review.humanReview.required ? "hr-yes" : "hr-no"}`} aria-label="Human review indicator">
        <div className="hr-title">{review.humanReview.required ? "⚑ Human review required" : "✓ No human-review trigger found"}</div>
        {review.humanReview.reasons.length > 0 && (
          <ul>
            {review.humanReview.reasons.slice(0, 5).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
      </section>

      {review.modelStatus !== "ok" && (
        <div className="banner banner-warn compact" role="alert">
          <strong>Partial review.</strong> {review.modelError} Only rule-based checks ran. Checks marked Unavailable did not run; they are not passes.
        </div>
      )}

      <section className="panel-section">
        <h2 className="section-title">Citation check</h2>
        <div className={`citation citation-${review.citation.status}`}>
          <div className="citation-head">
            <span className="mono">{review.citation.citation || "No charge selected"}</span>
            <span className="citation-status">{CITATION_STATUS[review.citation.status]}</span>
          </div>
          <p>{review.citation.explanation}</p>
          {review.citation.evidence.length > 0 && (
            <ul className="evidence-list">
              {review.citation.evidence.map((e, i) => (
                <li key={i}>{e.kind === "field" ? <span className="mono">{e.fieldPath}</span> : <>“{e.quote}”</>} {e.page && <span className="muted">p.{e.page}</span>}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel-section">
        <h2 className="section-title">Required elements</h2>
        <ul className="checklist">
          {review.elements.map((e) => {
            const st = ELEMENT_STATUS[e.status];
            const linked = review.findings.find((f) => f.referenceIds.includes(e.elementId) && (f.category === "missing_element" || f.category === "unclear"));
            return (
              <li key={e.elementId} className={`check check-${e.status}`}>
                <span className="check-icon" aria-hidden>
                  {st.icon}
                </span>
                <span className="check-label">
                  {e.label}
                  <span className="check-source">
                    {e.fieldPaths.length ? `form field ${e.fieldPaths.join(", ")}` : e.sentenceIds.length ? `sentence ${e.sentenceIds.join(", ")}` : ""}
                  </span>
                </span>
                {linked ? (
                  <button className="check-status linkish" onClick={() => onSelect(linked.id)}>
                    {st.label}
                  </button>
                ) : (
                  <span className="check-status">{st.label}</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel-section">
        <h2 className="section-title">
          Findings <span className="count">{review.findings.length}</span>
        </h2>
        {sorted.length === 0 && <p className="muted">No findings. Every check that ran completed without an issue. See the check summary below for anything that did not run.</p>}
        <ol className="finding-list">
          {sorted.map((f) => (
            <FindingCard
              key={f.id}
              f={f}
              selected={selected === f.id}
              onSelect={onSelect}
              sentenceById={sentenceById}
              disposition={dispositions[f.id]}
              setDisposition={(d) => setDisposition(f.id, d)}
              disabled={outdated}
            />
          ))}
        </ol>
      </section>

      <section className="panel-section">
        <h2 className="section-title">Check summary</h2>
        <table className="check-table">
          <tbody>
            {review.checks.map((c) => (
              <tr key={c.id}>
                <th scope="row">{c.label}</th>
                <td className={`cs cs-${c.status}`}>
                  {CHECK_STATUS[c.status]}
                  {c.note && <div className="muted small">{c.note}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {review.discarded.length > 0 && (
          <details className="small muted">
            <summary>{review.discarded.length} model statement(s) withheld: evidence could not be verified</summary>
            <ul>
              {review.discarded.map((d, i) => (
                <li key={i}>
                  {d.title}: {d.reason}
                </li>
              ))}
            </ul>
          </details>
        )}
        <p className="run-meta">
          {review.model} · {(review.latencyMs / 1000).toFixed(1)}s · {review.modelAttempts} attempt(s) · prompt {review.promptVersion} · references {review.referenceVersion} (provisional)
        </p>
      </section>
    </aside>
  );
}

function FindingCard({
  f,
  selected,
  onSelect,
  sentenceById,
  disposition,
  setDisposition,
  disabled,
}: {
  f: Finding;
  selected: boolean;
  onSelect: (id: string | null) => void;
  sentenceById: Record<string, { page?: number }>;
  disposition?: Disposition;
  setDisposition: (d: Disposition) => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);
  const cat = CATEGORY[f.category];

  return (
    <li ref={ref} className={`finding finding-${f.category} ${selected ? "is-selected" : ""} ${disposition ? `is-${disposition.state}` : ""}`}>
      <button className="finding-head" onClick={() => onSelect(selected ? null : f.id)} aria-expanded={selected}>
        <span className={`cat-chip cat-${f.category}`}>{cat.short}</span>
        <span className="finding-title">{f.title}</span>
        <span className="finding-id mono">{f.id}</span>
      </button>
      <div className="finding-body">
        <p>{f.explanation}</p>
        <ul className="evidence-list">
          {f.evidence.map((e, i) => (
            <li key={i}>
              {e.kind === "sentence" && (
                <>
                  <span className="ev-tag">{e.sentenceId}</span> “{e.quote}” {(e.page ?? sentenceById[e.sentenceId!]?.page) && <span className="muted">p.{e.page ?? sentenceById[e.sentenceId!]?.page}</span>}
                </>
              )}
              {e.kind === "field" && (
                <>
                  <span className="ev-tag">field</span> <span className="mono">{e.fieldPath}</span>
                  {e.quote && <> = “{e.quote}”</>} {e.page && <span className="muted">p.{e.page}</span>}
                </>
              )}
              {e.kind === "missing" && (
                <>
                  <span className="ev-tag">absent</span> Required element {e.elementId} is not stated. No text is highlighted because there is nothing to point to.
                </>
              )}
            </li>
          ))}
        </ul>
        {f.needsHumanReview && <p className="hr-note">⚑ Human review: {f.humanReviewReason}</p>}
        <div className="finding-meta muted small">
          Source: {f.source === "rule" ? "rule-based check" : "model check, evidence verified"}
          {f.referenceIds.length > 0 && <> · Reference {f.referenceIds.join(", ")}</>}
        </div>
        {disposition ? (
          <div className="disposition">
            {disposition.state === "acknowledged" ? "Acknowledged by reviewer." : `Dismissed: ${disposition.reason}. Dismissing does not confirm the issue is fixed.`}
          </div>
        ) : (
          !disabled && (
            <div className="finding-actions">
              {dismissing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (reason.trim()) setDisposition({ state: "dismissed", reason: reason.trim() });
                  }}
                >
                  <label className="sr-only" htmlFor={`reason-${f.id}`}>
                    Reason for dismissing
                  </label>
                  <input id={`reason-${f.id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" autoFocus />
                  <button className="btn btn-sm btn-secondary" type="submit" disabled={!reason.trim()}>
                    Dismiss
                  </button>
                  <button className="btn btn-sm btn-ghost" type="button" onClick={() => setDismissing(false)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <button className="btn btn-sm btn-ghost" onClick={() => setDisposition({ state: "acknowledged" })}>
                    Acknowledge
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setDismissing(true)}>
                    Dismiss with reason
                  </button>
                </>
              )}
            </div>
          )
        )}
      </div>
    </li>
  );
}
