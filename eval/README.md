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

## Matching policy
- Each planted issue is counted once. Extra findings matching the same planted issue are duplicates. They count neither as correct nor as incorrect.
- **Incorrect-flag proportion (conservative):** on variant cases, any finding that matches no planted issue and did not already appear on the unmodified base case counts as incorrect, even if it might be a fair observation.
- Findings that already appeared on the base case are "inherited" and reported separately.
- Findings on unmodified bases are reported as **unadjudicated observations**. The public records are not an answer key.
- **Evidence validity:** every sentence reference must reproduce its quote exactly at the stored offsets of the reviewed text. Field references must name a real field.
- **Latency:** client-measured time for the full HTTP review, including slow and failed requests.
- Reviewer dismissals and the model's own confidence are never used as ground truth.

## Run
```bash
npm run dev                                  # terminal 1
npm run eval -- --split all --concurrency 2  # terminal 2 (needs the key)
npx tsx scripts/score-eval.ts eval/runs/<timestamp>
```
`eval/runs/<timestamp>/REPORT.md` and `summary.json` are sanitized summaries and are committed. The `raw/` folders are git-ignored.
