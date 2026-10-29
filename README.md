# NarrativeCheck

**Team: Prompt & Circumstance** · CHALLENGE X · Unissant use case: *GenAI-Assisted Gap Analysis for Investigative Charge Documentation*

NarrativeCheck reviews an officer-written charge narrative, the case facts behind it, and the officer-selected Title 8 / INA charge. It points out missing required information, internal inconsistencies, unclear statements, and possible citation mismatches. Every flag links to the exact sentence or form field it came from.

It **never** rewrites the narrative, never picks or changes the charge, and never fills in missing facts. Ambiguous and multi-charge cases go to a person.

> Status: in active development for the CHALLENGE X deadline. See [docs/DEVLOG.md](docs/DEVLOG.md).

## What it does

| Area | Behavior |
|---|---|
| Document canvas | Original narrative with clickable highlights, source PDF page markers, redactions shown as labelled chips |
| Findings panel | Human-review indicator, citation check, required-elements checklist, findings with verified evidence |
| Case facts panel | Collapsible form fields with availability status (present, redacted, absent, unreadable), and the officer-selected charge |
| Corrections | The officer edits their own text or facts. Earlier findings are marked outdated until a fresh review runs |
| Report | One-page printable gap report per case (Export report, then Save as PDF) |

### Review pipeline

1. **Rule checks** (deterministic):
   - required elements already recorded in form fields;
   - redacted fields treated as unavailable rather than as omissions;
   - multiple selected charges;
   - narratives covering several people;
   - encounter time on the form vs. the narrative.
2. **One model call** to the Unissant-hosted `gpt-oss-20b`. Case text is passed as data, never as instructions.
3. **Verification**:
   - output is validated against a schema;
   - every quote must match the reviewed text exactly, or the statement is withheld;
   - contradictions need two verified sources;
   - any suggestion of a different charge is removed.
4. **Honest status**: each check reports *completed with findings*, *completed with no findings*, *partial*, or *unavailable*. If the model call fails, the app says so and does not substitute results.

## Important limitations

- **References are provisional.** Unissant's charge reference sheet and required-elements list have not been received yet. [`config/references.json`](config/references.json) contains:
  - required elements taken from the instruction printed on Form I-213;
  - plain-English paraphrases of public statutory text, compiled by the team.

  Neither is sponsor-verified or legal advice.
- **Cases are adapted public records.** They come from a redacted public CBP release; see [Data and provenance](#data-and-provenance). The original records are not an answer key.
- **Evaluation scores are internal.** Planted-error test cases are team-created until Unissant supplies its test set.
- The tool is decision support. Its output is not a legal determination.

## Run it

See [docs/SETUP.md](docs/SETUP.md). In short:

```bash
npm install
# create .env.local with CHALLENGEX_API_KEY (see docs/SETUP.md; never commit it)
npm run check:api
npm run dev
```

## Data and provenance

- Source: CBP, *Detroit Sector Forms I-213 and I-44 FY 2012 – 2019 Part 5* (public, redacted), [cbp.gov link](https://www.cbp.gov/sites/default/files/assets/documents/2022-Jan/Detroit%20Sector%20Forms%20I-213%20and%20I-44%20FY%202012%20%E2%80%93%202019%20Part%205_0.pdf). The PDF itself is not committed.
- `tools/extract/` holds the preparation scripts: embedded text plus local Apple Vision OCR, case grouping, and the case builder.
- `data/manifests/` holds hand-verified transcriptions with page numbers. `data/cases/` holds the generated case files the app loads.
- Each case records its source pages, extraction method, verification notes, and any synthetic replacements.

## Repository layout

```
app/                 Next.js app (page + /api/review server route)
components/          Review workspace UI
lib/review/          Rules, prompt, schema, pipeline
lib/llm.ts           Server-only model client (key never reaches the browser)
config/              Versioned reference rules (provisional)
data/                Case manifests and case files
tools/extract/       PDF extraction and case preparation (Python)
tests/               Unit tests
docs/                Setup, architecture, design, development log
```

## Model

Unissant-hosted `gpt-oss-20b` through its OpenAI-compatible endpoint. An OpenAI account is not used. The key is read from `CHALLENGEX_API_KEY` on the server only.

---
Built by **Prompt & Circumstance** for CHALLENGE X.
