# Proposed bounded verification of `fa4457f` (PLAN: not executed)

**Status:** approved; to be executed once as written (results are recorded separately). No push, promotion or deployment. The accepted deliverable stays `7efb231`/`49a12be`.

**Purpose:** check live that the post-round-3 fixes behave as the offline evidence projects (G06 routing, G09 manner semantics, attribution controls), and observe completion on cases that timed out in round 3. This is **not** an overall performance measurement: a 12-case subset cannot support a detection rate, a promotion decision or a target claim.

## Frozen build (on approval, before the first call)
| Item | Value |
|---|---|
| Code | `fa4457f` + the recording-only instrumentation below (`improve/round2`): `rc-round3` code + `aa322b6` (G06/G09) + `fa4457f` (follow-up). Server code changed since `rc-round3` only in `lib/review/facts.ts` and `lib/review/review.ts` |
| Freeze | Commit this plan, then tag `rc-verify-1` on that docs-only commit. `next build` once, with BUILD_ID recorded. Server started once and stopped after the last case. `uncommittedServerChanges` must read `none` |
| Model and settings | Unchanged from `RUN-CONFIG-round3.md`: `gpt-oss-20b`, reasoning low, 2 samples (12 s grace), 55 s timeout, 1 retry, `facts-v2.0` with a 55 s budget, `review-v1.4`, references `team-provisional-2026-10-31.1` |
| Runner | `scripts/run-eval.ts --concurrency 1 --only …`, one invocation per dataset (4 invocations), label "bounded verification of fa4457f; not an evaluation" |
| Scoring | v2.4, both layers, unchanged. Results are reported **per case**. Dataset-level percentages are not reported, because cases left out of a subset run would be scored as not completed |
| Model calls | At most 12 reviews: up to 3 calls each (facts plus 2 review samples), plus at most 1 retry per call |

## Instrumentation (added on approval; recording only)
**What it adds:** each review result now carries `factsExtraction`:
- either the extraction exactly as validated and used by the comparison: `{status: "valid", output}`;
- or the reason it failed: `{status: "failed", reason}`. The reason is a timeout message, "not valid JSON", the schema paths, or the empty-extraction guard. Invalid model text is never stored.

**Where:** `lib/review/review.ts` (6 lines) and `lib/types.ts` (an optional field), with `tests/facts-record.test.ts`.

**Logic unchanged:** no check reads the field. 178 fake-model reviews (89 cases × 2 extraction variants) are identical on `fa4457f` and the instrumented code, once the new field and the timing and ID fields are removed.

**Evaluated server code** = `fa4457f` + this instrumentation only. The exact diff is recorded with the results.

## The 12 cases
**Projected** = what the offline evidence (saved outputs, replays, the fixes' tests) predicts. It is not a result.

| # | Case (dataset) | Why | Earlier outcomes (baseline / `1b5f59b` / `rc-round3`) | Projected behaviour on `fa4457f` |
|---|---|---|---|---|
| 1 | G06 (gen-v1) | G06 fix | — / routed / credited (questionable) | **No finding attributes S8 to the subject.** S8 (and S9) appear as unattributed routing items. Under v2.4 the plant is `routed_only`, **not detected** |
| 2 | G09 (gen-v1) | G09 fix | — / not completed / missed | Successful extraction with no verified manner: E3 `unclear`, `U-E3`. v2.4 would credit this; it is reported separately as a consequence of the semantics change. Failed or invalid extraction: E3 stays documented-unknown, no `U-E3`, review partial |
| 3 | G02 (gen-v1) | Control: the other subject's year | — / quiet / quiet | No flag on "entered in 2015" (should-not-flag) |
| 4 | G07 (gen-v1) | Control: a group member's deportation | — / quiet / quiet | No `F-HISTORY`. S10 may be routed, never claimed as the subject's |
| 5 | C119-X1 (legacy) | Control: genuine month/day link | detected ×3 | `F-ENTRY-DATE` on S25 (the month and day lie in its own entry clause) |
| 6 | F075-H (fresh) | Control: exact-entry link | missed / detected / detected | `F-HISTORY-3` detected |
| 7 | DS06 (dev) | Control: companions sharing facts | quiet except `U-N1` ×3 | No entry conflict; at most the identity-document observation |
| 8 | C003-AMB (legacy) | Control: within-account conflict | detected ×3 | `F-ACCOUNT`; both plants detected |
| 9 | C003-M3 (legacy) | Timed out twice; P1 never exercised live | detected / partial / partial | If complete: `M-E3` detected, and the empty-extraction guard is not triggered by "Border Patrol" |
| 10 | F010-D (fresh) | Timed out in round 3 | detected / detected / partial | If complete: `M-N7` detected |
| 11 | C013 (legacy) | Both review calls timed out in round 3 | quiet + `U-N1` / same / partial | If complete: no planted issue; `U-N1` observation at most |
| 12 | F051 (fresh) | Both review calls timed out in round 3 | quiet + `U-N1` / same / partial | If complete: no planted issue; `U-N1` observation at most |

## Stopping criteria (fixed before execution)
1. **Each case runs once, in the order above within each dataset invocation.** There are no reruns, including of timeouts, and no restarts.
2. **Stop early** and record the stop if either of these happens:
   - 2 consecutive cases return HTTP or server errors;
   - 3 consecutive cases have every model call time out.

   The remaining cases are then reported as not run, and nothing resumes without new approval.
3. **Afterwards:** score with v2.4, adjudicate any new non-planted flag against the source, and report:
   - measured per-case outcomes beside the projections above;
   - every mismatch, explained or marked unexplained;
   - completion and call timings.

   Timeout causes are not asserted.

## How results would be read (decided now)
- **Correctness: supported** if all of these hold:
  - no finding attributes G06's S8 to the subject;
  - G09's E3 matches its extraction outcome as projected;
  - no false contradiction in G02, G07 or DS06;
  - C119-X1, F075-H and C003-AMB keep their detections whenever complete;
  - no new false flag after adjudication;
  - evidence validity is 100%.

  Any failure of these is a defect to diagnose offline. It is not grounds for a rerun.
- **Reliability: observational only.** Completion of cases 9–12 is reported as measured; one run cannot confirm or rule out an endpoint cause.
- **What it cannot decide:** whether to promote, or whether any detection target is met. At most, it informs whether a full measured run is worth authorizing.
