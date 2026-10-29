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
