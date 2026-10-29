"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CaseRecord, Finding, ReviewResult } from "@/lib/types";
import DocumentView from "./DocumentView";
import FindingsPanel, { type Disposition } from "./FindingsPanel";
import FactsPanel from "./FactsPanel";
import PrintReport from "./PrintReport";
import Icon from "./Icon";

type Phase = "idle" | "running" | "done" | "error";
type Drawer = null | "cases" | "references";

const snapshot = (c: CaseRecord) => JSON.stringify([c.narrative.text, c.facts, c.selectedCharges]);
const CLIENT_TIMEOUT_MS = 90_000;

/** Short display title: the variant tag is shown separately, and long titles are cut at a word boundary. */
export function shortTitle(title: string, max = 54) {
  const t = title.replace(/\s*\[test variant [^\]]*\]\s*$/i, "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ") > 30 ? cut.lastIndexOf(" ") : max).replace(/[,(]\s*$/, "") + "…";
}

export function kindLabel(kind: CaseRecord["kind"]) {
  return kind === "adapted-public-record" ? "Adapted public record" : kind === "synthetic-variant" ? "Team test variant" : "Synthetic";
}

export default function Workspace({ cases, initialCaseId, caseSet = "app", referenceVersion, referenceNotice, glossary }: {
  cases: CaseRecord[]; initialCaseId?: string; caseSet?: "app" | "eval";
  elements: { id: string; label: string }[]; referenceVersion: string; referenceNotice: string; glossary?: Record<string, string>;
}) {
  const [caseId, setCaseId] = useState(initialCaseId ?? cases[0]?.id ?? "");
  const [working, setWorking] = useState<Record<string, CaseRecord>>({});
  const original = cases.find((c) => c.id === caseId)!;
  const current = working[caseId] ?? original;

  const [reviews, setReviews] = useState<Record<string, { result: ReviewResult; snap: string }>>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [factsOpen, setFactsOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dispositions, setDispositions] = useState<Record<string, Record<string, Disposition>>>({});
  const abortRef = useRef<AbortController | null>(null);

  const review = reviews[caseId];
  const outdated = !!review && review.snap !== snapshot(current);
  const edited = snapshot(current) !== snapshot(original);

  useEffect(() => {
    if (phase !== "running") return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const update = (next: CaseRecord) => setWorking((w) => ({ ...w, [caseId]: next }));

  async function runReview() {
    if (phase === "running") return;
    setEditing(false); setPhase("running"); setError(null); setElapsed(0); setSelected(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
    const snap = snapshot(current);
    try {
      const res = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case: current }), signal: ctrl.signal });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Review request failed (HTTP ${res.status}).`);
      setReviews((r) => ({ ...r, [caseId]: { result: body as ReviewResult, snap } }));
      setDispositions((d) => ({ ...d, [caseId]: {} }));
      setPhase("done");
    } catch (e) {
      setError((e as Error).name === "AbortError" ? "The review took longer than 90 seconds and was stopped. The shared model endpoint may be busy." : (e as Error).message);
      setPhase("error");
    } finally {
      clearTimeout(timer);
    }
  }

  function switchCase(id: string) {
    if (phase === "running") return;
    setCaseId(id); setSelected(null); setEditing(false); setDetailsOpen(false); setPhase(reviews[id] ? "done" : "idle"); setError(null); setDrawer(null);
  }

  const findings: Finding[] = review?.result.findings ?? [];
  const status = useMemo(() => {
    if (phase === "running") return { label: `Reviewing… ${elapsed}s`, tone: "info", pulse: true };
    if (phase === "error" && !review) return { label: "Review failed", tone: "error" };
    if (!review) return { label: "Not reviewed", tone: "neutral" };
    if (outdated) return { label: "Outdated", tone: "warn" };
    if (review.result.modelStatus !== "ok") return { label: "Partial review", tone: "warn" };
    return review.result.humanReview.required ? { label: "Needs human review", tone: "review" } : { label: "Reviewed", tone: "ok" };
  }, [phase, elapsed, review, outdated]);

  return (
    <div className="shell">
      <nav className="rail no-print" aria-label="Main">
        <button className={`rail-btn ${drawer === null ? "is-active" : ""}`} onClick={() => setDrawer(null)} aria-label="Review workspace" data-tip="Review workspace"><Icon name="doc" size={19} /></button>
        <button className={`rail-btn ${drawer === "cases" ? "is-active" : ""}`} onClick={() => setDrawer(drawer === "cases" ? null : "cases")} aria-label="Cases" data-tip="Cases" aria-expanded={drawer === "cases"}><Icon name="folder" size={19} /></button>
        <button className={`rail-btn ${drawer === "references" ? "is-active" : ""}`} onClick={() => setDrawer(drawer === "references" ? null : "references")} aria-label="References and form abbreviations" data-tip="References" aria-expanded={drawer === "references"}><Icon name="book" size={19} /></button>
        <div className="rail-spacer" />
        <div className="rail-credit" title="Built by Prompt & Circumstance" aria-label="Built by Prompt and Circumstance">P&amp;C</div>
      </nav>

      <div className="main">
        <header className="header no-print">
          <div className="brand">
            <div className="brand-mark" aria-hidden>NC</div>
            <div>
              <div className="wordmark">Narrative<span>Check</span></div>
              <div className="tagline">Charge documentation review</div>
            </div>
          </div>
          <div className="header-title" style={{ minWidth: 0, flex: 1 }}>
            <div className="crumbs">
              <button onClick={() => setDrawer("cases")}>{caseSet === "eval" ? "Evaluation set" : "Cases"}</button>
              <Icon name="chevronRight" size={11} />
              <span className="mono">{current.id}</span>
              <span className={`tag ${current.kind === "synthetic-variant" ? "tag-variant" : ""}`}>{kindLabel(current.kind)}</span>
              {edited && <span className="tag tag-edited">Edited copy</span>}
            </div>
            <button className="title-btn" onClick={() => setDetailsOpen((o) => !o)} aria-expanded={detailsOpen} aria-controls="case-details" title={current.title}>
              <h1>{shortTitle(current.title)}</h1>
              <Icon name="chevronDown" size={15} />
              <span className="sr-only">Show case details</span>
            </button>
          </div>
          <div className="header-actions">
            <span className={`pill pill-${status.tone}`} role="status" aria-live="polite"><span className={`dot ${status.pulse ? "pulse" : ""}`} />{status.label}</span>
            {phase === "running" ? (
              <button className="btn btn-secondary" onClick={() => abortRef.current?.abort()}>Cancel</button>
            ) : (
              <button className="btn btn-primary" onClick={runReview}><Icon name={review ? "refresh" : "play"} size={14} />{review ? "Run fresh review" : "Run review"}</button>
            )}
            <button className="btn btn-secondary" onClick={() => window.print()} disabled={!review || outdated || phase === "running"} title={!review ? "Run a review first" : outdated ? "Re-run the review after edits before exporting" : "Print or save a one-page report"}>
              <Icon name="download" size={14} /> Export report
            </button>
          </div>
        </header>

        {detailsOpen && (
          <section id="case-details" className="card case-details no-print" aria-label="Case details">
            <dl>
              <dt>Full title</dt><dd>{current.title}</dd>
              <dt>Case ID</dt><dd className="mono">{current.id}{current.baseCaseId ? ` (variant of ${current.baseCaseId})` : ""}</dd>
              <dt>Type</dt><dd>{kindLabel(current.kind)}</dd>
              {current.provenance.pdfPages && <><dt>Source PDF pages</dt><dd>{current.provenance.pdfPages.join(", ")}</dd></>}
              {current.provenance.modifications?.length ? <><dt>Team test edit</dt><dd>{current.provenance.modifications.join("; ")}</dd></> : null}
              <dt>Source</dt><dd>{current.provenance.source}</dd>
              <dt>Verification</dt><dd>{current.provenance.verification}</dd>
            </dl>
          </section>
        )}
        {caseSet === "eval" && <div className="banner banner-info no-print" style={{ borderRadius: 0, borderWidth: "0 0 1px" }}><Icon name="layers" /> Evaluation set: team-created test variants of adapted public records. Not sponsor data.</div>}
        {error && review && <div className="banner banner-error no-print" style={{ borderRadius: 0, borderWidth: "0 0 1px" }} role="alert"><Icon name="alert" /> <span><strong>The latest review did not complete.</strong> {error} The findings shown are from the previous review.</span></div>}

        <div className={`body no-print ${factsOpen ? "" : "facts-collapsed"}`}>
          <FactsPanel open={factsOpen} onToggle={() => setFactsOpen((o) => !o)} kase={current} original={original} onChange={update}
            linkedFields={findings.find((f) => f.id === selected)?.evidence.filter((e) => e.kind === "field").map((e) => e.fieldPath!) ?? []} disabled={phase === "running"} />
          <DocumentView kase={current} original={original} review={review && !outdated ? review.result : null} outdated={outdated} selected={selected} onSelect={setSelected}
            editing={editing} setEditing={setEditing} onChange={update} disabled={phase === "running"} />
          <FindingsPanel kase={current} review={review?.result ?? null} outdated={outdated} running={phase === "running"} elapsed={elapsed} error={phase === "error" ? error : null}
            selected={selected} onSelect={setSelected} onRun={runReview} dispositions={dispositions[caseId] ?? {}}
            setDisposition={(id, d) => setDispositions((all) => ({ ...all, [caseId]: { ...(all[caseId] ?? {}), [id]: d } }))} />
        </div>

        <footer className="footer no-print">
          <span>Decision support only. Findings are not legal determinations; the officer keeps the narrative and the charge.</span>
          <span className="credit">Built by Prompt &amp; Circumstance</span>
        </footer>
      </div>

      {drawer && (
        <>
          <div className="scrim no-print" onClick={() => setDrawer(null)} />
          <aside className="drawer no-print" role="dialog" aria-modal="true" aria-label={drawer === "cases" ? "Cases" : "References"}>
            <div className="drawer-head">
              <h2>{drawer === "cases" ? "Cases" : "References"}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setDrawer(null)} aria-label="Close"><Icon name="x" size={15} /></button>
            </div>
            <div className="drawer-body">
              {drawer === "cases" ? cases.map((c) => {
                const r = reviews[c.id]?.result;
                return (
                  <button key={c.id} className={`case-item ${c.id === caseId ? "is-current" : ""}`} onClick={() => switchCase(c.id)} disabled={phase === "running"}>
                    <span className="t">{c.title}</span>
                    <span className="mono small">{c.id}</span>
                    <span className="s">{kindLabel(c.kind)}{r ? ` · reviewed: ${r.findings.length} finding${r.findings.length === 1 ? "" : "s"}${r.humanReview.required ? ", needs human review" : ""}` : " · not reviewed"}</span>
                  </button>
                );
              }) : (
                <div className="ref-section">
                  <h3>Reference version {referenceVersion}</h3>
                  <p>{referenceNotice}</p>
                  {glossary && (
                    <>
                      <h3>Form abbreviations</h3>
                      <ul>{Object.entries(glossary).filter(([k]) => k !== "note").map(([k, v]) => <li key={k}><span className="mono">{k}</span>: {v}</li>)}</ul>
                    </>
                  )}
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {review && !outdated && <PrintReport kase={current} review={review.result} dispositions={dispositions[caseId] ?? {}} edited={edited} />}
    </div>
  );
}
