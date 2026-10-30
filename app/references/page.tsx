import AppShell from "@/components/AppShell";
import refs from "@/config/references.json";
import sponsor from "@/config/sponsor/unissant-guidance-2026-10-30.json";

type Item = { id: string; label: string; description: string; sponsorCategory?: string; appliesIn?: string[]; advisory?: boolean; source: string; fieldPaths: string[] };
const CTX: Record<string, string> = { all: "All cases", interior: "Interior encounter", port_of_entry: "Port of entry", expedited_removal: "Expedited removal" };

export default function ReferencesPage() {
  const items = refs.requiredElements as Item[];
  return (
    <AppShell crumbs={[{ label: "Workspace", href: "/" }, { label: "References" }]}>
      <main className="page" id="main">
        <div className="page-inner">
          <h1 className="page-title">References</h1>
          <p className="lede">Three different kinds of reference material are kept apart here: guidance from Unissant, the team&apos;s implementation choices, and supplementary statutory summaries written by the team.</p>

          <section className="panel" aria-labelledby="sponsor-h">
            <h2 id="sponsor-h">1. Unissant guidance <span className="tag tag-source">Sponsor-provided · {sponsor.version}</span></h2>
            <p className="small"><strong>Test cases:</strong> {sponsor.answers.testCases}</p>
            <p className="small"><strong>Charge reference sheet and checklist:</strong> {sponsor.answers.chargeReferenceSheetAndChecklist}</p>
            <table className="table" style={{ marginTop: 8 }}>
              <thead><tr><th>Core element to cover</th><th>What the narrative should establish (verbatim)</th></tr></thead>
              <tbody>{sponsor.coreElementsToCover.map((s) => <tr key={s.id}><td><strong>{s.id}</strong> {s.element}</td><td className="small">{s.shouldEstablish}</td></tr>)}</tbody>
            </table>
            <p className="small muted">{sponsor.note} Treated as contextual guidance: what to establish where it applies, not a rule that every detail must appear in every case.</p>
          </section>

          <section className="panel" style={{ marginTop: 14 }} aria-labelledby="team-h">
            <h2 id="team-h">2. Team checklist ({refs.checklistVersion}) <span className="tag">Team implementation · {refs.version}</span></h2>
            <p className="small">How NarrativeCheck applies the guidance. Each item names its sponsor category and where it applies. Items that do not apply show <em>Not applicable</em>; items whose context is unknown show <em>Applicability unclear</em>. Neither is reported as missing. Facts recorded only in form fields are shown as “From the form”, and fields written as unknown as “Documented as unknown”.</p>
            <table className="table">
              <thead><tr><th>Item</th><th>Category</th><th>Applies in</th><th>What is checked</th></tr></thead>
              <tbody>{items.map((e) => <tr key={e.id}><td><strong>{e.id}</strong> {e.label}{e.advisory ? <div className="small muted">advisory: checklist only, never a flag</div> : null}</td><td>{e.sponsorCategory ?? "—"}</td><td className="small">{(e.appliesIn ?? ["all"]).map((c) => CTX[c] ?? c).join(", ")}</td><td className="small">{e.description}<div className="muted">Source: {e.source}{e.fieldPaths.length ? ` · form fields: ${e.fieldPaths.join(", ")}` : ""}</div></td></tr>)}</tbody>
            </table>
            <h3 className="section-title" style={{ marginTop: 12 }}>Case contexts</h3>
            <ul className="small">{Object.entries(refs.contexts ?? {}).map(([k, v]) => <li key={k}><strong>{CTX[k] ?? k}:</strong> {String(v)}</li>)}</ul>
          </section>

          <section className="panel" style={{ marginTop: 14 }} aria-labelledby="charges-h">
            <h2 id="charges-h">3. Supplementary charge summaries <span className="tag tag-edited">Team paraphrase · not sponsor-approved</span></h2>
            <p className="small">Plain-English summaries of public statutory text in Title 8 of the U.S. Code, written by the team so the citation check has something to compare against. They are not legal advice and were not reviewed by Unissant. NarrativeCheck checks the officer-selected charge against them and never suggests a different charge.</p>
            <table className="table">
              <thead><tr><th>Charge</th><th>Summary</th><th>Core requirement checked in code</th></tr></thead>
              <tbody>{refs.charges.map((c) => <tr key={c.id}><td className="mono small">{c.citations.join(" / ")}</td><td className="small"><strong>{c.title}.</strong> {c.plainEnglish}</td><td className="small">{"entryManner" in (c.requires ?? {}) ? `Entry manner: ${(c.requires as { entryManner: string }).entryManner.replace(/_/g, " ")}` : "applicationForAdmission" in (c.requires ?? {}) ? "Application for admission described" : "Prior removal documented"}</td></tr>)}</tbody>
            </table>
          </section>

          <section className="panel" style={{ marginTop: 14 }} aria-labelledby="gloss-h">
            <h2 id="gloss-h">Form abbreviations <span className="tag">Team-compiled</span></h2>
            <ul className="small">{Object.entries(refs.formGlossary).filter(([k]) => k !== "note").map(([k, v]) => <li key={k}><span className="mono">{k}</span>: {String(v)}</li>)}</ul>
            <p className="small muted">{refs.formGlossary.note}</p>
          </section>

          <section className="panel" style={{ marginTop: 14 }} aria-labelledby="src-h">
            <h2 id="src-h">Versions and sources</h2>
            <ul className="small">
              <li>Sponsor guidance: <span className="mono">{refs.sponsorGuidance}</span> ({sponsor.version}).</li>
              <li>Team references: <span className="mono">config/references.json</span> ({refs.version}, checklist {refs.checklistVersion}). Earlier version: {refs.previousVersions.join("; ")}. Results are always reported with the version they used.</li>
              <li>Sample narratives: <a href="https://www.cbp.gov/sites/default/files/assets/documents/2022-Jan/Detroit%20Sector%20Forms%20I-213%20and%20I-44%20FY%202012%20%E2%80%93%202019%20Part%205_0.pdf" target="_blank" rel="noopener">CBP Detroit Sector Forms I-213 and I-44 FY 2012–2019 Part 5</a> (public, redacted; used as guidance on how narratives are written).</li>
              <li>{refs.historicalNote}</li>
            </ul>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
