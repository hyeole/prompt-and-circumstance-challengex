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
