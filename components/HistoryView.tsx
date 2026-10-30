"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CaseRecord, Finding } from "@/lib/types";
import type { CaseHistory, StoredVersion } from "@/lib/store";
import { compareFindings, wordDiff } from "@/lib/compare";
import { CATEGORY } from "./categories";
import { fmtDate } from "./StateTag";

type Snap = Pick<CaseRecord, "narrative" | "facts" | "selectedCharges">;
const snapKey = (s: Snap) => JSON.stringify([s.narrative.text, s.facts, s.selectedCharges]);

function outcome(v: StoredVersion) {
  if (v.completion === "partial") return { label: "Review incomplete", tone: "pill-warn" };
  return v.review.humanReview.required ? { label: "Needs human review", tone: "pill-review" } : { label: "Reviewed", tone: "pill-ok" };
}

function Diff({ before, after }: { before: string; after: string }) {
  const parts = wordDiff(before, after);
  if (!parts.some((p) => p.kind !== "same")) return <p className="empty-note">No change to the narrative text.</p>;
  return <div className="diff">{parts.map((p, i) => (p.kind === "added" ? <ins key={i}>{p.text}</ins> : p.kind === "removed" ? <del key={i}>{p.text}</del> : <span key={i}>{p.text}</span>))}</div>;
}

const findingLine = (f: Finding) => <li key={f.id}><span className={`cat-chip cat-${f.category}`} style={{ marginRight: 6 }}>{CATEGORY[f.category].short}</span>{f.title}</li>;

export default function HistoryView({ kase, history }: { kase: CaseRecord; history: CaseHistory }) {
  const router = useRouter();
  const params = useSearchParams();
  const n = history.versions.length;
  const b = Math.min(Number(params.get("b")) || n, n);
  const a = Math.min(Number(params.get("a")) || Math.max(1, b - 1), n);
  const A = history.versions.find((v) => v.version === a);
  const B = history.versions.find((v) => v.version === b);
  const latest = history.versions.at(-1);

  const [session, setSession] = useState<Snap | null>(null);
  useEffect(() => {
    try { const raw = sessionStorage.getItem(`nc:unsaved:${kase.id}`); if (raw) setSession(JSON.parse(raw)); } catch { /* ignore */ }
  }, [kase.id]);
  const sessionDiffers = !!session && !!latest && snapKey(session) !== snapKey(latest.snapshot);

  const setPair = (na: number, nb: number) => router.replace(`/review/${encodeURIComponent(kase.id)}/history?a=${na}&b=${nb}`, { scroll: false });
  const cmp = useMemo(() => (A && B && A !== B ? compareFindings(A.review, B.review) : null), [A, B]);
  const factChanges = useMemo(() => {
    if (!A || !B) return [];
    return B.snapshot.facts.map((f) => ({ f, old: A.snapshot.facts.find((x) => x.path === f.path) })).filter(({ f, old }) => !old || old.value !== f.value || old.status !== f.status);
  }, [A, B]);
  const chargeChange = A && B && JSON.stringify(A.snapshot.selectedCharges.map((c) => c.citation)) !== JSON.stringify(B.snapshot.selectedCharges.map((c) => c.citation));

  if (!n) return <p className="empty-note">No saved reviews yet. <Link href={`/review/${encodeURIComponent(kase.id)}`}>Open the case and run a review</Link>; each review is saved here as a version that is never changed.</p>;

  return (
    <div className="grid-2" style={{ gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)", alignItems: "start" }}>
      <section className="panel" aria-labelledby="versions-h">
        <h2 id="versions-h">Saved versions <span className="count">{n}</span></h2>
        {sessionDiffers && <div className="banner banner-warn" style={{ marginBottom: 10 }}>This browser session has unsaved edits, so even the latest version is <strong>outdated</strong> until a fresh review runs.</div>}
        <ol className="version-list">
          {[...history.versions].reverse().map((v) => {
            const o = outcome(v);
            const dec = Object.values(history.decisions[v.review.reviewId] ?? {});
            const isLatest = v.version === n;
            return (
              <li key={v.version} className={`version ${v.version === a || v.version === b ? "is-selected" : ""}`}>
                <span className="vnum">v{v.version}</span>
                <span>
                  <span className={`pill ${o.tone}`} style={{ marginRight: 6 }}><span className="dot" />{o.label}</span>
                  <span className="small muted">{fmtDate(v.savedAt)}</span>
                  <div className="small muted">{v.review.findings.length} finding(s){dec.length ? ` · ${dec.filter((d) => d.state === "acknowledged").length} acknowledged, ${dec.filter((d) => d.state === "dismissed").length} dismissed` : ""}{!isLatest ? ` · superseded by v${n}` : sessionDiffers ? " · outdated by unsaved edits" : " · latest"}</div>
                </span>
                <span className="small" style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "right" }}>
                  <Link href={`/review/${encodeURIComponent(kase.id)}${isLatest ? "" : `?v=${v.version}`}`}>Open</Link>
                  <Link href={`/report/${encodeURIComponent(kase.id)}?v=${v.version}`}>Report</Link>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="panel" aria-labelledby="cmp-h">
        <h2 id="cmp-h">Compare versions</h2>
        <div className="toolbar">
          <label className="small" htmlFor="va">From</label>
          <select id="va" value={a} onChange={(e) => setPair(Number(e.target.value), b)}>{history.versions.map((v) => <option key={v.version} value={v.version}>v{v.version} · {fmtDate(v.savedAt)}</option>)}</select>
          <label className="small" htmlFor="vb">to</label>
          <select id="vb" value={b} onChange={(e) => setPair(a, Number(e.target.value))}>{history.versions.map((v) => <option key={v.version} value={v.version}>v{v.version} · {fmtDate(v.savedAt)}</option>)}</select>
        </div>
        {!A || !B ? null : A === B ? (
          <p className="empty-note">Choose two different versions to compare. With one version, this page shows its saved outcome only.</p>
        ) : (
          <>
            <h3 className="section-title">Narrative: officer edits from v{a} to v{b}</h3>
            <div className="cmp-col"><Diff before={A.snapshot.narrative.text} after={B.snapshot.narrative.text} /></div>
            <h3 className="section-title" style={{ marginTop: 14 }}>Form fields and charge</h3>
            {factChanges.length === 0 && !chargeChange ? <p className="empty-note">No changes to form fields or the selected charge.</p> : (
              <table className="table">
                <thead><tr><th>Field</th><th>v{a}</th><th>v{b}</th></tr></thead>
                <tbody>
                  {chargeChange && <tr><td>Officer-selected charge</td><td className="mono">{A.snapshot.selectedCharges.map((c) => c.citation).join("; ")}</td><td className="mono">{B.snapshot.selectedCharges.map((c) => c.citation).join("; ")}</td></tr>}
                  {factChanges.map(({ f, old }) => <tr key={f.path}><td>{f.label}</td><td>{old ? (old.status === "present" ? old.value : old.status) : "—"}</td><td>{f.status === "present" ? f.value : f.status}</td></tr>)}
                </tbody>
              </table>
            )}
            <h3 className="section-title" style={{ marginTop: 14 }}>Findings</h3>
            {cmp && !cmp.available ? <p className="empty-note">Comparison unavailable: {cmp.reason}</p> : cmp && (
              <div className="grid-2" style={{ gap: 10 }}>
                <div className="cmp-col"><h3>New in v{b} ({cmp.added.length})</h3><ul className="list-plain small">{cmp.added.map(findingLine)}</ul></div>
                <div className="cmp-col"><h3>Persisting ({cmp.persisting.length})</h3><ul className="list-plain small">{cmp.persisting.map(findingLine)}</ul></div>
                <div className="cmp-col"><h3>Resolved since v{a} ({cmp.resolved.length})</h3><ul className="list-plain small">{cmp.resolved.map(findingLine)}</ul></div>
                {cmp.unmatched.length > 0 && <div className="cmp-col"><h3>Cannot be matched ({cmp.unmatched.length})</h3><p className="small muted">The sentences these findings cite were edited, so they cannot be matched reliably between versions.</p><ul className="list-plain small">{cmp.unmatched.map(findingLine)}</ul></div>}
              </div>
            )}
            <h3 className="section-title" style={{ marginTop: 14 }}>Officer notes</h3>
            {[A, B].map((v) => {
              const notes = Object.entries(history.decisions[v.review.reviewId] ?? {}).filter(([, d]) => d.note);
              return <div key={v.version} className="small" style={{ marginBottom: 6 }}><strong>v{v.version}:</strong> {notes.length ? notes.map(([fid, d]) => `${fid} (${d.state}): ${d.note}`).join(" · ") : <span className="muted">no notes</span>}</div>;
            })}
          </>
        )}
      </section>
    </div>
  );
}
