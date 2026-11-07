# NarrativeCheck

**Team: Prompt & Circumstance** · CHALLENGE X · Unissant use case: *GenAI-Assisted Gap Analysis for Investigative Charge Documentation*

**Live demo:** https://project-7kvs7.vercel.app/ (public; live reviews and PDF uploads need the private judge code)

NarrativeCheck reviews an officer-written charge narrative against the case facts from the form and the officer-selected Title 8 / INA charge. It points out:
- missing required information;
- internal inconsistencies;
- unclear statements;
- possible citation mismatches.

Every flag links to the exact sentence or form field it came from.

It **never** rewrites the narrative, never picks or changes the charge, and never fills in missing facts. Ambiguous and multi-charge cases go to a person. It is decision support, not a legal determination.

![NarrativeCheck review workspace after a live review of a team test case with a planted contradiction](docs/design/review-screen-v2.png)

*Live review of team test case C012-X1. Two conflicting statements about the manner of entry are highlighted and linked to the form field. The case is routed to human review.*

## Using the live demo
1. **New case:** enter a title, mark where the text comes from (officer-written, transcribed, or **synthetic test text**), and paste the narrative.
2. **Case facts and context:** enter the form fields as recorded, choose the context (interior encounter, port of entry, expedited removal) and enter the **officer-selected charge**. The app checks that charge; it never chooses one.
3. **Source PDF (optional):** attach the PDF and note which pages hold the narrative. The stored PDF can be opened from the case.
   - **It is for viewing and reference only.**
   - NarrativeCheck does **not** read or extract text from it.
   - The narrative is always the text you entered.
4. **Run review:** the review checks required elements, consistency, clarity and the selected charge. A review usually takes 10–60 seconds.
5. **Results:**
   - **Findings:** each says whether it came from a rule-based check or the model (under *Technical details*). Findings that quote the narrative are highlighted in the text.
   - **Elements checklist:** shows each required element and where it was found.
   - A missing detail has no sentence to highlight, so it is listed instead.
6. **History:** every review is saved as a new numbered version. Earlier versions are not changed.
7. **Gap report:** a one-page summary, printed or saved as a PDF from the browser's print dialog ("Print or save as PDF").

**Public-demo rules:**
- **Synthetic or public redacted text only.** Text you review is sent to the shared Unissant model endpoint.
- **Judge code:** live reviews and PDF uploads need the private judge code, shared with judges privately. Everything else is open.
- **Retention:** saved work is visible only in the browser that created it, and is **deleted 30 days after the last change**.
- **Limits:** usage limits apply. When a limit is reached, the app says so and runs nothing. The defaults are:
  - 15 live reviews per judge session per hour;
  - 30 per IP address per day;
  - 60 per day and 400 in total;
  - 3 at a time;
  - a 3 MB PDF limit;
  - storage caps.

## Pages
| Page | What it is for |
|---|---|
| **Workspace** `/` | Recent cases, pending officer actions, review statuses, New case |
| **Cases** `/cases` | Case library. **New case** `/cases/new` has a preview step before anything is saved |
| **Review** `/review/[id]` | Narrative, form facts, findings, evidence, Elements checklist, officer decisions |
| **Review history** `/review/[id]/history` | Saved versions, officer edits, new / persisting / resolved findings |
| **References** `/references` | Unissant guidance (verbatim), team checklist v2, team charge summaries (not sponsor-approved), glossary |
| **Report** `/report/[id]` and **Audit** `/audit/[id]` | One-page gap report, and a detailed audit export with decisions and notes |

## Review pipeline
1. **Rule checks** (deterministic code):
   - required elements already recorded in form fields;
   - redacted fields treated as unavailable rather than missing;
   - "Unknown" values qualified as *recorded as unknown*;
   - multiple selected charges;
   - the selected charge's core requirement (for example, an overstay charge needs a documented admission);
   - encounter time on the form vs. the arrest time in the narrative.
2. **Three parallel model requests** to the Unissant-hosted `gpt-oss-20b`: two independent review samples and one fact extraction (entry and removal statements with exact quotes). Case text is passed as data, never as instructions.
3. **Code compares** the extracted facts with the form fields and with each other.
4. **Verification:**
   - every quote must match the reviewed text exactly, or the statement is withheld;
   - contradictions need two verified sources;
   - text that suggests another charge is removed.
5. **Honest status:** each check reports *completed with findings*, *completed with no findings*, *partial* or *unavailable*. If the model fails, the app says "Partial review" and substitutes nothing.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for request counts, timeouts and latency.

## Evaluation (internal, team-created test cases)
**Units used below:**
- A **narrative** is a distinct narrative text.
- A **case** is a narrative plus its form facts and selected charge (several cases can share a narrative).
- A **review run** is one review of one case.
- A **planted error** is one labelled defect.

**The 77-case benchmark has:**
- **56 unique narratives**: 15 adapted public CBP records, 20 synthetic variants with edited text, 21 fully synthetic;
- **77 cases**: 15 source records, 40 synthetic variants (20 reuse their source narrative unchanged and change only facts, charge or citation), and 22 fully synthetic cases;
- **54 planted errors** in 50 cases.

The 15 source records and 12 synthetic cases carry no planted error and only count toward incorrect flags. Each evaluation reviews every case once (77 review runs). A separate 12-case set (`gen-v1`) is reported on its own.

**Deployed engine** (`d062b1d`): measured once, locally, on the same locked cases ([eval/measure-d062b1d/REPORT.md](eval/measure-d062b1d/REPORT.md)). This is **post-tuning on a reused development benchmark**, not a held-out result.

| Measure | Result | Deck target |
|---|---|---|
| Strict detection of planted errors | **41/54 (76%)** excluding one clarification-only credit (C045-X1); the linked report's "strict" figure is 42/54 (78%) with it | at least 90%: **not met** |
| Incorrect flags among issued flags | **2/94** in the claim-aware scoring layer; **4/94** in the stricter key-only layer | at most 10%: met in both layers |
| Review completion | **74/77**: 3 partial reviews where both fact-extraction requests timed out | |
| Routing: multi-charge / planted ambiguity | 6/6 / 3/4 | 100%: **not met** (ambiguity) |
| Separate 12-case `gen-v1` set | detection 6/7 (5/7 without one checklist credit), incorrect flags 1/9, completion 12/12 | |

**The only untouched results** come from earlier builds, each run once before any tuning on that set:

| Set | Build | Strict detection | Incorrect flags |
|---|---|---|---|
| Legacy set, 21-case held-out split (dataset v1; 18 planted errors) | `ae55a38` | 15/18 (83%) | 5/18 (28%) |
| fresh-v1 (28 cases, 17 planted errors) | `ab6feb6` | 12/17 (71%) | 11/37 (30%) |

These are the figures to quote for generalisation. They do not meet the targets.

**Why figures differ between documents:**
- The often-quoted "**75/77**" completion and "**2/100**" incorrect flags belong to the closeout evaluation of an earlier build (`7efb231`).
- The deployed engine `d062b1d` measured **74/77** and **2/94**.
- These are two separate runs of two builds, not a counting error.

[docs/EVALUATION-SUMMARY.md](docs/EVALUATION-SUMMARY.md) reconciles every headline figure and links each to its run.

## Limitations
- **Detection target not met.** The deployed engine misses about one in four planted errors on the internal benchmark (most often conflicts within one narrative and attribution in multi-person narratives). The untouched results (83% and 71%, on smaller earlier sets) also miss the 90% target.
- **Internal, team-made test cases.** The benchmark was used during development, so its scores are optimistic. Unissant has not supplied a test set.
- **References are team-provisional.** Unissant supplied guidance (kept verbatim in [`config/sponsor/`](config/sponsor/)), not a charge reference sheet. The checklist and charge summaries in [`config/references.json`](config/references.json) are the team's implementation. They are not sponsor-approved and are not legal advice. See [docs/SPONSOR-ALIGNMENT.md](docs/SPONSOR-ALIGNMENT.md).
- **Fact extraction can time out** (55-second limit). The review then reports "Partial review" rather than guessing.
- **Redacted names** often make it impossible to tell whose statement is whose. Such statements are routed to a person, not assumed.
- **Source PDFs** are stored for viewing only. Scanned pages are not read.
- **Public-demo data** expires 30 days after the last change and is visible only in the browser that created it.

## Run it locally
Requirements: Node.js 20 or later, and a Unissant model key for live reviews (tests and the UI run without one).

```bash
npm install
cp .env.example .env.local   # then fill in values locally; never commit .env.local
npm run check:api            # tests the model connection; the key is never printed
npm run dev                  # http://localhost:3000
npm test                     # unit tests, no key needed
```

**Environment variables** (placeholders only; full list in [`.env.example`](.env.example)):

| Name | Placeholder | Needed for |
|---|---|---|
| `CHALLENGEX_API_KEY` | `<model API key>` | live reviews (server only) |
| `CHALLENGEX_BASE_URL` | `https://<model endpoint>/v1` | optional; has a default |
| `CHALLENGEX_MODEL` | `<model name>` | optional; defaults to `gpt-oss-20b` |
| `UPSTASH_REDIS_REST_URL` | `https://<database>.upstash.io` | public demo only |
| `UPSTASH_REDIS_REST_TOKEN` | `<REST token>` | public demo only |
| `NC_VISITOR_SECRET` | `<32+ random characters>` | public demo only |
| `NC_JUDGE_CODE` | `<16+ characters>` | public demo only |

- **Locally,** without the public-demo variables, work is saved on this computer in `data/local/` (git-ignored), and no judge code is needed.
- **Hosting:** see [docs/SETUP.md](docs/SETUP.md) for local setup and [docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md) for the $0 Vercel + Upstash deployment.

| Command | What it does |
|---|---|
| `npm run eval -- --split dev` | Runs live reviews for a split and saves the results |
| `npm run eval:score -- eval/runs/<timestamp>` | Scores a run and writes `REPORT.md` |
| `npm run eval:build` | Rebuilds the test variants from `eval/variants.json` |
| `node scripts/export-reports.mjs eval/runs/<timestamp>` | Writes a one-page PDF report per case from saved results |

## Documentation
- [docs/HOW-IT-WAS-BUILT.md](docs/HOW-IT-WAS-BUILT.md): beginner-friendly walkthrough
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): request flow and design decisions
- [DESIGN.md](DESIGN.md): visual and interaction rules
- [docs/EVALUATION-SUMMARY.md](docs/EVALUATION-SUMMARY.md): reconciled evaluation figures
- [eval/REPORTS-INDEX.md](eval/REPORTS-INDEX.md): index of every evaluation, deployment and audit record
- [docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md): deployment configuration (names and placeholders only)
- [docs/DEVLOG.md](docs/DEVLOG.md): development log

## Data and provenance
- **Source:** CBP, *Detroit Sector Forms I-213 and I-44 FY 2012 – 2019 Part 5* (public, redacted), [cbp.gov link](https://www.cbp.gov/sites/default/files/assets/documents/2022-Jan/Detroit%20Sector%20Forms%20I-213%20and%20I-44%20FY%202012%20%E2%80%93%202019%20Part%205_0.pdf). The PDF itself is not committed.
- **Preparation:** `tools/extract/` holds the scripts: embedded text plus local OCR, case grouping, and the case builder. `data/manifests/` holds hand-verified transcriptions with page numbers.
- **Cases:** `data/cases/` holds the 13 sample cases the app loads.
- **Recordings:** demo videos are kept outside Git.

## Repository layout
```
app/                 Next.js app (pages and API routes)
components/          Review workspace UI
lib/review/          Rules, prompts, schema, pipeline
lib/llm.ts           Server-only model client (the key never reaches the browser)
lib/kv.ts, store.ts  Storage (local file, or Upstash Redis in the public demo)
config/              Versioned reference rules (team-provisional) and sponsor guidance
data/                Case manifests and case files
eval/                Test sets, runs, scored reports and records
tools/extract/       PDF extraction and case preparation (Python)
tests/               Unit tests
docs/                Setup, architecture, design, deployment, development log
```

## Model
Unissant-hosted `gpt-oss-20b` through its OpenAI-compatible endpoint. The key is read from `CHALLENGEX_API_KEY` on the server only.

---
Built by **Prompt & Circumstance** for CHALLENGE X.
