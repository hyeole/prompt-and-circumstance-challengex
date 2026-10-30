"use client";

import Link from "next/link";
import { isComplete } from "@/lib/completion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CaseRecord, ReviewResult } from "@/lib/types";
import type { CaseHistory, Decision } from "@/lib/store";
import AppShell from "./AppShell";
import DocumentView from "./DocumentView";
import FindingsPanel from "./FindingsPanel";
import FactsPanel from "./FactsPanel";
import PrintReport from "./PrintReport";
import Icon from "./Icon";

type Phase = "idle" | "running" | "done" | "error" | "cancelled";
type Snap = Pick<CaseRecord, "narrative" | "facts" | "selectedCharges">;
const snapKey = (c: Snap) => JSON.stringify([c.narrative.text, c.facts, c.selectedCharges]);
const CLIENT_TIMEOUT_MS = 90_000;
const sessionKey = (id: string) => `nc:unsaved:${id}`;

/** Short display title: the variant tag is shown separately, and long titles are cut at a word boundary. */
export function shortTitle(title: string, max = 54) {
  const t = title.replace(/\s*\[test variant [^\]]*\]\s*$/i, "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ") > 30 ? cut.lastIndexOf(" ") : max).replace(/[,(]\s*$/, "") + "…";
}

export function kindLabel(kind: CaseRecord["kind"]) {
  return kind === "adapted-public-record" ? "Adapted source record" : kind === "synthetic-variant" ? "Synthetic test variant" : kind === "user-case" ? "Entered case" : "Synthetic";
}

export default function ReviewWorkspace({ kase: original, initialHistory, pdf, viewVersion: requestedVersion }: {
  kase: CaseRecord; initialHistory: CaseHistory; pdf: string | null; viewVersion?: number;
}) {
  const caseId = original.id;
  const [history, setHistory] = useState(initialHistory);
  const latest = history.versions.at(-1);
  const viewVersion = requestedVersion && requestedVersion !== latest?.version ? requestedVersion : null;
  const shown = viewVersion ? history.versions.find((v) => v.version === viewVersion) : latest;
  const viewingOld = !!viewVersion && !!shown;

  // The working copy starts from the latest reviewed snapshot; unreviewed edits are kept in this browser session.
  const base: CaseRecord = latest ? { ...original, ...latest.snapshot } : original;
  const [working, setWorking] = useState<CaseRecord | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(sessionKey(caseId));
      if (raw) setWorking({ ...base, ...(JSON.parse(raw) as Snap) });
    } catch { /* storage unavailable: edits stay in memory only */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);
  const current = viewingOld ? { ...original, ...shown!.snapshot } : working ?? base;
  const unsavedEdits = !viewingOld && snapKey(working ?? base) !== snapKey(base);

  useEffect(() => {
    if (!unsavedEdits) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsavedEdits]);

  function update(next: CaseRecord) {
    setWorking(next);
    try { sessionStorage.setItem(sessionKey(caseId), JSON.stringify({ narrative: next.narrative, facts: next.facts, selectedCharges: next.selectedCharges })); } catch { /* ignore */ }
  }
  function discardEdits() {
    setWorking(null);
    try { sessionStorage.removeItem(sessionKey(caseId)); } catch { /* ignore */ }
  }

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [factsOpen, setFactsOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0); // guards against stale responses after cancel or retry
  const requestRef = useRef<string | null>(null); // id of the in-flight review, so it can be cancelled on the server
  const [cancelNote, setCancelNote] = useState<string | null>(null);

  // Leaving the page (or this case) mid-review cancels the request on the server, so nothing is saved behind the
  // officer's back. Unsaved edits stay in this browser session either way.
  useEffect(() => {
    const leave = () => {
      if (!requestRef.current) return;
      try { navigator.sendBeacon("/api/review/cancel", JSON.stringify({ requestId: requestRef.current })); } catch { /* ignore */ }
      requestRef.current = null;
      abortRef.current?.abort("cancel");
    };
    window.addEventListener("pagehide", leave);
    return () => { window.removeEventListener("pagehide", leave); leave(); };
  }, [caseId]);

  const reviewed: ReviewResult | null = shown?.review ?? null;
  const outdated = !!reviewed && !viewingOld && snapKey(shown!.snapshot) !== snapKey(current);
  const editedFromSource = snapKey(current) !== snapKey(original);
  const decisions = (reviewed && history.decisions[reviewed.reviewId]) || {};

  useEffect(() => {
    if (phase !== "running") return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, [phase]);

  async function refreshHistory() {
    const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}`, { cache: "no-store" });
    if (res.ok) setHistory(((await res.json()) as { history: CaseHistory }).history);
  }

  async function runReview() {
    if (phase === "running" || viewingOld) return;
    const seq = ++seqRef.current;
    const requestId = crypto.randomUUID();
    requestRef.current = requestId;
    setEditing(false); setPhase("running"); setError(null); setElapsed(0); setSelected(null); setCancelNote(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort("timeout"), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case: current, save: true, requestId }), signal: ctrl.signal });
      const body = await res.json().catch(() => ({}));
      if (seq !== seqRef.current) return; // superseded by a cancel or a newer request: ignore the late result
      requestRef.current = null;
      if (!res.ok) throw new Error(body.error ?? `Review request failed (HTTP ${res.status}).`);
      await refreshHistory();
      discardEdits(); // the reviewed snapshot is now saved as a version
      setPhase("done");
    } catch (e) {
      if (seq !== seqRef.current) return;
      const aborted = (e as Error).name === "AbortError";
      if (aborted && ctrl.signal.reason !== "timeout") { setPhase("cancelled"); return; }
      setError(aborted ? "The review took longer than 90 seconds and was stopped. The shared model endpoint may be busy." : (e as Error).message);
      setPhase("error");
    } finally {
      clearTimeout(timer);
      if (requestRef.current === requestId) requestRef.current = null;
    }
  }

  /** Cancel on the server first; it says whether the review had already been saved before the cancel arrived. */
  async function cancel() {
    const requestId = requestRef.current;
    seqRef.current++;
    requestRef.current = null;
    abortRef.current?.abort("cancel");
    setPhase("cancelled");
    setCancelNote("Cancelling…");
    let outcome: { status?: string; version?: number } = {};
    if (requestId) {
      try {
        const res = await fetch("/api/review/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId }) });
        outcome = await res.json();
      } catch { /* network failure: the history reload below shows what was saved */ }
    }
    await refreshHistory().catch(() => {});
    if (outcome.status === "saved") {
      discardEdits();
      setCancelNote(`The review finished before the cancel arrived and was saved as version ${outcome.version}. It is shown below.`);
    } else if (outcome.status === "cancelled" || outcome.status === "unknown") {
      setCancelNote(`Nothing was saved from the cancelled request${reviewed ? "; the findings shown are from the previous saved review" : ""}.`);
    } else {
      setCancelNote("The server could not confirm the cancel. Check Review history to see whether a new version was saved.");
    }
  }

  async function decide(findingId: string, d: Pick<Decision, "state" | "note">) {
    if (!reviewed) return;
    const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/decisions`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId: reviewed.reviewId, findingId, ...d }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not save the decision.");
    const saved = (await res.json()) as Decision;
    setHistory((h) => ({ ...h, decisions: { ...h.decisions, [reviewed.reviewId]: { ...(h.decisions[reviewed.reviewId] ?? {}), [findingId]: saved } } }));
  }

  const status = useMemo(() => {
    if (phase === "running") return { label: `Reviewing… ${elapsed}s`, tone: "info", pulse: true };
    if (phase === "error" && !reviewed) return { label: "Review failed", tone: "error" };
    if (!reviewed) return { label: "Not reviewed", tone: "neutral" };
    if (viewingOld) return { label: `Viewing version ${viewVersion} (older)`, tone: "neutral" };
    if (outdated) return { label: "Outdated", tone: "warn" };
    if (!isComplete(reviewed)) return { label: "Review incomplete", tone: "warn" };
    return reviewed.humanReview.required ? { label: "Needs human review", tone: "review" } : { label: "Reviewed", tone: "ok" };
  }, [phase, elapsed, reviewed, outdated, viewingOld, viewVersion]);

  const actions = (
    <>
      <span className={`pill pill-${status.tone}`} role="status" aria-live="polite"><span className={`dot ${status.pulse ? "pulse" : ""}`} />{status.label}</span>
      {phase === "running" ? (
        <button className="btn btn-secondary" onClick={cancel}>Cancel</button>
      ) : (
        <button className="btn btn-primary" onClick={runReview} disabled={viewingOld} title={viewingOld ? "Return to the latest version to run a review" : undefined}><Icon name={reviewed ? "refresh" : "play"} size={14} />{reviewed ? "Run fresh review" : "Run review"}</button>
      )}
      <button className="btn btn-secondary" onClick={() => window.print()} disabled={!reviewed || outdated || phase === "running"} title={!reviewed ? "Run a review first" : outdated ? "Re-run the review after edits before exporting" : "Print or save the one-page gap report"}>
        <Icon name="download" size={14} /> Report
      </button>
      {shown && !outdated && <a className="btn btn-secondary" href={`/audit/${encodeURIComponent(caseId)}?v=${shown.version}`} target="_blank" rel="noopener" title="Detailed audit export (opens in a new tab)"><Icon name="layers" size={14} /> Audit</a>}
    </>
  );

  return (
    <AppShell caseId={caseId} actions={actions} crumbs={[{ label: "Workspace", href: "/" }, { label: "Cases", href: "/cases" }, { label: `${caseId} · ${shortTitle(original.title, 38)}` }]}>
      <div className="subheader no-print">
        <span className={`tag ${current.kind === "synthetic-variant" ? "tag-variant" : current.kind === "user-case" ? "tag-user" : "tag-source"}`}>{kindLabel(current.kind)}</span>
        {latest ? <span className="tag" title="Reviewed versions are saved on this computer">{viewingOld ? `Viewing v${viewVersion}` : `v${latest.version}`} of {history.versions.length} · saved</span> : <span className="tag">No saved review</span>}
        {unsavedEdits && <span className="tag tag-edited" title="Kept for this browser session until a review saves them">Unsaved edits (this session)</span>}
        {unsavedEdits && <button className="btn btn-ghost btn-sm" onClick={discardEdits}>Discard edits</button>}
        <button className="title-btn" onClick={() => setDetailsOpen((o) => !o)} aria-expanded={detailsOpen} aria-controls="case-details">
          <span className="small">Case details</span><Icon name="chevronDown" size={13} />
        </button>
        {history.versions.length > 0 && <Link className="btn btn-ghost btn-sm" href={`/review/${encodeURIComponent(caseId)}/history`}><Icon name="history" size={13} /> Review history</Link>}
      </div>

      {detailsOpen && (
        <section id="case-details" className="card case-details no-print" aria-label="Case details" style={{ top: 112, left: 120 }}>
          <dl>
            <dt>Full title</dt><dd>{current.title}</dd>
            <dt>Case ID</dt><dd className="mono">{current.id}{current.baseCaseId ? ` (variant of ${current.baseCaseId})` : ""}</dd>
            <dt>Type</dt><dd>{kindLabel(current.kind)}</dd>
            {current.provenance.textOrigin && <><dt>Narrative text</dt><dd>{{ "officer-entered": "Typed or pasted as officer-written text", "transcribed-from-source": "Transcribed by the user from a source document", "synthetic-test": "Synthetic test text" }[current.provenance.textOrigin]}</dd></>}
            {reviewed?.caseContext && <><dt>Case context</dt><dd>{reviewed.caseContext.contexts.length ? reviewed.caseContext.contexts.join(", ").replace(/_/g, " ") : "unknown"} ({reviewed.caseContext.source}{reviewed.caseContext.basis ? `: ${reviewed.caseContext.basis}` : ""})</dd></>}
            {current.provenance.pdfPages && <><dt>Source PDF pages</dt><dd>{current.provenance.pdfPages.join(", ")}{pdf ? <> · <a href={`/api/cases/${encodeURIComponent(caseId)}/pdf#page=${current.provenance.pdfPages[0]}`} target="_blank" rel="noopener">open source PDF</a></> : " · source PDF not available on this computer"}</dd></>}
            {current.userCase?.sourcePdf && <><dt>Attached PDF</dt><dd>{current.userCase.sourcePdf.originalName} (viewing only; no text was read from it)</dd></>}
            {current.provenance.modifications?.length ? <><dt>Team test edit</dt><dd>{current.provenance.modifications.join("; ")}</dd></> : null}
            <dt>Source</dt><dd>{current.provenance.source}</dd>
            <dt>Verification</dt><dd>{current.provenance.verification}</dd>
            {editedFromSource && <><dt>Officer edits</dt><dd>This version differs from the original text. <Link href={`/review/${encodeURIComponent(caseId)}/history`}>Compare in Review history</Link>.</dd></>}
          </dl>
        </section>
      )}
      {viewingOld && <div className="banner banner-info no-print" style={{ borderRadius: 0, borderWidth: "0 0 1px" }}><Icon name="clock" /> <span>Viewing saved version {viewVersion} (read-only, older than the latest). <Link href={`/review/${encodeURIComponent(caseId)}`}>Go to the latest version</Link></span></div>}
      {phase === "cancelled" && <div className="banner banner-warn no-print" style={{ borderRadius: 0, borderWidth: "0 0 1px" }} role="status"><Icon name="x" /> <span><strong>Review cancelled.</strong> {cancelNote}</span></div>}
      {error && reviewed && <div className="banner banner-error no-print" style={{ borderRadius: 0, borderWidth: "0 0 1px" }} role="alert"><Icon name="alert" /> <span><strong>The latest review did not complete.</strong> {error} The findings shown are from the previous saved review.</span></div>}

      <div className={`body no-print ${factsOpen ? "" : "facts-collapsed"}`}>
        <FactsPanel open={factsOpen} onToggle={() => setFactsOpen((o) => !o)} kase={current} original={original} onChange={update}
          linkedFields={reviewed?.findings.find((f) => f.id === selected)?.evidence.filter((e) => e.kind === "field").map((e) => e.fieldPath!) ?? []} disabled={phase === "running" || viewingOld} />
        <DocumentView kase={current} original={original} review={reviewed && !outdated ? reviewed : null} outdated={outdated} selected={selected} onSelect={setSelected}
          editing={editing && !viewingOld} setEditing={setEditing} onChange={update} disabled={phase === "running" || viewingOld} />
        <FindingsPanel kase={current} review={reviewed} outdated={outdated} running={phase === "running"} elapsed={elapsed} error={phase === "error" ? error : null}
          selected={selected} onSelect={setSelected} onRun={runReview} decisions={decisions} onDecide={decide} readOnly={viewingOld || outdated} pdfAvailable={!!pdf} caseId={caseId} />
      </div>

      {reviewed && !outdated && shown && <PrintReport kase={{ ...current, ...shown.snapshot }} review={reviewed} decisions={decisions} edited={editedFromSource} version={shown.version} />}
    </AppShell>
  );
}
