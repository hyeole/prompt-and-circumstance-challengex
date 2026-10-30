"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { CaseRow } from "@/lib/workspaceData";
import { GroupTag, StatePill, fmtDate, STATE_LABEL, GROUP_LABEL } from "./StateTag";

export default function CaseLibrary({ rows }: { rows: CaseRow[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const state = params.get("state") ?? "all";
  const group = params.get("group") ?? "all";

  // Filters live in the URL so back/forward and shared links keep them.
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (!v || v === "all") p.delete(k); else p.set(k, v);
    router.replace(`/cases${p.toString() ? `?${p}` : ""}`, { scroll: false });
  };

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => (state === "all" || r.state === state) && (group === "all" || r.group === group) && (!needle || `${r.id} ${r.title}`.toLowerCase().includes(needle)));
  }, [rows, q, state, group]);

  return (
    <>
      <div className="toolbar" role="search">
        <label className="sr-only" htmlFor="case-search">Search cases</label>
        <input id="case-search" type="search" placeholder="Search by case ID or title" defaultValue={q} onChange={(e) => set("q", e.target.value)} />
        <div className="chip-group" role="group" aria-label="Review status">
          {(["all", ...Object.keys(STATE_LABEL)] as string[]).map((s) => (
            <button key={s} className="chip" aria-pressed={state === s} onClick={() => set("state", s)}>{s === "all" ? "Any status" : STATE_LABEL[s as keyof typeof STATE_LABEL]}</button>
          ))}
        </div>
        <label className="sr-only" htmlFor="group-filter">Case type</label>
        <select id="group-filter" value={group} onChange={(e) => set("group", e.target.value)}>
          <option value="all">All case types</option>
          {Object.entries(GROUP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <p className="small muted" aria-live="polite">{shown.length} of {rows.length} cases</p>
      <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr><th scope="col">Case</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Last reviewed</th><th scope="col">Versions</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/review/${encodeURIComponent(r.id)}`}>{r.title}</Link><div className="mono small muted">{r.id}{r.createdAt ? ` · entered ${fmtDate(r.createdAt)}` : ""}</div></td>
                <td><GroupTag group={r.group} /></td>
                <td><StatePill state={r.state} />{(r.openDecisions ?? 0) > 0 && <div className="small muted">{r.openDecisions} without a decision</div>}</td>
                <td className="small">{fmtDate(r.lastReviewedAt) || <span className="muted">—</span>}</td>
                <td className="small">{r.versions || <span className="muted">0</span>}</td>
                <td className="small" style={{ whiteSpace: "nowrap" }}>
                  <Link href={`/review/${encodeURIComponent(r.id)}`}>Review</Link>
                  {r.versions > 0 && <> · <Link href={`/review/${encodeURIComponent(r.id)}/history`}>History</Link> · <Link href={`/report/${encodeURIComponent(r.id)}`}>Report</Link></>}
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={6} className="empty-note">No cases match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
