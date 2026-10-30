import Link from "next/link";
import AppShell from "@/components/AppShell";
import PrintButton from "@/components/PrintButton";
import { CATEGORY, CHECK_STATUS, CITATION_STATUS, ELEMENT_STATUS } from "@/components/categories";
import { fmtDate } from "@/components/StateTag";
import { loadCasePage, parseVersion } from "@/lib/casePage";

export const dynamic = "force-dynamic";

export default async function AuditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const { id, kase, history } = await loadCasePage(params);
  const want = parseVersion((await searchParams).v);
  const ver = want ? history.versions.find((v) => v.version === want) : history.versions.at(-1);
  const crumbs = [{ label: "Workspace", href: "/" }, { label: "Cases", href: "/cases" }, { label: id, href: `/review/${encodeURIComponent(id)}` }, { label: "Audit export" }];
  if (!ver)
    return <AppShell caseId={id} crumbs={crumbs}><main className="page"><div className="page-inner"><p className="empty-note">No saved review for this case yet.</p></div></main></AppShell>;
  const r = ver.review;
  const decisions = history.decisions[r.reviewId] ?? {};
  const sentence = (sid?: string) => r.sentences.find((s) => s.id === sid);
  return (
    <AppShell caseId={id} crumbs={crumbs} actions={<PrintButton label="Print or save as PDF" />}>
      <main className="page audit" id="main">
        <div className="page-inner" style={{ maxWidth: 900 }}>
          <h1 className="page-title">Detailed audit export</h1>
          <p className="lede">Case <span className="mono">{id}</span>, version {ver.version} of {history.versions.length}{ver.version !== history.versions.length ? " (an older version; later versions exist)" : ""}. Model output is reproduced as saved; officer decisions are listed separately.</p>

          <section className="panel">
            <h2>Case and review</h2>
            <table className="table"><tbody>
              <tr><td>Title</td><td>{kase.title}</td></tr>
              <tr><td>Case type and provenance</td><td>{kase.kind} · {kase.provenance.source}. {kase.provenance.extraction} {kase.provenance.verification}{kase.provenance.modifications?.length ? ` Team test edit: ${kase.provenance.modifications.join("; ")}` : ""}</td></tr>
              <tr><td>Version saved</td><td>{fmtDate(ver.savedAt)} · snapshot {ver.snapshotHash} · narrative hash {r.narrativeHash}</td></tr>
              <tr><td>Completion</td><td><strong>{ver.completion === "complete" ? "Complete" : "PARTIAL: the model check did not complete"}</strong>{r.modelError ? ` (${r.modelError})` : ""}</td></tr>
              <tr><td>Case context</td><td>{r.caseContext ? `${r.caseContext.contexts.join(", ").replace(/_/g, " ") || "unknown"} (${r.caseContext.source}${r.caseContext.basis ? `: ${r.caseContext.basis}` : ""})` : "not recorded (review made before checklist v2)"}</td></tr>
              <tr><td>Human review</td><td>{r.humanReview.required ? "Required" : "No trigger found"}{r.humanReview.reasons.length ? `: ${r.humanReview.reasons.join(" · ")}` : ""}</td></tr>
              {(r.humanReview.accounts ?? []).map((g, i) => <tr key={`acc-${i}`}><td>Account to attribute ({g.fieldPath ?? "narrative"})</td><td>{g.sentenceIds.join(", ")}: {g.details.join(" ")} Not treated as a contradiction; several people are described and nothing ties it uniquely to this subject.</td></tr>)}
              <tr><td>Citation check</td><td><span className="mono">{r.citation.citation}</span>: {CITATION_STATUS[r.citation.status]}. {r.citation.explanation}</td></tr>
              <tr><td>Versions and settings</td><td>Model {r.model} · prompt {r.promptVersion} · facts {r.modelConfig?.factsPromptVersion ?? "n/a"} · references {r.referenceVersion} · checklist {r.checklistVersion ?? "v1"} · effort {r.modelConfig?.reasoningEffort ?? "n/a"} · {r.modelConfig?.validSamples ?? "?"}/{r.modelConfig?.samples ?? "?"} valid samples · review time {(r.latencyMs / 1000).toFixed(1)}s</td></tr>
            </tbody></table>
          </section>

          <section className="panel" style={{ marginTop: 14 }}>
            <h2>Findings ({r.findings.length})</h2>
            {r.findings.length === 0 && <p className="empty-note">{ver.completion === "complete" ? "No findings from the checks that ran." : "No findings from the checks that completed; the review is incomplete."}</p>}
            {r.findings.map((f) => {
              const d = decisions[f.id];
              return (
                <article key={f.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0", breakInside: "avoid" }}>
                  <div><strong>{f.id} · [{CATEGORY[f.category].label}] {f.title}</strong> <span className="small muted">({f.severity}, {f.source === "rule" ? "rule" : "model, evidence verified"}{f.sampleAgreement ? `, ${f.sampleAgreement} sample(s)` : ""})</span></div>
                  <p style={{ margin: "4px 0" }}>{f.explanation}</p>
                  <ul className="small">
                    {f.evidence.map((e, i) => (
                      <li key={i}>
                        {e.kind === "sentence" && <>Sentence {e.sentenceId}{(e.page ?? sentence(e.sentenceId)?.page) ? `, PDF p.${e.page ?? sentence(e.sentenceId)?.page}` : ""} ({e.match ?? "exact"} quote, offsets {e.start}–{e.end}{e.context?.attribution ? `, ${e.context.attribution}` : ""}{e.context?.event ? `, ${e.context.event}` : ""}): “{sentence(e.sentenceId)?.text ?? e.quote}”</>}
                        {e.kind === "field" && <>Form field <span className="mono">{e.fieldPath}</span>{e.page ? `, PDF p.${e.page}` : ""}: {e.quote}</>}
                        {e.kind === "missing" && <>Required element {e.elementId} not stated (no source text)</>}
                      </li>
                    ))}
                  </ul>
                  {f.needsHumanReview && <div className="small">Human review: {f.humanReviewReason}</div>}
                  <div className="small" style={{ marginTop: 4 }}><strong>Officer decision:</strong> {d ? `${d.state}${d.note ? `: ${d.note}` : ""} (${fmtDate(d.decidedAt)})` : "open (no decision recorded)"}</div>
                </article>
              );
            })}
          </section>

          <section className="panel" style={{ marginTop: 14 }}>
            <h2>Checklist ({r.checklistVersion ?? "v1"})</h2>
            <table className="table"><thead><tr><th>Item</th><th>Status</th><th>Basis</th></tr></thead><tbody>
              {r.elements.map((e) => <tr key={e.elementId}><td>{e.sponsorCategory ? `${e.sponsorCategory} · ` : ""}{e.elementId} {e.label}</td><td>{ELEMENT_STATUS[e.status].label}{e.qualifier ? ` (${e.qualifier.replace(/_/g, " ")})` : ""}</td><td className="small">{[e.fieldPaths.length ? `form: ${e.fieldPaths.join(", ")}` : "", e.sentenceIds.length ? `narrative: ${e.sentenceIds.join(", ")}` : "", e.note ?? ""].filter(Boolean).join(" · ")}</td></tr>)}
            </tbody></table>
          </section>

          <section className="panel" style={{ marginTop: 14 }}>
            <h2>Checks, requests and withheld statements</h2>
            <ul className="small">{r.checks.map((c) => <li key={c.id}>{c.label}: {CHECK_STATUS[c.status]}{c.note ? ` (${c.note})` : ""}</li>)}</ul>
            <p className="small"><strong>Model requests:</strong> {r.calls?.length ? r.calls.map((c) => `${c.role} ${c.status} ${(c.ms / 1000).toFixed(1)}s (${c.attempts} attempt${c.attempts === 1 ? "" : "s"})`).join(" · ") : "not recorded"}</p>
            <p className="small"><strong>Withheld (evidence or support could not be verified):</strong> {r.discarded.length ? r.discarded.map((d) => `${d.title}: ${d.reason}`).join(" · ") : "none"}</p>
            {r.notes?.length ? <p className="small"><strong>Notes:</strong> {r.notes.join(" ")}</p> : null}
          </section>

          <section className="panel" style={{ marginTop: 14 }}>
            <h2>All saved versions</h2>
            <ul className="small">{history.versions.map((v) => <li key={v.version}>v{v.version} · {fmtDate(v.savedAt)} · {v.completion} · {v.review.findings.length} finding(s){v.version === ver.version ? " · this export" : ""} · <Link href={`/audit/${encodeURIComponent(id)}?v=${v.version}`}>audit</Link></li>)}</ul>
          </section>
          <p className="small muted" style={{ marginTop: 14 }}>Decision support only. Not a legal determination. The officer&apos;s narrative and selected charge were not changed. References are team-provisional, guided by Unissant&apos;s core elements. Built by Prompt &amp; Circumstance.</p>
        </div>
      </main>
    </AppShell>
  );
}
