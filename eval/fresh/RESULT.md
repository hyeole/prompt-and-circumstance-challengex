# fresh-v1: internal evaluation result

**Run:** `eval/runs/2026-10-30T02-48-46`
- Production build of tag `fresh-eval-v1-frozen` (commit `ab6feb6`, no uncommitted server changes).
- Run once, one case at a time.
- Scoring policy v2.2.
- Every unexpected finding was adjudicated by hand against the source (`eval/adjudications.json`), with reasons and the original outputs preserved.

This is an internal evaluation on team-made cases, not a sponsor-issued test or certification.

| Measure | Result | Deck target |
|---|---|---|
| Review completion | 100% (28/28) | |
| Strict detection of planted issues | **71% (12/17)**: missing elements 5/6, inconsistencies 3/6, citation 2/3 (+1 routed only), routing 2/2 | at least 90%: **not met** |
| Incorrect flags among issued flags | **30% (11/37)**: 26 non-planted flags; 15 adjudicated valid observations, 11 false | at most 10%: **not met** |
| Human-review routing: multi-charge / planted ambiguity | 100% (1/1) / 100% (1/1) | 100%: met (small sample) |
| Unnecessary routing | 22% (4/18) | |
| Checklist expectations (incl. not applicable / applicability unclear) | 95% (35/37) | |
| Should-not-flag violations | 2 (FS02 corrected entry year; FS10 unattributable deportation) | 0 |
| Evidence references reproduce the source text | 100% (37/37) | every flag: met |
| Latency p50 / p90 / max | 19.8s / 32.6s / 55.0s | under 60s: met |

## Misses (5)
- **F010-D (missing disposition):** the model counted "placed under arrest" as the disposition.
- **F051-C (reentry charge):** routed to a person, not called a mismatch. This outcome was anticipated in the pre-run label note: another member of the group "had been ordered removed".
- **F055-H (form says prior removal; narrative says none found):** not detected.
- **F075-H (NEGATIVE record vs earlier apprehensions):** not detected. The label note anticipated that only the model could catch this.
- **F075-X (entry year relative to a 2011 voluntary return):** not detected. Anticipated in the label note.

## False flags (11)
| Cause | Count | Cases |
|---|---|---|
| PWA (AFOOT) treated as conflicting with an illegal crossing | 2 | F051-C, F055 |
| Statements by unattributed members of a group used against this subject's record | 3 | F051-C, FS10 ×2 |
| A correction the narrative already explains flagged anyway | 1 | FS02 |
| A van sighting time treated as the encounter time | 1 | F039-X |
| The lack-of-status item (E6) misapplied to port-of-entry fraud | 2 | FS06, FS07 |
| "Visiting a friend" not recognised as a purpose of travel (pattern bug) | 2 | FS08, FS09 |

## Doubts found after the run (labels not changed)
- **FS06, N2:** the pre-run label says the claimed classification is present. On re-reading, the narrative states the documents and purpose but never names the classification requested. The flag was adjudicated as a valid observation; the label stays as written, so the checklist-expectation mismatch is still counted.

## Use of these cases from now on
Any change made because of these results is **post-tuning**. Later runs on fresh-v1 are labelled post-tuning, and these cases cannot support a new untouched claim.
