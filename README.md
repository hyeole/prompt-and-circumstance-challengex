# NarrativeCheck

**Team: Prompt & Circumstance** · CHALLENGE X · Unissant use case: *GenAI-Assisted Gap Analysis for Investigative Charge Documentation*

NarrativeCheck reviews an officer-written charge narrative, the case facts behind it, and the officer-selected Title 8 / INA charge. It points out missing required information, internal inconsistencies, unclear statements, and possible citation mismatches. Every flag links to the exact sentence or form field it came from.

It **never** rewrites the narrative, never picks or changes the charge, and never fills in missing facts. Ambiguous and multi-charge cases go to a person.

![NarrativeCheck review workspace after a live review of a team test case with a planted contradiction](docs/design/review-screen-v2.png)

*Live review of team test case C012-X1. Two conflicting statements about the manner of entry are highlighted and linked to the form field. The case is routed to human review.*

## Pages

| Page | What it is for |
|---|---|
| **Workspace** `/` | Recent cases, pending officer actions, real review statuses, New case |
| **Cases** `/cases` | Searchable, filterable library: adapted source records, synthetic test variants, entered cases. **New case** `/cases/new` has a preview step |
| **Review** `/review/[id]` | Document workspace: narrative, form facts, findings, evidence explorer, officer decisions |
| **Review history** `/review/[id]/history` | Immutable versions, word-level officer edits, new / persisting / resolved findings, notes |
| **References** `/references` | Unissant guidance (verbatim), team checklist v2, team charge summaries (not sponsor-approved), glossary, versions |
| **Report** `/report/[id]` and **Audit** `/audit/[id]` | One-page gap report; detailed multi-page audit export with decisions and notes |

Your work is saved on this computer in `data/local/`. That folder is git-ignored and excluded from sharing ZIPs; nothing is uploaded. Edits you have not reviewed yet are kept only for the browser session.

## What it does

| Area | Behavior |
|---|---|
| Document canvas | Original narrative with clickable highlights, source PDF page markers, redactions shown as labelled chips |
| Findings panel | Human-review indicator, citation check, required-elements checklist, findings with verified evidence |
| Case facts panel | Collapsible form fields with availability status (present, redacted, absent, unreadable), and the officer-selected charge |
| Corrections | The officer edits their own text or facts. Earlier findings are marked outdated until a fresh review runs |
| Report | One-page printable gap report per case (Export report, then Save as PDF) |

### Review pipeline

1. **Rule checks** (deterministic code):
   - required elements already recorded in form fields;
   - redacted fields treated as unavailable rather than missing;
   - "Unknown" values qualified as *recorded as unknown*;
   - multiple selected charges;
   - encounter time on the form vs. the arrest time in the narrative.
2. **Three parallel model requests** to the Unissant-hosted `gpt-oss-20b`:
   - two independent review samples (elements, issues, citation opinion);
   - one **fact extraction** (entry and removal statements with exact quotes).

   Case text is passed as data, never as instructions.
3. **Code compares the extracted facts** with the form fields and with each other: entry year, manner of entry, and prior removals. It also checks the selected charge's core requirement (for example, an overstay charge needs a documented admission).
4. **Verification:**
   - every quote must match the reviewed text exactly (redaction markers normalized), or the statement is withheld;
   - contradictions need two verified sources;
   - text that names or suggests another charge is removed from everything displayed;
   - a charge that fits only one of two conflicting accounts is marked *needs human review*.
5. **Honest status.** Each check reports *completed with findings*, *completed with no findings*, *partial*, or *unavailable*. If the model fails, the app says "Partial review" and substitutes nothing.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for request counts, timeouts and the measured latency.

## Evaluation (internal, team-created test cases)

We built 37 test cases: 9 verified adapted public records and 28 copies, each with one documented planted issue. Answers are kept separately from the inputs, and the cases are split into dev and held-out sets by base case. Full detail is in [eval/README.md](eval/README.md) and [eval/RUNS.md](eval/RUNS.md).

| Measure | Internal held-out run (untouched, 21 cases) | Deck target |
|---|---|---|
| Strict detection of planted issues | 83% (15/18) | at least 90%: **not met** |
| Incorrect flags (hand-adjudicated) | 28% (5/18) | at most 10%: **not met** |
| Ambiguous / multi-charge cases routed to a person, for the planted reason | 100% (2/2 and 3/3) | 100%: met |
| Evidence references reproduce the source text | 100% | every flag: met |
| Review time, p50 / max | 22s / 55s | under 60s: met |

Later runs after error analysis are **post-hoc** and do not replace this result. They are listed in `eval/RUNS.md`.

## Reports and demo

- **One-page gap reports** for all 77 evaluation cases: [docs/reports/narrativecheck-case-reports.pdf](docs/reports/narrativecheck-case-reports.pdf).
  - They were generated from the saved results of the final evaluation of build `7efb231`.
  - Every report was checked automatically (`tools/verify_reports.py`): 77 of 77 pass, and the 2 partial reviews show the partial-review notice.
- **Demo video:** a captioned walkthrough of the evaluated production build with live reviews. It is illustrative, since live output varies. The link will be added once it is uploaded. Beats were verified before recording ([docs/demo-verification.md](docs/demo-verification.md)); the shot list is in [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md).
- **Final planned evaluation** (post-tuning, not held-out) of the frozen build `7efb231` on all three datasets (77 cases): [eval/EVALUATION-closeout-7efb231.md](eval/EVALUATION-closeout-7efb231.md).
  - **Strict detection: 78% (42/54).** The 90% target is **not met**. It is 74% (40/54) counting C003-AMB as routed (robustness caveat).
  - **Incorrect flags: 2% (2/100)** in the claim-aware layer, 4% (4/100) in the original-record layer. The 10% target is met.
  - **Other measures:** completion 97% (75/77), unnecessary routing 7% (3/43), 0 should-not-flag violations, evidence quotes match the source text 100%.
  - **Remaining misses:** mostly genuine attribution uncertainty in multi-person narratives, routed to a person with the statement named.

## Important limitations

- **References.** On 2026-10-30 Unissant confirmed that it will **not** provide a charge reference sheet or a checklist, and supplied a "Core elements to cover" table as guidance. That table is kept verbatim in [`config/sponsor/`](config/sponsor/).
  - [`config/references.json`](config/references.json) (checklist v2) is the team's implementation of that guidance plus the Form I-213 instruction. Each item names its sponsor category and the contexts where it applies.
  - The charge summaries are team paraphrases of public statutory text. They are **not** sponsor-approved and are not legal advice.
  - See [docs/SPONSOR-ALIGNMENT.md](docs/SPONSOR-ALIGNMENT.md).
- **Cases are adapted public records.** They come from a redacted public CBP release; see [Data and provenance](#data-and-provenance). The original records are not an answer key.
- **Evaluation scores are internal.** Planted-error test cases are team-created until Unissant supplies its test set. The single untouched held-out run does not meet the detection and incorrect-flag targets.
- **Fact extraction can time out.** 2 of 77 reviews in the final evaluation hit the 55-second limit and were reported as partial. Duration tracks the generated tokens (r = 0.96) at a steady rate, so long generations are the likely cause. This is not proven for the failed calls, and no limit was raised.
- **Redacted names** often make it impossible to tell which person a statement belongs to. The app routes such statements to a person and names them; it does not assume. This is the main reason the detection target is not met.
- The tool is decision support. Its output is not a legal determination.

## Run it

See [docs/SETUP.md](docs/SETUP.md). In short:

```bash
npm install
# create .env.local with CHALLENGEX_API_KEY (see docs/SETUP.md; never commit it)
npm run check:api
npm run dev
```

## Documentation

- [docs/HOW-IT-WAS-BUILT.md](docs/HOW-IT-WAS-BUILT.md): beginner-friendly walkthrough of every part
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): request flow and design decisions
- [DESIGN.md](DESIGN.md): visual and interaction rules
- [eval/README.md](eval/README.md): test set, splits, and matching policy
- [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md): demo shot list and narration
- [docs/DEVLOG.md](docs/DEVLOG.md): development log

## Useful commands

| Command | What it does |
|---|---|
| `npm run check:api` | Tests the model connection (the key is never printed) |
| `npm run dev` | Starts the app at http://localhost:3000 (`/?set=eval` opens the evaluation cases) |
| `npm test` | Unit tests, no key needed |
| `npm run eval:build` | Rebuilds the test variants from `eval/variants.json` |
| `npm run eval -- --split dev` | Runs live reviews for a split and saves the results |
| `npm run eval:score -- eval/runs/<timestamp>` | Scores a run and writes `REPORT.md` |
| `node scripts/export-reports.mjs eval/runs/<timestamp>` | Writes a one-page PDF report per case from saved results |
| `npm run demo:record` | Records a captioned walkthrough video with Chrome (needs `npx playwright-core install ffmpeg` once) |

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
