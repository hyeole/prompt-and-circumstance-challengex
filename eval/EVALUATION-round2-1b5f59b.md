# Round 2 evaluation: candidate `rc-round2` (`1b5f59b`) vs baseline `rc-closeout` (`7efb231`)

**Decision: not promoted.** The baseline (`7efb231`, delivery `49a12be`) remains the accepted deliverable.
- The candidate detected one fewer plant (41/54 vs 42/54) and completed two fewer reviews (73/77 vs 75/77).
- One of its regressions (C003-M3) was caused by a defect in a round-2 change. That defect is patched after the run, but the patch is **not evaluated**.

## Frozen candidate and configuration
| Item | Value |
|---|---|
| Build | `1b5f59b` (tag `rc-round2`), branch `improve/round2`; `uncommittedServerChanges: none` in all four `run-info.json` |
| Model | `gpt-oss-20b`; reasoning effort low; 2 review samples; fact prompt **`facts-v2.0` (unchanged from the baseline)**; fact budget 55 s; client timeout and retries unchanged |
| References | `team-provisional-2026-10-31.1` (unchanged) |
| Scoring | v2.4 with the claim v2 layer (unchanged). Original-record layer reported alongside |
| Runs | dev `2026-10-30T18-29-08`, fresh `18-32-38`, legacy `18-43-05`, gen-v1 `18-58-39`. Each case ran once, concurrency 1 |
| Before the run | 221 offline tests; e2e 23/23 on the frozen build |
| Status | Post-tuning. Not held-out |

## Same policy, both builds (77 existing cases)
| Measure | Baseline `7efb231` | Candidate `1b5f59b` |
|---|---|---|
| Strict detection | **42/54 (78%)** | **41/54 (76%)** |
| Missing element | 16/16 | 15/16 |
| Inconsistency | 8/17 | 8/17 |
| Citation | 9/11 | 9/11 |
| Multi-charge routing | 6/6 | 6/6 |
| Planted ambiguity | 3/4 | 3/4 |
| Incorrect flags, claim layer | 2/100 | 2/104 |
| Incorrect flags, original-record layer | 4/100 | 4/104 |
| Raw false flags / duplicates / unadjudicated (claim layer) | 2 / 0 / 0 | 2 / 0 / 0 |
| Identity-document observations (reported separately; all valid) | 29 | 29 |
| Incorrect flags excluding identity documents (claim layer) | 2/71 | 2/75 |
| Completion | **75/77** | **73/77** |
| Fact-call timeouts / empty-extraction failures | 2 / 0 | 3 / 1 |
| Unnecessary routing | 3/43 | 5/43 |
| Should-not-flag violations | 0 | 0 |
| Evidence-reference validity | 100% | 100% |
| Latency p50 (dev / fresh / legacy) | 13.2 / 21.7 / 21.2 s | 15.0 / 20.7 / 24.9 s |
| Latency max | 55 s | 55 s |

**Targets:**
- ≥90% detection is **not met** by either build.
- ≤10% incorrect flags is met by both.

## Every changed outcome and its cause
| Case | Change | Cause | Attributable to round-2 code? | Disposition |
|---|---|---|---|---|
| F075-H | missed → **detected** | S22 gives the subject's exact recorded entry date and manner, so its voluntary return is a prior encounter against NEGATIVE (`F-HISTORY-3`) | Yes (exact-entry link) | Correct detection |
| C003-AMB | detected (only because extraction failed) → **detected with a successful extraction, review complete** | Extracted non-U.S. labels are now checked against the source | Yes (fix 1) | The baseline's robustness caveat is resolved |
| C013-X1 | routed → still not credited, but a **correct new finding** | `F-HISTORY` on S38 ("Subject … being a reinstate case") vs NEGATIVE; v2.4 does not credit it (no anchor) | Yes (fix 2) | Valid observation; plant still missed |
| F055-H | partial, false citation flag → **complete, no false flag** | The fact call completed this time; the clarity finding is valid but not creditable | Mostly run variance | Improvement in this run |
| C003-M3 | detected → **not completed** | The empty-extraction guard fired on "United States **Border** Patrol" (an agency name), so a review with nothing to compare became partial, and partial reviews credit only rule findings | **Yes: a defect in fix 5** | **Patched (P1) after the run, unevaluated** |
| C037-X1 | detected → not completed | Fact-call timeout (55 s), with the same prompt and settings as the baseline, where it took 37 s | No (run variance) | Unresolved reliability limit |
| C003, DS10 | complete → partial | Fact-call timeouts | No (run variance) | Unresolved reliability limit |
| C037-AMB | new false flag (I-1) | The model compared a 12-hour call time ("12:06 PM … received a call") with the encounter time. The request-time guard read only 24-hour times | Pre-existing gap, exposed by model variation | **Patched (P2) after the run, unevaluated** |
| DS10, F036 | new unnecessary routing | DS10: the partial review (timeout) routes. F036: the model's own conflict reasons, which the reason filter deliberately keeps unless dependence on a withheld claim is shown | No | Unresolved |
| C012-M2 | new routing item; citation consistent | S6 "the second subject was processed as a Reinstate": an unattributable reinstatement against NEGATIVE | Yes (fix 2) | Kept: defensible routing, not counted as improvement |

**Where the changes came from.** Code changes added one correct detection (F075-H) and made one existing detection independent of extraction (C003-AMB). They also caused one detection loss through a guard defect (C003-M3). The rest of the difference is fact-call timeouts and model variation between runs.

## Extraction-dependent behaviour
Offline, with the same narrative (`tests/round2.test.ts`), C003-AMB's within-account finding is kept in all five scenarios: accurate extraction, incomplete, wrong non-U.S. label, invalid output, timeout. A failed extraction still makes the review partial. Live, it was detected with a successful extraction and a complete review.

## Generalization set `gen-v1` (12 cases; team-authored, locked before this run; NOT independently held out)
| Strict detection | Incorrect flags | Completion | Unnecessary routing | Should-not-flag violations |
|---|---|---|---|---|
| 5/7 | 0/7 | 11/12 | 1/6 (G10: voluntary-return clarity note) | 0 |

**Detected:** G03 entry year, G04 visa vs EWI, G05 prior removal vs NEGATIVE, G11 reentry charge without removal, G12 multi-charge.

**Correctly quiet:** G01 and G02 (clean; the other subject's year was not flagged) and G07 (a companion's deportation).

**Not detected:**
- G06: routed with the statement named, which is not detection under the policy;
- G09: partial review, because the model omitted element outputs.

**Valid observations:**
- G08: a real location discrepancy that I introduced by mistake when writing the case (narrative "near Detroit", form "MONROE, MI"). The label is unchanged.
- G10: the voluntary-return clarity note.

## Post-evaluation patch (separate commit; NOT evaluated)
- **P1:** "United States Border Patrol" and "Customs and Border Protection" no longer count as describing an entry, and the entry-wording window is 90 characters.
  - The guard's applicability changes for 5 of 89 cases, all of which have no entry wording.
  - Offline, C003-M3 no longer triggers the guard.
- **P2:** 12-hour times are read as 24-hour times in the call/request-time guard. The C037-AMB I-1 claim is withheld; an encounter time written in 12-hour form is still compared.

Both patch tests fail on `1b5f59b` and pass after the patch. All 223 tests pass. The fact-call timeouts are not addressed by any change. The `facts-v2.1` prompt was measured and not adopted (`ROUND2-DIAGNOSIS.md`).

## Recommendation
1. Keep `7efb231` / `49a12be` as the deliverable.
2. With your approval, run **one** paired evaluation of `rc-round2` plus patches P1 and P2 on the 77 cases (and gen-v1). Promote it only if detection and completion are at least the baseline's and no unexplained regression remains.
3. The remaining limits are fact-call timeouts (2–3 of 77 per run, with unchanged settings) and attribution in redacted multi-person narratives. The 90% target is out of reach without counting routing or changing labels, and neither will be done.
