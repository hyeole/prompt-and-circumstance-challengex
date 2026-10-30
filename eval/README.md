# Evaluation

**Status: internal synthetic evaluation.** Unissant's deck says a planted-error test set and answer key will be provided. Until it arrives, we evaluate on test variants we created ourselves from verified adapted public records.

## Data
- `variants.json` defines 9 base cases (verified adapted public records) and 28 variants. Each variant has documented edits and its planted issues.
- `scripts/build-variants.ts` writes the runtime inputs to `eval/cases/` and the answers to `eval/expected/`. The reviewer only ever receives `eval/cases/` files, and a unit test checks that they contain no answers.
- **Split by base case.** Dev: C001, C003, C012, C013. Held-out: C021, C037, C045, C119, C135. Variants of one base never cross splits. C012 and C013 come from the same incident, so they share a split. Prompt and rule changes are tuned on dev only.

## Planted issue types
| Type | How it is planted | Counts as detected when |
|---|---|---|
| Missing element | Form field blanked and the narrative statement removed | The element is reported absent or unclear |
| Inconsistency | One narrative statement or form field changed to conflict with another source | An inconsistency or unclear finding cites the changed sentence (anchor text) or the listed field |
| Citation | Selected charge replaced with one whose key facts conflict with the record | Citation status is `likely_mismatch` or `needs_human_review` |
| Human review | Second charge added, or a conflicting statement added | Human review required = true |

## Scoring policy v2.4 (2026-10-30, `scripts/score-match.ts`, `scripts/finding-key.ts`), from an independent review
**Matching an inconsistency plant.** The fact is now checked per clause and per event.
- Some clause must state the conflict about the planted fact: for an entry-year plant, a date conflict about the entry.
- A clause saying that fact agrees disqualifies the finding ("entry location differs; dates agree").
- A conflict about another event's date (birth, arrest, encounter) does not count.

**Matching an ambiguity plant.** It needs a finding marked for human review that:
- cites the anchor;
- is about conflicting or unattributable accounts of the entry.

An element-check finding citing the same sentence (for example "identifying documents") does not count.

**Claim-aware adjudication, claim v2.** The claim records, clause by clause, which source states it (form or narrative), what it is about, and whether that clause negates it. So "the form reports no prior removal; the narrative documents a removal" and its reverse are different claims.
- A free-text model claim whose source or topic cannot be identified is UNCERTAIN. It is never inherited, and a person adjudicates it for that case and explanation only.
- Original records (`eval/adjudications.json`) and the v1 migration are unchanged. The v2 migration is `eval/migrations/2026-10-30-adjudication-claims-v2.json`: 86 of 104 original records have a certain v2 claim, and 5 of 6 v1 manual decisions carry forward.
- `scripts/adjudicate.ts` no longer replaces an existing original record.

**Rescoring.** Historical runs keep their v2.3 files. v2.4 rescoring is written beside them (`summary-v2.4.json`, `REPORT-v2.4.md`).
- Over all 43 runs with raw outputs, 7 of 455 plant outcomes change, all from detected to missed. All 7 are in the `e4dd17b` runs (`06-19-54`, `06-23-27`). There, an unattributed account had been issued as an "Account that may conflict … attribution unknown" finding, which states no contradiction about the planted fact (`scripts/diag-policy-diff.ts`).

## Scoring policy v2.3 (2026-10-30, `scripts/score-match.ts`), from an independent audit
Changes from v2.2. Everything not listed here is unchanged.
- **Completion covers every required check** (`lib/completion.ts`). A review is partial when the model review, the fact extraction, any element output or the citation check did not complete. Checks that cannot run by design (redacted fields, unknown case context, a charge with no team reference) are named but do not make a review partial. Reviews recorded before this field existed are judged from `modelStatus` and the per-call log.
- **A finding must identify the planted discrepancy.** Sharing a field or sentence is not enough. An inconsistency (or unclear) finding counts only if it:
  - is about the right fact (date, manner, place or history);
  - uses conflict language;
  - is not about presentation (font, legibility, format);
  - either cites the planted sentence or names the planted value (for example the changed year).
  Negative-control tests are in `tests/score.test.ts` (including a fabricated "entry date font is unreadable" finding that cites `entry.date`).

**Historical runs are not re-labelled.** Their original v2.2 `summary.json` / `REPORT.md` are kept. The v2.3 rescoring is written beside them as `summary-v2.3.json` / `REPORT-v2.3.md` and reported separately in `RUNS.md`.

## Scoring policy v2 (2026-10-29, `scripts/score-eval.ts`)
Policy v1 was used for the early tuning notes in the dev log. Every run in `RUNS.md` has been re-scored with v2 so the numbers can be compared.

**Completion.** A review is *completed* when the model check finished. Completion rate is reported separately.
On a failed or partial review, a planted issue counts as detected only if a finding produced by a deterministic **rule** (`source: "rule"`, e.g. multi-charge routing or the form-field charge requirement check) addresses it. Everything else counts as missed ("not_completed"). (v2.1, 2026-10-29: v2 credited only multi-charge routing; changed after the post-hoc run showed the rule-based charge check catching a mismatch while the model timed out. All runs re-scored.)

**Strict detection, per planted issue:**
| Planted issue | Detected only when |
|---|---|
| Missing element | The element is reported absent, or a finding cites that element. "Unclear" counts as *routed only* |
| Inconsistency | An inconsistency or unclear finding cites the planted sentence (anchor text) or the changed field |
| Citation error | Citation status is `likely_mismatch` **with verified evidence**. `needs_human_review` counts as *routed only* |
| Multi-charge routing | The multi-charge rule fired (`R-MULTI-CHARGE`) |
| Ambiguity routing | Human review is required **and** a finding marked for human review cites the planted statement. Generic routing counts as *routed only* |

Recall counts only "detected". The outcome counts (detected, routed only, missed, not completed) are reported with every run.

**Flags.** Every finding that matches no planted issue is either:
- **adjudicated by hand** against the case text and the source PDF page (`eval/adjudications.json`, recorded with `scripts/adjudicate.ts`) as a *valid observation* or a *false flag*; or
- left *unadjudicated*, in which case it counts as incorrect.

Nothing is excluded automatically for "already appearing on the base case". Findings that match an already-matched planted issue are **duplicates**. They are listed and left out of the incorrect-flag proportion.

**Incorrect-flag proportion** = (false flags + unadjudicated) / (all issued flags − duplicates), including flags on unmodified base cases.

**Unnecessary routing** = share of cases where nothing calls for review (unmodified bases and missing-element variants) that were still routed to human review.

**Evidence validity**: every sentence reference must reproduce its quote exactly at the stored offsets. Field references must name a real field.

**Latency**: client-measured time for the full HTTP review, including slow and failed requests.

Reviewer dismissals and the model's own confidence are never used as ground truth.

## Run
```bash
npm run dev                                  # terminal 1
npm run eval -- --split all --concurrency 2  # terminal 2 (needs the key)
npx tsx scripts/score-eval.ts eval/runs/<timestamp>
```
`eval/runs/<timestamp>/REPORT.md` and `summary.json` are sanitized summaries and are committed. The `raw/` folders are git-ignored.
