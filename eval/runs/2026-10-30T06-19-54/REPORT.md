# Evaluation run 2026-10-30T06-19-54 (scoring policy v2.3, dataset eval/fresh)

**Label: targeted check, not an evaluation (fresh, build 78f2425).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 90% (9/10) | |
| Detection recall, strict (failures count as missed) | 63% (5/8) | at least 90% |
| Missing elements | n/a | |
| Inconsistencies | 67% (4/6) | |
| Citation errors (mismatch with verified evidence) | 0% (0/1) | |
| Routing: multi-charge (rule fired) | n/a | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (1/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 33% (5/15) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 0% (0/3) | |
| Routed because of an adjudicated real discrepancy in the source | F039, FS10 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 100% (6/6) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 1 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (17/17) | every flag |
| Sentence evidence by match type | exact 11 · partial 0 · unlabelled 8 | |
| Latency p50 / p90 / max (full HTTP review) | 19.0s / 55.0s / 55.0s | under 60s |

Plant outcomes: detected: 5, routed_only: 1, missed: 1, not_completed: 1.

**Partial reviews (a required check did not complete): 1.** F075-X (ok, 55s; facts:failed review-1:ok review-2:ok; plants: inconsistency=not_completed).
Recall over completed reviews only (secondary): 71% (5/7). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 17 = 4 planted + 2 duplicates + 6 adjudicated valid observations + 0 adjudicated false flags + 5 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| F010-X | fresh | 10.2s | yes | inconsistency (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F039 | fresh | 14.9s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [unadjudicated]; U-ACCOUNT-1 unclear: Account that may conflict with this record (attribution unknown) [unadjudicated] |
| F039-X | fresh | 21.1s | yes | inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [unadjudicated] |
| F051-C | fresh | 19.0s | yes | citation (routed_only) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; U-ACCOUNT-1 unclear: Account that may conflict with this record (attribution unknown) [unadjudicated] |
| F055-A | fresh | 18.9s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| F055-H | fresh | 24.4s | yes | inconsistency (missed) | yes | F-HISTORY-2 unclear: Prior removal on the form is not described in the narrative [valid_observation] |
| F075-H | fresh | 21.8s | yes | inconsistency (detected) | yes | U-ACCOUNT-2 unclear: Account that may conflict with this record (attribution unknown) [duplicate]; U-ACCOUNT-3 unclear: Account that may conflict with this record (attribution unknown) [duplicate] |
| F075-X | fresh | 55.0s | ok | inconsistency (not_completed) | yes |  |
| FS02 | fresh | 17.6s | yes | none | no |  |
| FS10 | fresh | 9.2s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; U-ACCOUNT-1 unclear: Account that may conflict with this record (attribution unknown) [unadjudicated] |
