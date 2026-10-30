# Development log

Short record of what changed, why, and how to check it. Newest at the bottom.

## 2026-10-29 (Thu) Day 1: sources, extraction, first workspace

**Read the sources.** Challenge deck, Student Quickstart, earlier handoff, model resources slide, public CBP PDF.
The deck says Unissant will provide synthetic narratives, an answer key, a charge reference sheet, and a required-elements list.
None of these were in the materials we had. We asked about them and built with clearly labelled provisional references in the meantime.

**Checked the PDF.** 634 pages; 290 pages have no embedded text (scanned images).
Every case starts with a Form I-213 page followed by I-831 continuation pages.
Grouping by I-213 starts produced 149 candidate cases. 148 agree with the printed "N of M Pages" totals.
Most cases are 4 to 5 pages.

**Extraction tool** (`tools/extract/`):
- `extract_pages.py` uses embedded text where it exists and Apple Vision OCR (built into macOS, free, local) where it does not.
- Redaction labels such as "(b) (6), (b) (7)(C)" are placed back on the line where they appear on the page.
- `group_cases.py` groups pages into candidate cases.
- `build_case.py` turns a hand-checked manifest into an app case file, keeping PDF page ranges for every part of the narrative.
- OCR misreads small redaction labels, so OCR pages are transcribed by hand from the page image and checked visually.

**First verified case: C001** (PDF pages 1 to 4). The I-213 fields and the page 2 narrative were checked against the page images.
A blank area before "7," on page 2 is recorded as `[UNREADABLE]`.
The form has charge code `I6A` and no statutory citation. For testing, we assigned `INA 212(a)(6)(A)(i)` and labelled it as team-assigned.

**Review engine** (`lib/review/`):
1. Rule checks run first: form fields that satisfy required elements, redacted fields treated as unavailable, multiple charges, multiple people in one narrative, encounter time on the form vs. the narrative.
2. One model call checks the remaining elements, consistency, clarity, and the selected charge.
3. The output is validated with a schema. Every quoted piece of evidence must match the exact reviewed text or the statement is withheld.
4. A contradiction needs two verified sources. Any sentence that suggests a different charge is removed.

**Workspace UI**:
- Facts panel, document canvas, and findings panel.
- Highlights link to findings in both directions.
- A missing-elements checklist.
- Findings are marked outdated after edits, and a fresh review is required.
- Acknowledge, or dismiss with a reason.
- A printable one-page report.

**Verified:**
- `npm test`: 8 tests pass (sentence offsets, page numbers, quote verification, C001 rules, multi-charge routing, redaction handling).
- With no key configured, the app shows "Partial review", lists the checks that did not run, and substitutes no results.

**Pending:** live API check (needs the key on this Mac), more cases, evaluation set.

## 2026-10-29 (Thu, evening) Day 1 continued: more cases, evaluation set, live connection, video

**Live API verified.** `npm run check:api` passed:
- plain chat (4.7s);
- JSON mode;
- strict JSON schema;
- model list (`gpt-oss-20b`).

The key is in `.env.local` (permissions 600, git-ignored).

**8 more verified cases.** C003, C012, C013, C021, C037, C045, C119, C135.
- Form fields were typed by hand from the I-213 page images.
- Narratives come from embedded text.
- Five narratives state their own charge; we use that citation and record its page. The other cases have a team-assigned charge, labelled as such.
- C012 and C013 are the same incident (two subjects), so they stay in the same split.

**Two rule fixes found on real data:**
- The "several people" rule fired on 8 of 9 cases. These records really are group encounters, and redaction hides who said what. That is a property of the public data, so it is now an informational note and no longer forces human review.
- The time rule would have flagged "arrested and transported to the station at 2145 hours", where the time belongs to the transport. It now only uses times that belong to the arrest or encounter itself.

**Evaluation set** (`eval/`): 9 bases plus 28 variants (37 cases), with expected findings stored apart from the inputs, a split by base case, a scorer with a written matching policy, and a PDF report exporter.

**Video.**
- Playwright with the installed Chrome records real `.webm` video.
- It needed Playwright's 1.4 MB ffmpeg encoder, downloaded once into Playwright's cache.
- The first scripted walkthrough recorded fine. It showed that the ambiguous test case C003-AMB was **not** routed to human review. That needs fixing.

## 2026-10-29 (Thu, night) Live evaluation and tuning

**C001 verified live:**
- 20.4s total, one model call.
- The citation `INA 212(a)(6)(A)(i)` is consistent. Its evidence (form `entry.manner` = "EWI AFOOT" p.1; S16 "all subjects stated they did not have any immigration documents" p.3) matches the PDF.
- The time finding (S17 "arrest at 1330 hours" p.3 vs form 1435 p.1) matches the PDF.
- Bug found and fixed: the human-review banner showed no reasons when the reason came from a finding.

**Tuning history (dev split only: C001, C003, C012, C013 and their variants, 16 cases):**

| Version | Recall | Incorrect flags | Routing | p50 latency | What changed |
|---|---|---|---|---|---|
| review-v1.0 | 69% | 44% | 67% | 26s | baseline |
| review-v1.1 | 69% | 20% | 100%* | 52s | explicit comparisons, human-review criteria, E7 advisory, form glossary. *Partly from timeouts; the scorer now gives no credit for failed reviews |
| + `reasoning_effort=low`, 2 samples | 77% | 18% | 100% | 9s | `medium` timed out at 120s in a probe; `low` answered in 7 to 10s |
| + fact extraction (facts-v1.0/1.1) | 85% | 9% | 100% | 12s | model extracts entry/removal statements, code compares them |
| + charge requirement check (v1.2) | 100% | 14% | 100% | 17s | config `requires`; the more cautious citation result wins |

**Official held-out result** (frozen config, commit `ae55a38`, 21 cases, run once):
- recall **89%** (16/18);
- incorrect flags **24%** (4/17);
- routing **100%** (5/5);
- evidence valid **100%**;
- p50 22s, max 55s, none over 60s.

**Error analysis of held-out:**
- 2 missed missing-manner cases. One was a flaw in our own test case: a smuggler sentence still implied the crossing.
- 1 extra flag from a redacted companion's entry date. A real limitation: names are redacted.
- 1 from "removable" being read as "removed".
- 1 model citation "mismatch" that contradicted its own explanation.
- 1 from "LAR" vs "Laredo".

The general fixes are in commit `2c9e2d4`. Any held-out number after that is **post-hoc**, not blind.

**Latency note:** the shared endpoint's speed varies a lot with load. The same code measured p50 17s at one time and 38s an hour later. We now run evaluations one case at a time.

## 2026-10-29 (Thu, late night) Audit, rescoring, and redesign

**Labels:** internal held-out vs post-hoc.
- The first held-out run (`2026-10-29T22-28-28`, commit `ae55a38`) is the **internal held-out evaluation**: team-made cases, not a sponsor evaluation.
- Every later run on those cases is **post-hoc**.
- Registry: `eval/RUNS.md`.

**Scoring policy v2 / v2.1** (`eval/README.md`):
- Completion is reported separately, and failed reviews count as missed. The exception is a planted issue that a deterministic rule caught without the model.
- Strict detection: generic routing is "routed only", not detection.
- Every non-planted flag is adjudicated by hand against the source (`eval/adjudications.json`) or counted as incorrect.
- Routing that rests on a verified real discrepancy is reported separately from unnecessary routing.

**Internal held-out under v2.1:** strict recall 83% (15/18), incorrect flags 28% (5/18, all adjudicated false), routing 100%, evidence valid 100%, p50 22s. This misses the 90% and 10% targets.
- Separately: excluding the doubtful v1 C037-M3 label gives 88% (15/17).
- The v1 dataset is archived in `eval/archive/dataset-v1-ae55a38/`.

**Audit fixes (commits `554c9b8`, `b53135e`):**
- **Exact evidence.** Redaction markers are normalized. Model claims need exact matches or are withheld. Partial fragments are only allowed in date comparisons when the fragment contains the year, and they are labelled "partial".
- **Per-request log.** In the diagnostic run: 48 requests for 16 reviews; review samples 22 ok / 6 cancelled / 4 timed out; facts 15 ok / 1 timed out. Only 7 reviews merged two samples, and merging added no single-sample flags.
- **Charge-wording filter.** It now covers every displayed text. A sentence-split bug that let "8 U.S.C. 1325(a)" through is fixed.
- **Time rule.** It now catches "At approximately 1030 hours, X was placed under arrest". That is a real 0950 vs 1030 discrepancy in C003, verified on the page image. Headings and call times are excluded.
- **Tests.** 41 regression and unit tests at that point.

**Design (approved direction, then refinements):**
- A redesigned workspace (see `DESIGN.md`).
- From the design review:
  - "Unknown Date, Unknown Time" is shown as *Recorded as unknown*.
  - The citation shows *Needs human review* when entry facts conflict.
  - Partial reviews no longer show a green "No findings".
  - Wordmark, short titles with case details, rail tooltips, softer highlights, and a blue-grey textured workspace.
- UI QA at 1280×800 and 1366×768: no overflow. A missing favicon (404) was fixed.
- 44 tests pass.

## 2026-10-30 (Fri, ~00:00 UTC) Final run, reports, production build, demo video

**Final run.** `2026-10-29T23-32-42`: post-tuning, shipped code `8c0b474`, all 37 cases, one at a time.
- Completion 100% (no partial reviews).
- Strict recall 94% (29/31).
- Incorrect flags 12% (5/41, all adjudicated; the 10% target is **not met**). Three of the five are one redacted-companion attribution error on C021.
- Routing 100%, evidence valid 100%, p50 18s, max 55s.
- This run is **not** a held-out claim. The internal held-out result stays 83% recall / 28% incorrect flags.

**Wording.**
- Partial reviews show a neutral "Review incomplete" state, and counts are labelled "Findings from completed checks only".
- The checklist and report say **Established** vs **Documented as unknown (not established)** / **Partly established**.

**Production build.** `next build` succeeded, and the key is absent from the client bundle. Both states were checked in the production build.

**Reports.** 37 one-page reports, exported from the production build and checked by `tools/verify_reports.py`. All pass: 1 page, no clipping, footer, human-review marker, every evidence reference, no partial notice where none is due. The 4 partial reviews from the post-hoc run were also exported and pass with the notice present. Combined file: `docs/reports/narrativecheck-case-reports.pdf` (800 KB).

**Demo.** All six beats verified live, then recorded. The beat log during recording matched (see `docs/DEMO-SCRIPT.md`). MP4 conversion is not available on this Mac (Playwright's encoder is VP9-only), so the video is `.webm`.

## 2026-10-30 (Fri) Reliability, sponsor alignment, multi-page app, fresh evaluation

**Reliability:**
- Traced the final run's 5 wrong flags and 2 misses to source.
- Extraction v2 records country, event type and uncertainty; attribution is decided in code (only literal "Subject" counts).
- Claim-support check: dates and times a claim relies on must appear in its evidence.
- From the adjudicated sample comparison:
  - PWA/EWI vs "crossed illegally" is no longer a conflict;
  - Mexico entries are no longer evidence for U.S.-entry conflicts;
  - removal-supported reentry citations are no longer called mismatches.
- 1 vs 2 samples: kept 2 (weak evidence, documented in `eval/RUNS.md`).

**Sponsor clarification.** Unissant will not provide a reference sheet or checklist and gave a six-row guidance table.
- Preserved verbatim.
- Traceability and gap audit in `docs/SPONSOR-ALIGNMENT.md`.
- Checklist v2 adds N1–N8, case context, and "not applicable" / "applicability unclear".
- Legacy scores keep their v1 definitions.

**Multi-page app:**
- Workspace, Cases (with intake and preview), Review, Review history, References, Report and Audit.
- Local store with immutable versions and officer decisions.
- Evidence explorer with side-by-side conflicts.
- Production build checked; `scripts/e2e-workflow.mjs` passes 18/18 live checks.

**Datasets:**
- **Legacy benchmark:** 37 cases, unchanged.
- **dev-synthetic-v1:** 12 cases. Development run: recall 4/6, checklist expectations 50/50, 1 should-not-flag violation (unattributable entry year, kept as a known limitation).
- **fresh-v1:** 28 cases, prepared and frozen (tag `fresh-eval-v1-frozen`) before its single run.
