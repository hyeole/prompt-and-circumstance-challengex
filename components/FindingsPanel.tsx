"use client";

import { useEffect, useRef, useState } from "react";
import type { CaseRecord, EvidenceRef, Finding, ReviewResult } from "@/lib/types";
import { CATEGORY, CHECK_STATUS, CITATION_STATUS, ELEMENT_STATUS } from "./categories";
import Icon from "./Icon";

export type Disposition = { state: "acknowledged" | "dismissed"; reason?: string };

const ORDER: Finding["category"][] = ["human_review", "citation", "inconsistency", "missing_element", "unclear"];
const COUNT_CATS: Finding["category"][] = ["inconsistency", "missing_element", "citation", "unclear"];
const CITATION_TONE: Record<ReviewResult["citation"]["status"], string> = {
  consistent: "pill-ok", likely_mismatch: "pill-error", needs_human_review: "pill-review", insufficient_information: "pill-neutral", not_checked: "pill-neutral",
};

export default function FindingsPanel(props: {
  kase: CaseRecord;
  review: ReviewResult | null;
  outdated: boolean;
  running: boolean;
  elapsed: number;
  error: string | null;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onRun: () => void;
  dispositions: Record<string, Disposition>;
  setDisposition: (id: string, d: Disposition) => void;
}) {
  const { review, outdated, running, elapsed, error, onRun } = props;
  const [tab, setTab] = useState<"findings" | "elements" | "checks">("findings");

  if (running && !review) return <aside className="col review" aria-label="Review"><LoadingState elapsed={elapsed} /></aside>;
  if (!review)
    return (
      <aside className="col review" aria-label="Review">
        {error ? (
          <div className="card state">
            <div className="state-icon" style={{ background: "var(--err-bg)", color: "var(--err)" }}><Icon name="alert" size={24} /></div>
            <h3>The review did not complete</h3>
            <p>{error} No results were substituted.</p>
            <button className="btn btn-primary" onClick={onRun}><Icon name="refresh" /> Try again</button>
          </div>
        ) : (
          <div className="card state">
            <div className="state-icon"><Icon name="shield" size={24} /></div>
            <h3>Ready to review</h3>
            <p>NarrativeCheck checks required elements, consistency, clarity, and the selected charge. It never rewrites the narrative or picks a charge.</p>
            <button className="btn btn-primary" onClick={onRun}><Icon name="play" size={14} /> Run review</button>
          </div>
        )}
      </aside>
    );

  const counts = Object.fromEntries(COUNT_CATS.map((c) => [c, review.findings.filter((f) => f.category === c).length]));
  const sorted = [...review.findings].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
  const partial = review.modelStatus !== "ok";

  return (
    <aside className={`col review ${outdated ? "is-outdated" : ""}`} aria-label="Review">
      {outdated && (
        <div className="banner banner-warn" style={{ marginBottom: 12 }} role="status">
          <Icon name="clock" />
          <div><strong>Outdated.</strong> The case changed after this review. Run a fresh review to update the findings.</div>
        </div>
      )}
      {running && <div className="banner banner-info" style={{ marginBottom: 12 }} role="status"><Icon name="clock" /> Reviewing… {elapsed}s</div>}
      {partial && (
        <div className="banner banner-warn" style={{ marginBottom: 12 }} role="alert">
          <Icon name="alert" />
          <div><strong>Partial review.</strong> {review.modelError} Rule-based checks ran; checks marked Unavailable did not run and are not passes.</div>
        </div>
      )}

      <section className="card summary" aria-label="Review summary">
        <div className={`summary-hr ${review.humanReview.required ? "yes" : "no"}`}>
          <div className="hr-icon"><Icon name={review.humanReview.required ? "review" : "check"} size={17} /></div>
          <div>
            <strong>{review.humanReview.required ? "Human review required" : "No human-review trigger found"}</strong>
            {review.humanReview.reasons.length > 0 && (
              <ul>{review.humanReview.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}</ul>
            )}
          </div>
        </div>
        <div className="counts" role="list" aria-label="Findings by category">
          {COUNT_CATS.map((c) => (
            <button key={c} role="listitem" className={`count ${counts[c] ? "" : "zero"}`} onClick={() => { setTab("findings"); const f = sorted.find((x) => x.category === c); if (f) props.onSelect(f.id); }} disabled={!counts[c]} aria-label={`${counts[c]} ${CATEGORY[c].label}`}>
              <div className="n">{counts[c]}</div>
              <div className="l"><Icon name={CATEGORY[c].icon} size={11} />{CATEGORY[c].short}</div>
            </button>
          ))}
        </div>
        {partial && <p className="small muted" style={{ margin: "8px 2px 0" }}>Counts reflect rule-based checks only; the model checks did not run.</p>}
        <div className="citation-line">
          <Icon name="citation" />
          <span className="mono">{review.citation.citation || "No charge selected"}</span>
          <span className={`pill ${CITATION_TONE[review.citation.status]}`}>{CITATION_STATUS[review.citation.status]}</span>
        </div>
        <div className="run-meta">
          <span><Icon name="clock" size={11} /> {(review.latencyMs / 1000).toFixed(1)}s</span>
          <span>{review.model}</span>
          <span>references {review.referenceVersion} (provisional)</span>
        </div>
      </section>

      {review.notes?.map((n, i) => <div key={i} className="note"><Icon name="info" size={14} /><span>{n}</span></div>)}

      <div className="tabs" role="tablist" aria-label="Review details">
        {([["findings", "Findings", review.findings.length], ["elements", "Elements", review.elements.length], ["checks", "Checks", review.checks.length]] as const).map(([id, label, n]) => (
          <button key={id} role="tab" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}<span className="c">{n}</span></button>
        ))}
      </div>

      <div className="tab-panel" role="tabpanel">
        {tab === "findings" && (sorted.length === 0 ? (
          partial ? (
            <div className="card state">
              <div className="state-icon" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}><Icon name="alert" size={22} /></div>
              <h3>No findings from the rule-based checks</h3>
              <p>The model checks did not run, so this is not a clean result. Run a fresh review when the endpoint responds.</p>
              <button className="btn btn-primary btn-sm" onClick={onRun}><Icon name="refresh" size={13} /> Run fresh review</button>
            </div>
          ) : (
            <div className="card state"><div className="state-icon" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}><Icon name="check" size={22} /></div><h3>No findings</h3><p>Every check that ran completed without an issue. See Checks for anything that did not run.</p></div>
          )
        ) : (
          <ol className="finding-list">
            {sorted.map((f) => (
              <FindingCard key={f.id} f={f} kase={props.kase} review={review} selected={props.selected === f.id} onSelect={props.onSelect} disposition={props.dispositions[f.id]} setDisposition={(d) => props.setDisposition(f.id, d)} disabled={outdated} />
            ))}
          </ol>
        ))}
        {tab === "elements" && (
          <ul className="card checklist" aria-label="Required elements">
            {review.elements.map((e) => {
              const st = ELEMENT_STATUS[e.status];
              const linked = review.findings.find((f) => f.referenceIds.includes(e.elementId) && (f.category === "missing_element" || f.category === "unclear"));
              const src = e.fieldPaths.length ? "From the form" : e.sentenceIds.length ? `Narrative ${e.sentenceIds.join(", ")}` : e.status === "absent" ? "Not stated anywhere reviewed" : "";
              const qual = e.status === "present" ? e.qualifier : undefined;
              const qualLabel = qual === "recorded_unknown" ? "Recorded as unknown" : qual === "partly_unknown" ? "Partly unknown" : qual === "see_narrative" ? "Refers to narrative" : null;
              return (
                <li key={e.elementId} className={`check check-${e.status} ${qual ? "is-qualified" : ""}`} title={qual ? e.note : undefined}>
                  <span className="check-ic" aria-hidden><Icon name={qual ? "info" : st.icon} size={14} /></span>
                  <span>{e.label}<span className="check-sub">{src}</span></span>
                  {linked ? <button className="check-st linkish" onClick={() => { setTab("findings"); props.onSelect(linked.id); }}>{st.label}</button> : <span className="check-st">{qualLabel ?? st.label}</span>}
                </li>
              );
            })}
          </ul>
        )}
        {tab === "checks" && (
          <div className="card">
            <table className="check-table">
              <tbody>
                {review.checks.map((c) => (
                  <tr key={c.id}><th scope="row">{c.label}</th><td className={`cs cs-${c.status}`}>{CHECK_STATUS[c.status]}{c.note && <div className="muted small">{c.note}</div>}</td></tr>
                ))}
              </tbody>
            </table>
            <details className="tech" style={{ padding: "8px 12px 12px" }}>
              <summary>Run details</summary>
              <div className="tech-body">
                <div>Prompt {review.promptVersion} · facts {review.modelConfig?.factsPromptVersion} · effort {review.modelConfig?.reasoningEffort} · {review.modelConfig?.validSamples}/{review.modelConfig?.samples} samples valid</div>
                {review.calls?.map((c, i) => <div key={i}>{c.role}: {c.status} in {(c.ms / 1000).toFixed(1)}s ({c.attempts} attempt{c.attempts === 1 ? "" : "s"})</div>)}
                {review.discarded.length > 0 && <div>Withheld (evidence not verifiable): {review.discarded.map((d) => d.title).join("; ")}</div>}
              </div>
            </details>
          </div>
        )}
      </div>
    </aside>
  );
}

function LoadingState({ elapsed }: { elapsed: number }) {
  return (
    <div>
      <div className="card summary" aria-live="polite">
        <div className="summary-hr no" style={{ background: "var(--blue-50)", color: "#1e3f8f" }}>
          <div className="hr-icon"><Icon name="clock" size={17} /></div>
          <div><strong>Reviewing… {elapsed}s</strong><span className="small">The shared model endpoint can be slow. The review stops after 90 seconds. No progress percentage is shown because the model does not report one.</span></div>
        </div>
        <div className="counts">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 52 }} />)}</div>
      </div>
      {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 76, marginBottom: 10 }} />)}
    </div>
  );
}

function evidenceLabel(e: EvidenceRef, kase: CaseRecord, review: ReviewResult) {
  if (e.kind === "missing") return { k: "Not stated", q: `${review.elements.find((x) => x.elementId === e.elementId)?.label ?? "Required element"} is not stated in the narrative or the form.` };
  if (e.kind === "field") {
    const f = kase.facts.find((x) => x.path === e.fieldPath);
    return { k: `Form${e.page ? ` · p.${e.page}` : ""}`, q: `${f?.label ?? (e.fieldPath === "selectedCharges" ? "Selected charges" : e.fieldPath)}: ${e.quote ?? ""}` };
  }
  return { k: `${e.sentenceId}${e.page ? ` · p.${e.page}` : ""}`, q: `“${e.quote}”` };
}

function FindingCard({ f, kase, review, selected, onSelect, disposition, setDisposition, disabled }: {
  f: Finding; kase: CaseRecord; review: ReviewResult; selected: boolean; onSelect: (id: string | null) => void;
  disposition?: Disposition; setDisposition: (d: Disposition) => void; disabled: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState("");
  useEffect(() => { if (selected) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [selected]);
  const cat = CATEGORY[f.category];
  const sevLabel = f.severity === "high" ? "High" : f.severity === "medium" ? "Medium" : "Low";

  return (
    <li ref={ref} className={`finding cat-${f.category} ${selected ? "is-selected" : ""} ${disposition ? `is-${disposition.state}` : ""}`}>
      <button className="finding-head" onClick={() => onSelect(selected ? null : f.id)} aria-expanded={selected}>
        <span className="cat-icon" aria-hidden><Icon name={cat.icon} size={17} /></span>
        <span>
          <span className="finding-kicker">{cat.label}<span className={`sev sev-${f.severity}`}>{sevLabel}</span>{f.needsHumanReview && <span className="sev" style={{ background: "var(--review-bg)", color: "var(--review)" }}>Review</span>}</span>
          <span className="finding-title">{f.title}</span>
          {!selected && <span className="finding-preview">{f.explanation}</span>}
        </span>
      </button>
      {selected && (
        <div className="finding-body">
          <p>{f.explanation}</p>
          <div className="evidence" aria-label="Evidence">
            {f.evidence.map((e, i) => {
              const { k, q } = evidenceLabel(e, kase, review);
              return (
                <button key={i} className="ev" onClick={() => onSelect(f.id)} title={e.kind === "sentence" ? "Show in the narrative" : undefined}>
                  <span className="ev-k">{k}</span>
                  <span>
                    <span className={e.kind === "sentence" ? "ev-q" : undefined}>{q}</span>
                    {e.match === "partial" && <span className="ev-partial">Partial quote: the extracted wording differed; this is the matching source text.</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {f.needsHumanReview && <div className="hr-note"><Icon name="review" size={14} /> <span>{f.humanReviewReason}</span></div>}
          {disposition ? (
            <div className="disposition">{disposition.state === "acknowledged" ? "Acknowledged by reviewer." : `Dismissed: ${disposition.reason}. Dismissing does not confirm the issue is fixed.`}</div>
          ) : !disabled && (
            <div className="finding-actions">
              {dismissing ? (
                <form onSubmit={(e) => { e.preventDefault(); if (reason.trim()) setDisposition({ state: "dismissed", reason: reason.trim() }); }}>
                  <label className="sr-only" htmlFor={`reason-${f.id}`}>Reason for dismissing</label>
                  <input id={`reason-${f.id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" autoFocus />
                  <button className="btn btn-sm btn-secondary" type="submit" disabled={!reason.trim()}>Dismiss</button>
                  <button className="btn btn-sm btn-ghost" type="button" onClick={() => setDismissing(false)}>Cancel</button>
                </form>
              ) : (
                <>
                  <button className="btn btn-sm btn-secondary" onClick={() => setDisposition({ state: "acknowledged" })}><Icon name="check" size={13} /> Acknowledge</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setDismissing(true)}>Dismiss with reason</button>
                </>
              )}
            </div>
          )}
          <details className="tech">
            <summary>Technical details</summary>
            <div className="tech-body">
              <div>ID {f.id} · {f.source === "rule" ? "rule-based check" : "model check, evidence verified against the text"}{f.sampleAgreement ? ` · reported by ${f.sampleAgreement} of ${review.modelConfig?.validSamples ?? 2} samples` : ""}</div>
              {f.evidence.filter((e) => e.kind !== "missing").map((e, i) => <div key={i} className="mono">{e.kind === "field" ? e.fieldPath : `${e.sentenceId} [${e.start}–${e.end}] ${e.match ?? "exact"}`}</div>)}
              {f.referenceIds.length > 0 && <div>Reference {f.referenceIds.join(", ")}</div>}
            </div>
          </details>
        </div>
      )}
    </li>
  );
}
