"use client";

import type { CaseRecord, FieldStatus } from "@/lib/types";
import Icon from "./Icon";
import { fieldQuality, QUALITY_LABEL } from "@/lib/fieldQuality";

const STATUS_LABEL: Record<FieldStatus, string> = { present: "Present", redacted: "Redacted", absent: "Absent", unreadable: "Unreadable", not_applicable: "N/A" };
const GROUPS: [string, string][] = [["entry.", "Entry"], ["encounter.", "Encounter"], ["subject.", "Subject"], ["status.", "Status"], ["history.", "History"], ["documents.", "Documents"], ["form.", "Form"]];

export default function FactsPanel({ open, onToggle, kase, original, onChange, linkedFields, disabled }: {
  open: boolean; onToggle: () => void; kase: CaseRecord; original: CaseRecord; onChange: (c: CaseRecord) => void; linkedFields: string[]; disabled: boolean;
}) {
  if (!open)
    return (
      <aside className="col facts collapsed" aria-label="Case facts (collapsed)">
        <button className="btn btn-ghost btn-sm" onClick={onToggle} aria-expanded={false}><Icon name="chevronRight" size={14} /> Case facts</button>
      </aside>
    );

  const setCharge = (i: number, citation: string) =>
    onChange({ ...kase, selectedCharges: kase.selectedCharges.map((c, j) => (j === i ? { ...c, citation, referenceId: undefined, source: "officer-selected" as const } : c)) });

  return (
    <aside className="col facts" aria-label="Case facts">
      <div className="panel-head">
        <h2 className="panel-title">Case facts</h2>
        <button className="btn btn-ghost btn-sm" onClick={onToggle} aria-expanded aria-label="Hide case facts"><Icon name="chevronLeft" size={14} /></button>
      </div>

      <section className="card charge-card" aria-label="Officer-selected charge">
        <h3>Officer-selected charge</h3>
        {kase.selectedCharges.map((c, i) => (
          <div key={i} className="charge-row">
            <label className="sr-only" htmlFor={`charge-${i}`}>Selected charge {i + 1}</label>
            <input id={`charge-${i}`} value={c.citation} onChange={(e) => setCharge(i, e.target.value)} disabled={disabled} />
            {kase.selectedCharges.length > 1 && (
              <button className="btn btn-ghost btn-sm" aria-label={`Remove charge ${i + 1}`} disabled={disabled} onClick={() => onChange({ ...kase, selectedCharges: kase.selectedCharges.filter((_, j) => j !== i) })}><Icon name="x" size={13} /></button>
            )}
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => onChange({ ...kase, selectedCharges: [...kase.selectedCharges, { citation: "", source: "officer-selected" }] })}>+ Add charge</button>
        <p className="hint">NarrativeCheck checks this charge. It never picks or changes it.</p>
        <details className="tech">
          <summary>Source of this charge</summary>
          <div className="tech-body">
            {kase.selectedCharges.map((c, i) => <div key={i}>{c.citation || "(empty)"}: {c.source === "stated-in-record" ? "stated in the original narrative" : c.source === "team-assigned-for-testing" ? "assigned by the team for testing" : "entered by the officer"}. {c.note}</div>)}
            {kase.recordedChargeCode && <div>Charge code printed on the form: <span className="mono">{kase.recordedChargeCode}</span> (mapping not assumed)</div>}
          </div>
        </details>
      </section>

      {GROUPS.map(([prefix, name]) => {
        const facts = kase.facts.map((f, i) => ({ f, i })).filter(({ f }) => f.path.startsWith(prefix));
        if (!facts.length) return null;
        return (
          <section key={prefix} className="fact-group">
            <h4>{name}</h4>
            <div className="fact-list">
              {facts.map(({ f, i }) => {
                const changed = original.facts[i]?.value !== f.value;
                return (
                  <div key={f.path} className={`fact ${linkedFields.includes(f.path) ? "is-linked" : ""}`}>
                    <div className="fact-top">
                      <label className="fact-label" htmlFor={`fact-${f.path}`}>{f.label}</label>
                      {(() => {
                        // A populated field is not necessarily known information ("Unknown Date, Unknown Time").
                        const q = f.status === "present" ? fieldQuality(f.value) : null;
                        return q && q !== "known"
                          ? <span className={`fstatus fstatus-${q}`} title="The form field is filled in, but it does not record a usable value.">{QUALITY_LABEL[q]}</span>
                          : <span className={`fstatus fstatus-${f.status}`}>{STATUS_LABEL[f.status]}</span>;
                      })()}
                    </div>
                    {f.status === "present" || f.status === "absent" ? (
                      <input id={`fact-${f.path}`} value={f.value} placeholder="Not recorded" disabled={disabled}
                        onChange={(e) => onChange({ ...kase, facts: kase.facts.map((x, j) => (j === i ? { ...x, value: e.target.value, status: (e.target.value.trim() ? "present" : "absent") as FieldStatus } : x)) })} />
                    ) : (
                      <span className="fact-withheld" id={`fact-${f.path}`}>{f.status === "redacted" ? "Withheld in the public source" : "Not available"}</span>
                    )}
                    <details className="tech">
                      <summary>Details{changed ? " · edited" : ""}</summary>
                      <div className="tech-body"><span className="mono">{f.path}</span>{f.sourceField && <> · form field “{f.sourceField}”</>}{f.sourcePage && <> · PDF p.{f.sourcePage}</>}</div>
                    </details>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <details className="tech" style={{ marginTop: 8 }}>
        <summary>Source and provenance</summary>
        <div className="tech-body">
          <p>{kase.provenance.source}</p>
          <p>{kase.provenance.extraction}</p>
          <p>{kase.provenance.verification}</p>
          {kase.provenance.replacements.length > 0 && <p>Synthetic replacements: {kase.provenance.replacements.map((r) => `${r.original} → ${r.replacement}`).join("; ")}</p>}
          {kase.provenance.modifications?.length ? <p>Team test edits: {kase.provenance.modifications.join("; ")}</p> : null}
        </div>
      </details>
    </aside>
  );
}
