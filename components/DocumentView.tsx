"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import type { CaseRecord, Finding, ReviewResult } from "@/lib/types";
import { CATEGORY } from "./categories";

interface Span {
  start: number;
  end: number;
  findingIds: string[];
}

/** Turn verified evidence offsets into non-overlapping segments. */
function buildSegments(text: string, findings: Finding[]): Span[] {
  const marks: { start: number; end: number; id: string }[] = [];
  for (const f of findings)
    for (const e of f.evidence)
      if (e.kind === "sentence" && e.verified && e.start != null && e.end != null && e.end > e.start && e.end <= text.length)
        marks.push({ start: e.start, end: e.end, id: f.id });
  const cuts = new Set([0, text.length]);
  marks.forEach((m) => (cuts.add(m.start), cuts.add(m.end)));
  const pts = [...cuts].sort((a, b) => a - b);
  const segs: Span[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [s, e] = [pts[i], pts[i + 1]];
    segs.push({ start: s, end: e, findingIds: marks.filter((m) => m.start <= s && m.end >= e).map((m) => m.id) });
  }
  return segs;
}

/** Show redaction and unreadable tokens as muted chips so they are not mistaken for officer text. */
function renderPlain(text: string, keyBase: string) {
  const parts = text.split(/(\[REDACTED[^\]]*\]|\[UNREADABLE\])/g);
  return parts.map((p, i) =>
    /^\[(REDACTED|UNREADABLE)/.test(p) ? (
      <span key={`${keyBase}-${i}`} className="redaction" title={p.startsWith("[UNREADABLE") ? "Unreadable in the source document" : `Redacted in the public source: ${p.slice(10, -1)}`}>
        {p.startsWith("[UNREADABLE") ? "unreadable" : "redacted"}
      </span>
    ) : (
      <Fragment key={`${keyBase}-${i}`}>{p}</Fragment>
    )
  );
}

export default function DocumentView({
  kase,
  original,
  review,
  outdated,
  selected,
  onSelect,
  editing,
  setEditing,
  onChange,
  disabled,
}: {
  kase: CaseRecord;
  original: CaseRecord;
  review: ReviewResult | null;
  outdated: boolean;
  selected: string | null;
  onSelect: (id: string | null) => void;
  editing: boolean;
  setEditing: (b: boolean) => void;
  onChange: (c: CaseRecord) => void;
  disabled: boolean;
}) {
  const text = kase.narrative.text;
  const findings = useMemo(() => review?.findings ?? [], [review]);
  const segs = useMemo(() => buildSegments(text, findings), [text, findings]);
  const byId = useMemo(() => Object.fromEntries(findings.map((f) => [f.id, f])), [findings]);
  const docRef = useRef<HTMLDivElement>(null);
  const pageStarts = new Map((kase.narrative.pageSpans ?? []).map((p) => [p.start, p.page]));

  useEffect(() => {
    if (!selected) return;
    const el = docRef.current?.querySelector<HTMLElement>(`[data-fid~="${selected}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selected]);

  const narrativeChanged = text !== original.narrative.text;

  return (
    <section className="doc-column" aria-label="Narrative">
      <div className="doc-toolbar">
        <div>
          <h1 className="doc-title">{kase.title}</h1>
          <div className="doc-meta">
            {kase.id}
            {kase.provenance.pdfPages && <> · Source PDF pages {kase.provenance.pdfPages.join(", ")}</>}
            {narrativeChanged && <> · Narrative edited in this session</>}
          </div>
        </div>
        <div className="doc-toolbar-actions">
          {editing ? (
            <button className="btn btn-primary btn-sm" onClick={() => setEditing(false)}>
              Done editing
            </button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)} disabled={disabled}>
              Edit narrative
            </button>
          )}
          {narrativeChanged && !editing && (
            <button className="btn btn-ghost btn-sm" onClick={() => onChange({ ...kase, narrative: original.narrative })} disabled={disabled}>
              Restore original
            </button>
          )}
        </div>
      </div>

      {outdated && (
        <div className="banner banner-warn" role="status">
          The case changed after the last review. Highlights are hidden and findings are marked outdated. Run a fresh review.
        </div>
      )}

      <div className="doc-scroll">
        {editing ? (
          <div className="doc-page">
            <label htmlFor="narrative-edit" className="sr-only">
              Narrative text
            </label>
            <textarea
              id="narrative-edit"
              className="doc-editor"
              value={text}
              onChange={(e) => onChange({ ...kase, narrative: { text: e.target.value, pageSpans: undefined } })}
              spellCheck
            />
            <p className="hint">You are editing your own text. NarrativeCheck never rewrites it. Run a fresh review when you are done.</p>
          </div>
        ) : (
          <div className="doc-page" ref={docRef}>
            <div className="doc-text">
              {segs.map((s) => {
                const chunk = text.slice(s.start, s.end);
                const page = pageStarts.get(s.start);
                const marker = page && s.start > 0 ? <span className="page-marker" aria-label={`Source page ${page}`}>p.{page}</span> : page ? <span className="page-marker">p.{page}</span> : null;
                if (!s.findingIds.length)
                  return (
                    <Fragment key={s.start}>
                      {marker}
                      {renderPlain(chunk, String(s.start))}
                    </Fragment>
                  );
                const first = byId[s.findingIds[0]];
                const isSel = selected != null && s.findingIds.includes(selected);
                const cat = CATEGORY[first.category];
                return (
                  <Fragment key={s.start}>
                    {marker}
                    <mark
                      className={`hl hl-${first.category} ${isSel ? "hl-selected" : ""}`}
                      data-fid={s.findingIds.join(" ")}
                      tabIndex={0}
                      role="button"
                      aria-label={`${cat.label}: ${s.findingIds.map((id) => byId[id].title).join("; ")}`}
                      onClick={() => onSelect(isSel && s.findingIds.length === 1 ? null : s.findingIds[(s.findingIds.indexOf(selected ?? "") + 1) % s.findingIds.length])}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelect(s.findingIds[0]);
                        }
                      }}
                    >
                      {renderPlain(chunk, String(s.start))}
                    </mark>
                  </Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
