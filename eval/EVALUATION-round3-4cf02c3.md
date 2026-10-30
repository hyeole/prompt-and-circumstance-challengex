# Round 3 measured evaluation: `rc-round3` (`4cf02c3`) vs baseline `7efb231` and candidate `1b5f59b`

**Decision: not promoted.** The baseline `7efb231` (delivery `49a12be`) remains the accepted deliverable.
- Strict detection is **76% (41/54)**: the same as `1b5f59b`, one fewer than the baseline.
- The preferred stopping point (85–87%) is **not reached**, and the sponsor's **90% target is not met**.
- Incorrect flags stay within 10% (claim layer 3/101).
- Completion fell to **67/77**. Every failure was a model call that timed out, clustered in time; see "Completion" below.

## Frozen build and configuration
Recorded before the run in `eval/RUN-CONFIG-round3.md`.

| Item | Value |
|---|---|
| Evaluated commit | `4cf02c3` (tag `rc-round3`); server code identical to `3655aa9`; `uncommittedServerChanges: none` in all four `run-info.json` |
| Production build | `next build` at `4cf02c3`, BUILD_ID `bR0Yw-Tb3C-sVXJ3E6kHn`. Server started once, before the first run, and stopped after the last |
| Model | `gpt-oss-20b`; reasoning low; 2 samples (12 s grace); client timeout 55 s, 1 retry; `facts-v2.0`, 55 s budget; review prompt `review-v1.4` (all unchanged since `1b5f59b`) |
| References | `team-provisional-2026-10-31.1` (unchanged) |
| Scoring | v2.4, both layers (scripts unchanged) |
| Runs, each case once, concurrency 1 | dev `2026-10-30T21-34-06`, fresh `21-36-27`, legacy `21-48-37`, gen-v1 `22-09-01` (UTC 21:34–22:15) |
| Before the run | 263 offline tests and type-check passed. The e2e workflow was **not** run, to keep live calls to the 89 cases |
| Status | Post-tuning. Not held-out. No case was restarted or rerun |

## Results (77 existing cases, same policy for all three builds)
| Measure | Baseline `7efb231` | Candidate `1b5f59b` | **Round 3 `4cf02c3`** |
|---|---|---|---|
| Strict detection | 42/54 (78%) | 41/54 (76%) | **41/54 (76%)** |
| Missing element | 16/16 | 15/16 | 14/16 |
| Inconsistency | 8/17 | 8/17 | 9/17 |
| Citation | 9/11 | 9/11 | 9/11 |
| Multi-charge routing | 6/6 | 6/6 | 6/6 |
| Planted ambiguity | 3/4 | 3/4 | 3/4 |
| Incorrect flags, claim layer (raw false / duplicates / unadjudicated) | 2/100 (2/0/0) | 2/104 (2/0/0) | **3/101 (3/0/0)** |
| Incorrect flags, original-record layer | 4/100 | 4/104 | 4/101 |
| Identity-document observations (all valid) | 29 | 29 | 26 |
| Incorrect flags excluding identity documents (claim layer) | 2/71 | 2/75 | 3/75 |
| Completion | 75/77 | 73/77 | **67/77** |
| Fact-call timeouts / review calls failed / review samples cancelled | 2 / 0 / 4 | 4 / 1 / 5 | **9 / 9 / 26** |
| Unnecessary routing | 3/43 | 5/43 | 5/43 (3 of the 5 are partial reviews) |
| Should-not-flag violations | 0 | 0 | 0 |
| Evidence-reference validity | 100% | 100% | 100% (101/101) |
| Latency p50 / p90 / max (pooled, full HTTP) | 18.5 / 33.2 / 55.0 s | 21.9 / 40.7 / 55.0 s | 23.7 / 55.0 / 55.1 s |
| **62 cases complete in all three builds**: plants detected | 31/42 | 32/42 | 32/42 |

The last row is a secondary, paired view on the same cases, not a headline figure.

## Every changed detection and its cause
| Case | Baseline → `1b5f59b` → round 3 | Cause | Due to round-3 code? |
|---|---|---|---|
| F075-H | missed → detected → **detected** | Round-2 exact-entry link (kept) | No (round 2) |
| C037-X1 | detected → not completed → **detected** | The fact call completed this time (`F-ENTRY-DATE`) | No (run-to-run variation in the model call; inferred, not confirmed) |
| C003-M3 | detected → not completed → **not completed** | All three calls (facts and both review samples) timed out at 55 s. The P1 fix for its round-2 regression could not be exercised live; it is verified offline only | No |
| F010-D | detected → detected → **not completed** | Fact-call timeout; the missing-element plant is credited only from a complete review | No (timeout) |

- **No detection was gained or lost through the round-3 code.** In all four runs, the deterministic findings (`F-…`, `R-…`) differ from `1b5f59b` only by:
  - the expected provenance labels;
  - C037-X1 completing;
  - G06 (below).
- **Expected.** The round-3, multi-person and variant changes are attribution and false-positive safeguards. Offline, they changed no outcome on the 89 saved cases, so they could not add detections here.

## Incorrect flags (claim layer, all adjudicated against the source)
All three are free-text model issues, not deterministic findings:
- **F039-G I-4** (false): 7:50 AM is when a van passed the agents, not the encounter. The original-record layer already had the same verdict.
- **C003-CIT I-1** (false; partial review): 10:30 is the arrest, after hotel contact and a consent search; the narrative states no encounter time.
- **C021-X1 I-2** (false): a lawful B2 admission does not contradict NEGATIVE. This follows the existing C021 standard.

**New adjudication records this round.** Eight records were added, and none was changed:
- **Claim layer, 6 records:** the three above; C013-X1 M-N1 and C135-M2 M-N1, both valid because only status documents are named (F051 standard); and G08 I-1, valid (a real location discrepancy introduced when the case was written).
- **Original-record layer, 2 records:** C013 and C135 `missing_element|N1`, both valid.

## Partial-review credit from corrected provenance (reported separately)
`scripts/diag-provenance-credit.ts`: **0** in all four runs (12 partial reviews). No credit in this run comes from the provenance correction.

## Completion: what the diagnostics show (cause not confirmed)
- **Every incomplete review is a model call that timed out at 55 s.** There were no schema-invalid failures; DS07 had one invalid sample, and the review used its other sample.
- **The input to those calls was unchanged.** The review prompt and its input are the same as in `1b5f59b`: the changed code runs only on the model's output. Yet:
  - review calls failed outright 9 times, against 0–1 before;
  - in C003-M3, C013 and C013-CIT, both review samples timed out together;
  - the same cases completed in `1b5f59b` (for example, C013 review 17/9 s, facts 26 s).
- **Failures cluster in time.**
  - The dev-synthetic run (21:34–21:36) had no failures.
  - Every outright review failure happened between 21:42 and 21:58.
  - Fact timeouts ran from 21:37 to 22:01, then two more in gen-v1 at 22:09 and 22:14.
  - Cancelled second samples were elevated from 21:39 to the end: 26 against 4–5 before.
- **Throughput:** the median completion-token rate of successful calls was normal (45 tokens/s), but the 10th percentile fell to 25 tokens/s, against 32 at the baseline.

This pattern is consistent with slower endpoint responses during the run. It is **not confirmed**: the endpoint reports no load data, and failed calls report no tokens. The code paths these changes touched cannot alter what the model is sent.

## Generalization set `gen-v1` (12 cases; team-authored; locked before round 2; NOT independently held out)
| | `1b5f59b` | Round 3 |
|---|---|---|
| Strict detection | 5/7 | **6/7** (5/7 without G06, see below) |
| Incorrect flags | 0/7 | 0/8 |
| Completion | 11/12 | 10/12 (G01 and G10: fact timeouts) |
| Unnecessary routing | 1/6 | 2/6 (G01 partial; G09) |

- **G06, credited under v2.4 but questionable.**
  - **What happened:** `F-ENTRY-DATE` treats S8 ("[REDACTED] … entered the United States in 2011 by crossing the river near Hidalgo") as the subject's. It matches the form's entry place (Hidalgo) and manner (EWI), and no other account shares them; the two-fact link rule predates round 2.
  - **Conflict with the label:** the label's note expects routing with no contradiction asserted.
  - **Not caused by the round-3 code:** offline, `1b5f59b` and `4cf02c3` produce identical results for identical extractions, and the finding appears whenever the extractor supplies S8's manner. The difference between the runs is therefore **inferred** to be extraction variance. This is **not confirmed**: raw results do not store the extracted facts.
  - **Follow-up (uncommitted, offline):** place and manner alone no longer establish identity. G06 is now routed; see `G06-G09-FIXES.md`.
  - **Treatment:** the credit is reported as questionable, and the label is unchanged.
- **G09:** complete this time, but the plant is still missed.
  - **Correction (after commit `e102fdc`):** an earlier version of this report said the model judged the manner present; that was wrong.
  - **Actual cause:** the form records `entry.manner` as "UNK", and the deterministic field-coverage rule treats a field recorded as unknown as documented. When the narrative does not state the manner, that field result stands as `present`/`recorded_unknown`. The model's own E3 output is not used in that case. The result is the same in `1b5f59b`.
  - **Routing:** the deterministic charge-support check noticed that no statement of the manner exists, and routed the case.
  - **Follow-up (uncommitted, offline):** a manner of entry recorded only as unknown, with a checked narrative that does not state it, is now `unclear`. See `G06-G09-FIXES.md` and `ROUND3-EVIDENCE-G06-G09.md`.

## Assessment against the stopping criteria
| Criterion | Result |
|---|---|
| Reliable 85–87% detection | **Not reached**: 76% (41/54). On the 62 cases complete in all builds, 32/42 |
| Sponsor target ≥90% | **Not met** |
| Incorrect flags ≤10% | **Met**: 3/101 (claim layer), 4/101 (original-record layer) |
| No unresolved regressions introduced by these changes | No outcome regression is attributable to the round-3 code. The **completion regression (67/77) is unresolved**: slower endpoint responses are an inference from timing, and the cause is unconfirmed. G06's credit is questionable |

## Recommendation
1. **Keep `7efb231` / `49a12be` as the deliverable.** `rc-round3` is not promoted, because its completion in this run is far below the baseline and the cause is not confirmed.
2. **Do not run more full batches to chase detection.**
   - **Where the remaining misses are:** 8 of the 13 are genuine attribution limits or questionable labels (F010-X, F039-X, F075-X, C001-X1, C045-X1, both C119-AMB plants, C119-CIT).
   - **Estimated ceiling for the current approach** (current attribution rules, labels and v2.4 scoring; routing not counted): 43/54 (80%), even if both timed-out plants (C003-M3, F010-D) were detected. This is an estimate, not a proven limit of the system.
   - **What 46/54 (85%) would need:** crediting C013-X1 and F055-H (a scoring change: their valid findings do not cite the planted anchors) and F051-C (counting routing). Neither will be done.
   - 90% is not reachable with the current approach.
3. **The round-3 code is safer, not more sensitive.** It removes the false-positive and attribution defects found by the independent review, with no detection change offline or live. Promoting it should depend on reliability alone. That would need a completion-matched run of the same frozen build at another time, which is not authorized and is not started.
4. **Reliability is the main remaining limit:**
   - fact-call timeouts (2–9 per 77; the variation is inferred to come from the endpoint, not confirmed);
   - the 55 s budget;
   - the `describesUsEntry` wording gap, documented in `RUN-CONFIG-round3.md`.
