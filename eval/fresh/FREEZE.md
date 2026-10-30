# Fresh evaluation freeze (fresh-v1)

Frozen on 2026-10-30, before any app run on these cases. Git tag: `fresh-eval-v1-frozen` (the commit that adds this file).

| Item | Frozen value |
|---|---|
| Dataset | `eval/fresh` fresh-v1: 28 cases (6 unused source incidents, 12 variants, 10 independent scenarios), 17 planted issues, 2 should-not-flag anchors |
| Dataset hash (cases + expected, sha256 prefix) | `9dc70ef667b91fb2` |
| Runtime inputs hash (cases only) | `277b51d4329d2075` |
| Label notes recorded before the run | `eval/fresh/LABELS.md` (15 notes) |
| Review prompt | `review-v1.4` |
| Fact-extraction prompt | `facts-v2.0` |
| References / checklist | `team-provisional-2026-10-31` / `v2` |
| Model | `gpt-oss-20b` (Unissant endpoint), reasoning effort `low`, 2 review samples + 1 fact extraction, 12s grace, 55s per-request budget, at most 1 retry |
| Scoring policy | v2.2 (`scripts/score-eval.ts`) |
| Run procedure | production build of the tagged commit, `npm start`, `npx tsx scripts/run-eval.ts --dataset eval/fresh --concurrency 1`, run once |

**Rules for this set:**
- Results are reported as an **internal evaluation** on team-made cases, not a sponsor-issued test or certification.
- Unexpected findings are adjudicated by hand, with reasons and the original outputs preserved.
- If the results lead to code changes, every later run on these cases is labelled **post-tuning**. These cases are never reused for a new untouched claim.
- Label notes are not edited after the run; new doubts are reported separately.
