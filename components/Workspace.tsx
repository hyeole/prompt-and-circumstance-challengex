"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CaseRecord, Finding, ReviewResult } from "@/lib/types";
import DocumentView from "./DocumentView";
import FindingsPanel, { type Disposition } from "./FindingsPanel";
import FactsPanel from "./FactsPanel";
import PrintReport from "./PrintReport";

type Phase = "idle" | "running" | "done" | "error";

const snapshot = (c: CaseRecord) => JSON.stringify([c.narrative.text, c.facts, c.selectedCharges]);
const CLIENT_TIMEOUT_MS = 90_000;

export default function Workspace({
  cases,
  elements,
  referenceVersion,
  referenceNotice,
}: {
  cases: CaseRecord[];
  elements: { id: string; label: string }[];
  referenceVersion: string;
  referenceNotice: string;
}) {
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");
  // Working copies: officers may edit their own text; the original record stays untouched in `cases`.
  const [working, setWorking] = useState<Record<string, CaseRecord>>({});
  const current = working[caseId] ?? cases.find((c) => c.id === caseId)!;
  const original = cases.find((c) => c.id === caseId)!;

  const [reviews, setReviews] = useState<Record<string, { result: ReviewResult; snap: string }>>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [factsOpen, setFactsOpen] = useState(true);
  const [editing, setEditing] = useState(false);
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

  function update(next: CaseRecord) {
    setWorking((w) => ({ ...w, [caseId]: next }));
  }

  async function runReview() {
    if (phase === "running") return;
    setEditing(false);
    setPhase("running");
    setError(null);
    setElapsed(0);
    setSelected(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
    const snap = snapshot(current);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case: current }),
        signal: ctrl.signal,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Review request failed (HTTP ${res.status}).`);
      setReviews((r) => ({ ...r, [caseId]: { result: body as ReviewResult, snap } }));
      setDispositions((d) => ({ ...d, [caseId]: {} }));
      setPhase("done");
    } catch (e) {
      const msg = (e as Error).name === "AbortError" ? "The review took longer than 90 seconds and was stopped. The shared model endpoint may be busy; try again." : (e as Error).message;
      setError(msg);
      setPhase("error");
    } finally {
      clearTimeout(timer);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function switchCase(id: string) {
    if (phase === "running") return;
    setCaseId(id);
    setSelected(null);
    setEditing(false);
    setPhase(reviews[id] ? "done" : "idle");
    setError(null);
  }

  const findings: Finding[] = review?.result.findings ?? [];
  const status = useMemo(() => {
    if (phase === "running") return { label: `Reviewing… ${elapsed}s`, tone: "info" };
    if (phase === "error" && !review) return { label: "Review failed", tone: "error" };
    if (!review) return { label: "Not reviewed", tone: "neutral" };
    if (outdated) return { label: "Outdated: re-run review", tone: "warn" };
    if (review.result.modelStatus !== "ok") return { label: "Partial review", tone: "warn" };
    return { label: review.result.humanReview.required ? "Reviewed: needs human review" : "Reviewed", tone: review.result.humanReview.required ? "warn" : "ok" };
  }, [phase, elapsed, review, outdated]);

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            NC
          </span>
          <div>
            <div className="brand-name">NarrativeCheck</div>
            <div className="brand-sub">Charge documentation review</div>
          </div>
        </div>
        <div className="topbar-case">
          <label htmlFor="case-select" className="field-label">
            Case
          </label>
          <select id="case-select" value={caseId} onChange={(e) => switchCase(e.target.value)} disabled={phase === "running"}>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} · {c.title}
              </option>
            ))}
          </select>
          <span className={`tag tag-${current.kind}`}>{kindLabel(current.kind)}</span>
          {edited && <span className="tag tag-edited">Edited copy</span>}
        </div>
        <div className="topbar-actions">
          <span className={`status status-${status.tone}`} role="status" aria-live="polite">
            {status.label}
          </span>
          {phase === "running" ? (
            <button className="btn btn-secondary" onClick={cancel}>
              Cancel
            </button>
          ) : (
            <button className="btn btn-primary" onClick={runReview}>
              {review ? "Run fresh review" : "Run review"}
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => window.print()} disabled={!review || outdated || phase === "running"} title={!review ? "Run a review first" : outdated ? "Re-run the review after edits before exporting" : "Print or save a one-page report"}>
            Export report
          </button>
        </div>
      </header>

      {error && (
        <div className="banner banner-error no-print" role="alert">
          <strong>Review not completed.</strong> {error} No results were substituted.
        </div>
      )}

      <main className={`workspace no-print ${factsOpen ? "" : "facts-collapsed"}`}>
        <FactsPanel
          open={factsOpen}
          onToggle={() => setFactsOpen((o) => !o)}
          kase={current}
          original={original}
          onChange={update}
          selectedField={findings.find((f) => f.id === selected)?.evidence.filter((e) => e.kind === "field").map((e) => e.fieldPath!) ?? []}
          disabled={phase === "running"}
        />
        <DocumentView
          kase={current}
          original={original}
          review={review && !outdated ? review.result : null}
          outdated={outdated}
          selected={selected}
          onSelect={setSelected}
          editing={editing}
          setEditing={setEditing}
          onChange={update}
          disabled={phase === "running"}
        />
        <FindingsPanel
          review={review?.result ?? null}
          outdated={outdated}
          running={phase === "running"}
          elapsed={elapsed}
          selected={selected}
          onSelect={setSelected}
          elements={elements}
          dispositions={dispositions[caseId] ?? {}}
          setDisposition={(id, d) => setDispositions((all) => ({ ...all, [caseId]: { ...(all[caseId] ?? {}), [id]: d } }))}
          referenceVersion={referenceVersion}
          referenceNotice={referenceNotice}
        />
      </main>

      <footer className="footer no-print">
        <span>Decision support only. Findings are not legal determinations; the officer keeps the narrative and the charge.</span>
        <span className="credit">Built by Prompt &amp; Circumstance</span>
      </footer>

      {review && !outdated && <PrintReport kase={current} review={review.result} dispositions={dispositions[caseId] ?? {}} edited={edited} />}
    </div>
  );
}

export function kindLabel(kind: CaseRecord["kind"]) {
  return kind === "adapted-public-record" ? "Adapted public record" : kind === "synthetic-variant" ? "Team test variant" : "Synthetic";
}
