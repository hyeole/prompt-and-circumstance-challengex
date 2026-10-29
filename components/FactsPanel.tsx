"use client";

import type { CaseRecord, FieldStatus } from "@/lib/types";

const STATUS_LABEL: Record<FieldStatus, string> = {
  present: "Present",
  redacted: "Redacted",
  absent: "Absent",
  unreadable: "Unreadable",
  not_applicable: "N/A",
};

export default function FactsPanel({
  open,
  onToggle,
  kase,
  original,
  onChange,
  selectedField,
  disabled,
}: {
  open: boolean;
  onToggle: () => void;
  kase: CaseRecord;
  original: CaseRecord;
  onChange: (c: CaseRecord) => void;
  selectedField: string[];
  disabled: boolean;
}) {
  if (!open)
    return (
      <aside className="facts-column collapsed" aria-label="Case facts (collapsed)">
        <button className="btn btn-ghost btn-sm vertical" onClick={onToggle} aria-expanded={false}>
          Case facts ›
        </button>
      </aside>
    );

  const setCharge = (i: number, citation: string) => {
    const next = kase.selectedCharges.map((c, j) => (j === i ? { ...c, citation, referenceId: undefined, source: "officer-selected" as const } : c));
    onChange({ ...kase, selectedCharges: next });
  };

  return (
    <aside className="facts-column" aria-label="Case facts">
      <div className="facts-head">
        <h2 className="section-title">Case facts</h2>
        <button className="btn btn-ghost btn-sm" onClick={onToggle} aria-expanded>
          ‹ Hide
        </button>
      </div>

      <section className="charge-box">
        <h3 className="field-label">Officer-selected charge</h3>
        {kase.selectedCharges.map((c, i) => (
          <div key={i} className="charge-row">
            <label className="sr-only" htmlFor={`charge-${i}`}>
              Selected charge {i + 1}
            </label>
            <input id={`charge-${i}`} className="mono" value={c.citation} onChange={(e) => setCharge(i, e.target.value)} disabled={disabled} />
            {kase.selectedCharges.length > 1 && (
              <button className="btn btn-ghost btn-sm" aria-label={`Remove charge ${i + 1}`} disabled={disabled} onClick={() => onChange({ ...kase, selectedCharges: kase.selectedCharges.filter((_, j) => j !== i) })}>
                ✕
              </button>
            )}
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => onChange({ ...kase, selectedCharges: [...kase.selectedCharges, { citation: "", source: "officer-selected" }] })}>
          + Add charge
        </button>
        {kase.selectedCharges[0]?.source === "team-assigned-for-testing" && <p className="hint">{kase.selectedCharges[0].note}</p>}
        {kase.recordedChargeCode && (
          <p className="hint">
            Form charge code as printed: <span className="mono">{kase.recordedChargeCode}</span>
          </p>
        )}
        <p className="hint">NarrativeCheck checks this charge. It never picks or changes it.</p>
      </section>

      <dl className="facts-list">
        {kase.facts.map((f, i) => {
          const changed = original.facts[i]?.value !== f.value;
          return (
            <div key={f.path} className={`fact ${selectedField.includes(f.path) ? "is-linked" : ""}`}>
              <dt>
                <span>{f.label}</span>
                <span className={`fstatus fstatus-${f.status}`}>{STATUS_LABEL[f.status]}</span>
              </dt>
              <dd>
                {f.status === "present" || f.status === "absent" ? (
                  <>
                    <label className="sr-only" htmlFor={`fact-${f.path}`}>
                      {f.label}
                    </label>
                    <input
                      id={`fact-${f.path}`}
                      value={f.value}
                      placeholder="(not recorded)"
                      disabled={disabled}
                      onChange={(e) => {
                        const facts = kase.facts.map((x, j) => (j === i ? { ...x, value: e.target.value, status: (e.target.value.trim() ? "present" : "absent") as FieldStatus } : x));
                        onChange({ ...kase, facts });
                      }}
                    />
                  </>
                ) : (
                  <span className="muted">{f.status === "redacted" ? "Withheld in the public source" : "Not available"}</span>
                )}
                <div className="fact-src">
                  <span className="mono">{f.path}</span>
                  {f.sourcePage && <> · p.{f.sourcePage}</>}
                  {changed && <> · edited</>}
                </div>
              </dd>
            </div>
          );
        })}
      </dl>

      <details className="provenance">
        <summary>Source and provenance</summary>
        <p>{kase.provenance.source}</p>
        <p>{kase.provenance.extraction}</p>
        <p>{kase.provenance.verification}</p>
        {kase.provenance.replacements.length > 0 && <p>Synthetic replacements: {kase.provenance.replacements.map((r) => `${r.original} → ${r.replacement}`).join("; ")}</p>}
        {kase.provenance.modifications && kase.provenance.modifications.length > 0 && <p>Team test edits: {kase.provenance.modifications.join("; ")}</p>}
      </details>
    </aside>
  );
}
