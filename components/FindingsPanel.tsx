"use client";

import { useEffect, useRef, useState } from "react";
import { completionOf } from "@/lib/completion";
import type { CaseRecord, EvidenceRef, Finding, ReviewResult } from "@/lib/types";
import { CATEGORY, CHECK_STATUS, CITATION_STATUS, ELEMENT_STATUS } from "./categories";
import Icon from "./Icon";

export type Decision = { state: "open" | "acknowledged" | "dismissed"; note?: string; decidedAt?: string };

const ORDER: Finding["category"][] = ["human_review", "citation", "inconsistency", "missing_element", "unclear"];
const COUNT_CATS: Finding["category"][] = ["inconsistency", "missing_element", "citation", "unclear"];
const CITATION_TONE: Record<ReviewResult["citation"]["status"], string> = {
  consistent: "pill-ok", likely_mismatch: "pill-error", needs_human_review: "pill-review", insufficient_information: "pill-neutral", not_checked: "pill-neutral",
};

const FIELD_LABEL: Record<string, string> = { "entry.date": "entry date", "entry.manner": "manner of entry", "entry.place": "place of entry", "history.immigration_record": "immigration history", narrative: "two narrative accounts" };
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
  decisions: Record<string, Decision>;
  onDecide: (findingId: string, d: { state: Decision["state"]; note?: string }) => Promise<void>;
  readOnly: boolean;
  pdfAvailable: boolean;
  caseId: string;
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
  const completion = completionOf(review);
  const partial = completion.status === "partial";

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
          <div><strong>Partial review.</strong> Did not complete: {completion.failed.map((f) => `${f.check} (${f.reason})`).join("; ")}. Checks marked Unavailable or Partial did not fully run and are not passes.</div>
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
            {(review.humanReview.accounts ?? []).map((g, i) => (
              <div key={i} className="hr-account">
                <strong>Whose account? ({FIELD_LABEL[g.fieldPath ?? "narrative"] ?? g.fieldPath})</strong> Several people are described with redacted names, and nothing ties {g.sentenceIds.join(", ")} uniquely to this subject. Not treated as a contradiction.
                <ul>{g.details.map((d, j) => <li key={j}>{d}</li>)}</ul>
              </div>
            ))}
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
        {partial && <p className="small muted" style={{ margin: "8px 2px 0" }}>Findings from completed checks only. The model checks did not run.</p>}
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
        {([["findings", "Findings", review.findings.length], ["elements", "Elements", review.elements.filter((e) => e.status !== "not_applicable").length], ["checks", "Checks", review.checks.length]] as const).map(([id, label, n]) => (
          <button key={id} role="tab" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}<span className="c">{n}</span></button>
        ))}
      </div>

      <div className="tab-panel" role="tabpanel">
        {tab === "findings" && (sorted.length === 0 ? (
          partial ? (
            <div className="card state">
              <div className="state-icon" style={{ background: "#e9eef4", color: "#46546a" }}><Icon name="clock" size={22} /></div>
              <h3>Review incomplete</h3>
              <p>No findings came from the checks that completed, but the model checks did not run. This is not a clean result. Run a fresh review when the endpoint responds.</p>
              <button className="btn btn-primary btn-sm" onClick={onRun}><Icon name="refresh" size={13} /> Run fresh review</button>
            </div>
          ) : (
            <div className="card state"><div className="state-icon" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}><Icon name="check" size={22} /></div><h3>No findings</h3><p>Every check that ran completed without an issue. See Checks for anything that did not run.</p></div>
          )
        ) : (
          <ol className="finding-list">
            {sorted.map((f) => (
              <FindingCard key={f.id} f={f} kase={props.kase} review={review} selected={props.selected === f.id} onSelect={props.onSelect} decision={props.decisions[f.id]} onDecide={(d) => props.onDecide(f.id, d)} readOnly={props.readOnly} pdfHref={props.pdfAvailable ? `/api/cases/${encodeURIComponent(props.caseId)}/pdf` : null}
                onMove={(dir) => { const i = sorted.findIndex((x) => x.id === f.id); const n = sorted[i + dir]; if (n) props.onSelect(n.id); }} />
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
              // "Established" means usable information is recorded; "Documented as unknown" means the officer recorded
              // that it is unknown, which is not the same as establishing it.
              const qualLabel = qual === "recorded_unknown" ? "Documented as unknown" : qual === "partly_unknown" ? "Partly established" : qual === "see_narrative" ? "Refers to narrative" : null;
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

const WHO: Record<string, string> = { subject: "Subject (named as “Subject” in the text)", unclear: "Unattributed (names redacted)", other: "A different person" };

/** One piece of evidence: the full source sentence with the quoted words marked, plus its context and match type. */
function EvidenceItem({ e, kase, review, pdfHref }: { e: EvidenceRef; kase: CaseRecord; review: ReviewResult; pdfHref: string | null }) {
  if (e.kind === "missing") {
    const el = review.elements.find((x) => x.elementId === e.elementId);
    return <div className="stmt"><div className="who"><span className="match match-none">Not stated</span>{el?.sponsorCategory && <span>Sponsor category {el.sponsorCategory}</span>}</div>{el?.label ?? "Required element"} is not stated in the narrative or the form fields reviewed. There is no source text to point to.</div>;
  }
  if (e.kind === "field") {
    const f = kase.facts.find((x) => x.path === e.fieldPath);
    return (
      <div className="stmt">
        <div className="who"><span className="match match-exact">Form field</span><span>{f?.sourceField ?? f?.label ?? e.fieldPath}</span>{e.page && <span>PDF p.{e.page}</span>}</div>
        <strong>{f?.label ?? (e.fieldPath === "selectedCharges" ? "Selected charges" : e.fieldPath)}:</strong> {e.quote}
        {pdfHref && e.page && <div><a className="small" href={`${pdfHref}#page=${e.page}`} target="_blank" rel="noopener">Open source page {e.page} <Icon name="external" size={11} /></a></div>}
      </div>
    );
  }
  const s = review.sentences.find((x) => x.id === e.sentenceId);
  const text = s?.text ?? e.quote ?? "";
  const qs = e.start != null && s ? e.start - s.start : -1;
  const qe = e.end != null && s ? e.end - s.start : -1;
  return (
    <div className="stmt">
      <div className="who">
        <span className={`match ${e.match === "partial" ? "match-partial" : "match-exact"}`}>{e.match === "partial" ? "Partial quote" : "Exact quote"}</span>
        {e.context?.attribution && <span>{WHO[e.context.attribution]}</span>}
        {e.context?.event && <span>{e.context.event}</span>}
        <span>{e.sentenceId}{(e.page ?? s?.page) ? ` · PDF p.${e.page ?? s?.page}` : ""}</span>
      </div>
      <span className="ev-q">{qs >= 0 && qe > qs ? <>{text.slice(0, qs)}<mark>{text.slice(qs, qe)}</mark>{text.slice(qe)}</> : text}</span>
      {e.match === "partial" && <div className="ev-partial">The extracted wording differed; the marked words are the matching source text and contain the fact being compared.</div>}
      {pdfHref && (e.page ?? s?.page) && <div><a className="small" href={`${pdfHref}#page=${e.page ?? s?.page}`} target="_blank" rel="noopener">Open source page {e.page ?? s?.page} <Icon name="external" size={11} /></a> <span className="small muted">(page only; the exact position on the page is not mapped)</span></div>}
    </div>
  );
}

function FindingCard({ f, kase, review, selected, onSelect, decision, onDecide, readOnly, pdfHref, onMove }: {
  f: Finding; kase: CaseRecord; review: ReviewResult; selected: boolean; onSelect: (id: string | null) => void;
  decision?: Decision; onDecide: (d: { state: Decision["state"]; note?: string }) => Promise<void>; readOnly: boolean; pdfHref: string | null; onMove: (dir: 1 | -1) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [note, setNote] = useState(decision?.note ?? "");
  const [pending, setPending] = useState<Decision["state"] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (selected) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [selected]);
  useEffect(() => { setNote(decision?.note ?? ""); }, [decision?.note]);
  const cat = CATEGORY[f.category];
  const sevLabel = f.severity === "high" ? "High" : f.severity === "medium" ? "Medium" : "Low";
  const state = decision?.state ?? "open";
  const sentenceEv = f.evidence.filter((e) => e.kind === "sentence" || e.kind === "field");
  const sideBySide = f.category === "inconsistency" && sentenceEv.length >= 2;

  async function choose(s: Decision["state"]) {
    setErr(null);
    if (s === "dismissed" && !note.trim()) { setErr("Add a note explaining why it is dismissed."); return; }
    setPending(s);
    try { await onDecide({ state: s, note: note.trim() || undefined }); } catch (e) { setErr((e as Error).message); } finally { setPending(null); }
  }

  return (
    <li ref={ref} className={`finding cat-${f.category} ${selected ? "is-selected" : ""} ${state === "dismissed" ? "is-dismissed" : ""}`}>
      <button className="finding-head" onClick={() => onSelect(selected ? null : f.id)} aria-expanded={selected}
        onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); onMove(1); } if (e.key === "ArrowUp") { e.preventDefault(); onMove(-1); } }}>
        <span className="cat-icon" aria-hidden><Icon name={cat.icon} size={17} /></span>
        <span>
          <span className="finding-kicker">{cat.label}<span className={`sev sev-${f.severity}`}>{sevLabel}</span>{f.needsHumanReview && <span className="sev" style={{ background: "var(--review-bg)", color: "var(--review)" }}>Review</span>}{state !== "open" && <span className="sev" style={{ background: "var(--navy-100)", color: "var(--navy-800)" }}>{state === "acknowledged" ? "Acknowledged" : "Dismissed"}</span>}</span>
          <span className="finding-title">{f.title}</span>
          {!selected && <span className="finding-preview">{f.explanation}</span>}
        </span>
      </button>
      {selected && (
        <div className="finding-body">
          <p>{f.explanation}</p>
          {sideBySide ? (
            <div className="side-by-side" aria-label="Conflicting sources">
              {sentenceEv.slice(0, 2).map((e, i) => <div key={i}><div className="small muted" style={{ marginBottom: 4 }}>{i === 0 ? "Statement A" : "Statement B"}</div><EvidenceItem e={e} kase={kase} review={review} pdfHref={pdfHref} /></div>)}
              {sentenceEv.length > 2 && <div style={{ gridColumn: "1 / -1" }}>{sentenceEv.slice(2).map((e, i) => <EvidenceItem key={i} e={e} kase={kase} review={review} pdfHref={pdfHref} />)}</div>}
            </div>
          ) : (
            <div className="evidence" aria-label="Evidence">{f.evidence.map((e, i) => <EvidenceItem key={i} e={e} kase={kase} review={review} pdfHref={pdfHref} />)}</div>
          )}
          {f.needsHumanReview && <div className="hr-note"><Icon name="review" size={14} /> <span>{f.humanReviewReason}</span></div>}

          <div className="decision" aria-label="Officer decision">
            <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Officer decision <span className="muted" style={{ fontWeight: 400 }}>(saved separately; the finding itself is never changed)</span></div>
            <label className="sr-only" htmlFor={`note-${f.id}`}>Officer note</label>
            <input id={`note-${f.id}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (required to dismiss)" disabled={readOnly} maxLength={1000} style={{ width: "100%", padding: "6px 9px", border: "1px solid var(--line-2)", borderRadius: 7, fontSize: 12.5, marginBottom: 6 }} />
            <div className="decision-bar">
              <div className="seg" role="group" aria-label="Decision">
                {(["open", "acknowledged", "dismissed"] as const).map((s) => (
                  <button key={s} aria-pressed={state === s} disabled={readOnly || pending !== null} onClick={() => choose(s)}>{s === "open" ? "Open" : s === "acknowledged" ? "Acknowledged" : "Dismissed"}</button>
                ))}
              </div>
              {decision?.decidedAt && <span className="small muted">saved {new Date(decision.decidedAt).toLocaleString()}</span>}
            </div>
            {state === "dismissed" && <div className="small muted" style={{ marginTop: 4 }}>Dismissing records the officer's judgment. It does not confirm the issue is fixed, and the case is not marked clean.</div>}
            {readOnly && <div className="small muted" style={{ marginTop: 4 }}>Decisions can be changed only on the latest, current review.</div>}
            {err && <div className="small" role="alert" style={{ color: "var(--err)", marginTop: 4 }}>{err}</div>}
          </div>

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
