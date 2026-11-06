"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fieldQuality, QUALITY_LABEL } from "@/lib/fieldQuality";
import { splitSentences } from "@/lib/text";
import Icon from "./Icon";
import JudgeAccess, { type AccessState } from "./JudgeAccess";

/** Same limit as the server (lib/deploy.ts MAX_PDF_BYTES). */
const MAX_PDF_MB = 3;

type Status = "present" | "absent" | "redacted" | "unreadable" | "not_applicable";
const FACTS: { path: string; label: string; hint: string }[] = [
  { path: "subject.citizenship", label: "Country of citizenship", hint: "e.g. MEXICO" },
  { path: "entry.date", label: "Date and time of last entry", hint: "e.g. 05/15/2014, 2200 or Unknown Date" },
  { path: "entry.place", label: "Place of last entry", hint: "e.g. near Brownsville, TX" },
  { path: "entry.manner", label: "Manner of last entry", hint: "e.g. EWI AFOOT, B2 visitor" },
  { path: "status.at_entry", label: "Status at entry", hint: "e.g. PWA Mexico, Non-Immigrant" },
  { path: "encounter.date_time", label: "Encounter date and hour", hint: "e.g. 03/22/2017 1435" },
  { path: "encounter.location", label: "Encounter location (at/near)", hint: "e.g. AVON, OH" },
  { path: "encounter.method", label: "Method of location/apprehension", hint: "code as printed" },
  { path: "history.immigration_record", label: "Immigration record", hint: "e.g. NEGATIVE" },
  { path: "history.criminal_record", label: "Criminal record", hint: "e.g. None Known" },
  { path: "documents.passport", label: "Passport / identity document", hint: "or leave empty" },
  { path: "form.charge_code", label: "Charge code (as printed)", hint: "kept as recorded; not mapped" },
];
const ORIGIN = {
  "officer-entered": "Officer-written text, typed or pasted",
  "transcribed-from-source": "Transcribed by me from a source document",
  "synthetic-test": "Synthetic test text (not a real case)",
} as const;
const DRAFT_KEY = "nc:intake-draft";
type Draft = { title: string; origin: keyof typeof ORIGIN; narrative: string; sourceDescription: string; pages: string; context: string[]; charges: string[]; facts: Record<string, { value: string; status: Status }>; hadPdf: boolean };
const CONTEXTS = { interior: "Interior encounter", port_of_entry: "Port of entry (application for admission)", expedited_removal: "Expedited removal" } as const;

export default function IntakeForm() {
  const router = useRouter();
  const [step, setStep] = useState<"edit" | "preview" | "saving">("edit");
  const [title, setTitle] = useState("");
  const [origin, setOrigin] = useState<keyof typeof ORIGIN>("officer-entered");
  const [narrative, setNarrative] = useState("");
  const [sourceDescription, setSourceDescription] = useState("");
  const [pages, setPages] = useState("");
  const [context, setContext] = useState<string[]>([]);
  const [charges, setCharges] = useState<string[]>([""]);
  const [facts, setFacts] = useState<Record<string, { value: string; status: Status }>>(Object.fromEntries(FACTS.map((f) => [f.path, { value: "", status: "absent" as Status }])));
  const [pdf, setPdf] = useState<File | null>(null);
  // Public demo: PDF uploads need the judge access code (lib/judge.ts); the local tool needs none.
  const [access, setAccess] = useState<AccessState | null>(null);
  useEffect(() => {
    fetch("/api/access", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((a) => a && setAccess(a as AccessState)).catch(() => {});
  }, []);
  const [error, setError] = useState<string | null>(null);

  const dirty = !!(title || narrative || charges.some(Boolean) || Object.values(facts).some((f) => f.value) || pdf);

  // Draft kept in this browser session, so moving to another page inside the app and back loses nothing (audit
  // item 8). A PDF cannot be stored this way; the officer is asked to attach it again.
  const [restored, setRestored] = useState<{ hadPdf: boolean } | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Draft;
        setTitle(d.title); setOrigin(d.origin); setNarrative(d.narrative); setSourceDescription(d.sourceDescription); setPages(d.pages);
        setContext(d.context); setCharges(d.charges.length ? d.charges : [""]); setFacts((f) => ({ ...f, ...d.facts }));
        setRestored({ hadPdf: d.hadPdf });
      }
    } catch { /* storage unavailable: the draft stays in memory only */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded || step === "saving") return;
    try {
      if (dirty) sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, origin, narrative, sourceDescription, pages, context, charges, facts, hadPdf: !!pdf || !!restored?.hadPdf } satisfies Draft));
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch { /* ignore */ }
  }, [loaded, dirty, step, title, origin, narrative, sourceDescription, pages, context, charges, facts, pdf, restored]);
  function discardDraft() {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setTitle(""); setOrigin("officer-entered"); setNarrative(""); setSourceDescription(""); setPages(""); setContext([]); setCharges([""]);
    setFacts(Object.fromEntries(FACTS.map((f) => [f.path, { value: "", status: "absent" as Status }]))); setPdf(null); setRestored(null);
  }
  useEffect(() => {
    if (!dirty || step === "saving") return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, step]);

  const sentences = useMemo(() => splitSentences(narrative), [narrative]);
  const pdfPages = pages.split(/[,\s]+/).map((p) => parseInt(p, 10)).filter((n) => n > 0);
  const problems = [
    title.trim().length < 3 && "Enter a short title.",
    narrative.trim().length < 40 && "Enter the narrative (at least a few sentences).",
    !charges.some((c) => c.trim().length >= 3) && "Enter the officer-selected charge.",
    pdf && pdf.type !== "application/pdf" && !pdf.name.toLowerCase().endsWith(".pdf") && "The attachment must be a PDF.",
    pdf && pdf.size > MAX_PDF_MB * 1024 * 1024 && `The PDF must be ${MAX_PDF_MB} MB or smaller.`,
    pdf && access && access.required && !access.active && "Attaching a PDF needs the judge access code (enter it below), or remove the file.",
  ].filter(Boolean) as string[];

  const setFact = (path: string, patch: Partial<{ value: string; status: Status }>) =>
    setFacts((f) => {
      const next = { ...f[path], ...patch };
      if (patch.value !== undefined && next.status === "absent" && patch.value.trim()) next.status = "present";
      if (patch.value !== undefined && !patch.value.trim() && next.status === "present") next.status = "absent";
      return { ...f, [path]: next };
    });

  async function create() {
    setStep("saving"); setError(null);
    const body = {
      title: title.trim(), narrative, textOrigin: origin, sourceDescription: sourceDescription || undefined, pdfPages: pdfPages.length ? pdfPages : undefined,
      context: context.length ? context : undefined, charges: charges.map((c) => c.trim()).filter(Boolean),
      facts: FACTS.map((f) => ({ path: f.path, label: f.label, value: facts[f.path].value, status: facts[f.path].status })),
    };
    try {
      const res = await fetch("/api/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const out = await res.json();
      if (!res.ok) throw new Error([out.error, ...(out.issues ?? [])].join(" "));
      if (pdf) {
        const fd = new FormData(); fd.append("file", pdf);
        const up = await fetch(`/api/cases/${encodeURIComponent(out.id)}/pdf`, { method: "POST", body: fd });
        if (!up.ok) throw new Error(`The case was created (${out.id}), but the PDF was not attached: ${(await up.json().catch(() => ({}))).error ?? up.status}`);
      }
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      router.push(`/review/${encodeURIComponent(out.id)}`);
    } catch (e) {
      setError((e as Error).message); setStep("preview");
    }
  }

  if (step !== "edit")
    return (
      <div className="panel" aria-live="polite">
        <h2>Check before creating</h2>
        <dl className="case-details" style={{ position: "static", width: "auto", padding: 0, boxShadow: "none", border: 0 }}>
          <dl>
            <dt>Title</dt><dd>{title}</dd>
            <dt>Narrative text</dt><dd>{ORIGIN[origin]}. {sentences.length} sentence(s), {narrative.trim().length} characters. It will be reviewed exactly as entered.</dd>
            <dt>Context</dt><dd>{context.length ? context.map((c) => CONTEXTS[c as keyof typeof CONTEXTS]).join(", ") : "Not set: NarrativeCheck will infer it carefully, and items that depend on it may show “applicability unclear”."}</dd>
            <dt>Officer-selected charge</dt><dd className="mono">{charges.filter(Boolean).join("; ")}</dd>
            <dt>Source PDF</dt><dd>{pdf ? `${pdf.name} (stored with this case for viewing only; no text will be read from it)` : "None attached"}{pdfPages.length ? ` · narrative pages ${pdfPages.join(", ")}` : ""}</dd>
          </dl>
        </dl>
        <h3 className="section-title" style={{ marginTop: 14 }}>Form fields</h3>
        <table className="table">
          <tbody>
            {FACTS.map((f) => {
              const v = facts[f.path];
              const q = v.status === "present" ? fieldQuality(v.value) : null;
              return <tr key={f.path}><td>{f.label}</td><td>{v.status === "present" ? v.value : <span className="muted">{v.status === "absent" ? "Not recorded" : v.status === "redacted" ? "Redacted" : v.status === "unreadable" ? "Unreadable" : "Not applicable"}</span>}</td><td className="small">{q && q !== "known" ? QUALITY_LABEL[q] : ""}</td></tr>;
            })}
          </tbody>
        </table>
        <h3 className="section-title" style={{ marginTop: 14 }}>Narrative preview</h3>
        <div className="paper" style={{ margin: 0 }}><div className="paper-body" style={{ padding: "20px 28px" }}><div className="doc-text">{narrative}</div></div></div>
        {error && <div className="banner banner-error" role="alert" style={{ marginTop: 12 }}><Icon name="alert" /> {error}</div>}
        <div className="toolbar" style={{ marginTop: 14 }}>
          <button className="btn btn-secondary" onClick={() => setStep("edit")} disabled={step === "saving"}>Back to edit</button>
          <button className="btn btn-primary" onClick={create} disabled={step === "saving"}><Icon name="check" size={14} />{step === "saving" ? "Creating…" : "Create case"}</button>
        </div>
      </div>
    );

  return (
    <form className="panel" onSubmit={(e) => { e.preventDefault(); if (!problems.length) setStep("preview"); }} noValidate>
      {restored && (
        <div className="banner banner-info" role="status" style={{ marginBottom: 12 }}>
          <Icon name="clock" />
          <div><strong>Draft restored.</strong> Your unsaved entries from this browser session are back.{restored.hadPdf && !pdf ? " Attach the PDF again; files cannot be kept in a draft." : ""}{" "}
            <button type="button" className="btn btn-ghost btn-sm" onClick={discardDraft}>Discard draft</button></div>
        </div>
      )}
      <div className="form-grid">
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="t">Title</label>
          <input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short description, e.g. Bus check at Sault Ste. Marie" maxLength={160} />
        </div>
        <fieldset className="field" style={{ gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 }}>
          <legend className="field label" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", marginBottom: 4 }}>Where does the narrative text come from?</legend>
          <div className="chip-group">{(Object.keys(ORIGIN) as (keyof typeof ORIGIN)[]).map((k) => <button type="button" key={k} className="chip" aria-pressed={origin === k} onClick={() => setOrigin(k)}>{ORIGIN[k]}</button>)}</div>
        </fieldset>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="n">Officer narrative</label>
          <textarea id="n" value={narrative} onChange={(e) => setNarrative(e.target.value)} placeholder="Paste or type the narrative exactly as written. Use [REDACTED] for withheld text and [UNREADABLE] for text you could not read." />
          <span className="help">NarrativeCheck reviews this text exactly as entered and never rewrites it. {sentences.length ? `${sentences.length} sentence(s).` : ""}</span>
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", marginBottom: 4 }}>Case context (optional)</legend>
          <div className="chip-group">{(Object.keys(CONTEXTS) as (keyof typeof CONTEXTS)[]).map((k) => <button type="button" key={k} className="chip" aria-pressed={context.includes(k)} onClick={() => setContext((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))}>{CONTEXTS[k]}</button>)}</div>
          <span className="help">Decides which checklist items apply. Leave empty if unsure.</span>
        </fieldset>
        <div className="field">
          <label>Officer-selected charge</label>
          {charges.map((c, i) => <input key={i} className="mono" value={c} onChange={(e) => setCharges((cs) => cs.map((x, j) => (j === i ? e.target.value : x)))} placeholder="e.g. INA 212(a)(6)(A)(i)" aria-label={`Charge ${i + 1}`} />)}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCharges((c) => [...c, ""])} style={{ alignSelf: "flex-start" }}>+ Add charge</button>
        </div>
      </div>

      <h3 className="section-title" style={{ marginTop: 18 }}>Form fields</h3>
      <p className="help small muted" style={{ marginTop: 0 }}>Record each field as it appears on the form. A field written as unknown (for example “Unknown Date”) is kept and shown as documented-as-unknown, not as established.</p>
      {FACTS.map((f) => (
        <div className="fact-row" key={f.path}>
          <label htmlFor={`f-${f.path}`} className="small">{f.label}</label>
          <input id={`f-${f.path}`} value={facts[f.path].value} onChange={(e) => setFact(f.path, { value: e.target.value })} placeholder={f.hint} disabled={facts[f.path].status === "redacted" || facts[f.path].status === "unreadable" || facts[f.path].status === "not_applicable"} style={{ padding: "6px 9px", border: "1px solid var(--line-2)", borderRadius: 7 }} />
          <select aria-label={`${f.label} status`} value={facts[f.path].status} onChange={(e) => setFact(f.path, { status: e.target.value as Status, ...(e.target.value !== "present" ? { value: "" } : {}) })} style={{ padding: "6px 8px", border: "1px solid var(--line-2)", borderRadius: 7 }}>
            <option value="present">Recorded</option><option value="absent">Not recorded</option><option value="redacted">Redacted</option><option value="unreadable">Unreadable</option><option value="not_applicable">Not applicable</option>
          </select>
        </div>
      ))}

      <h3 className="section-title" style={{ marginTop: 18 }}>Source document (optional)</h3>
      <div className="form-grid">
        <div className="field"><label htmlFor="sd">Source description</label><input id="sd" value={sourceDescription} onChange={(e) => setSourceDescription(e.target.value)} placeholder="e.g. I-213 for event 2017-0412" maxLength={300} /></div>
        <div className="field"><label htmlFor="pdf">Attach the source PDF</label><input id="pdf" type="file" accept="application/pdf,.pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /><span className="help">At most {MAX_PDF_MB} MB. Stored with this case for viewing pages only. NarrativeCheck does not read text from PDFs: scanned pages are not read.</span>
          {access?.required && !access.active && (access.configured ? <JudgeAccess compact purpose="PDF uploads" onGranted={() => setAccess({ ...access, active: true })} /> : <span className="help">PDF upload is not available on this deployment.</span>)}</div>
        <div className="field"><label htmlFor="pp">Narrative pages in the PDF</label><input id="pp" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="e.g. 2, 3, 4" /></div>
      </div>

      {problems.length > 0 && <ul className="small" style={{ color: "var(--warn)" }}>{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      <div className="toolbar" style={{ marginTop: 14 }}>
        <button type="submit" className="btn btn-primary" disabled={problems.length > 0}>Preview</button>
        <span className="small muted">Nothing is saved until you confirm the preview.</span>
      </div>
    </form>
  );
}
