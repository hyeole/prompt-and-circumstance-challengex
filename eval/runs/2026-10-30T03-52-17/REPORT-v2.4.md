# Evaluation run 2026-10-30T03-52-17 (scoring policy v2.4, dataset eval/fresh)

**Label: post-tuning, post-audit (eval/fresh, commit 324c393).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 89% (25/28) | |
| Detection recall, strict (failures count as missed) | 47% (8/17) | at least 90% |
| Missing elements | 83% (5/6) | |
| Inconsistencies | 0% (0/6) | |
| Citation errors (mismatch with verified evidence) | 67% (2/3) | |
| Routing: multi-charge (rule fired) | 100% (1/1) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 0% (0/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 21% (4/19) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 61% (11/18) | |
| Routed because of an adjudicated real discrepancy in the source | F010, F010-D, FS06, FS07 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 97% (36/37) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (19/19) | every flag |
| Sentence evidence by match type | exact 7 · partial 0 · unlabelled 2 | |
| Latency p50 / p90 / max (full HTTP review) | 28.9s / 48.2s / 55.0s | under 60s |

Plant outcomes: detected: 8, routed_only: 2, missed: 5, not_completed: 2.

**Partial reviews (a required check did not complete): 3.** F039-G (ok, 32s; facts:invalid_output review-1:ok review-2:ok; plants: missing_element=not_completed); F039-X (ok, 25.8s; facts:invalid_output review-1:ok review-2:cancelled; plants: inconsistency=not_completed); F075 (ok, 55s; facts:failed review-1:ok review-2:ok; plants: none).
Recall over completed reviews only (secondary): 53% (8/15). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 19 = 9 planted + 0 duplicates + 6 adjudicated valid observations + 4 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| F010 | fresh | 15.7s | yes | none | yes (not expected) | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-D | fresh | 24.9s | yes | missing_element (detected) | yes (not expected) | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-X | fresh | 29.5s | yes | inconsistency (missed) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F036 | fresh | 47.9s | yes | none | yes (not expected) |  |
| F036-C | fresh | 48.2s | yes | citation (detected) | yes |  |
| F036-M | fresh | 44.6s | yes | human_review:multi_charge (detected) | yes |  |
| F039 | fresh | 19.7s | yes | none | yes (not expected) |  |
| F039-G | fresh | 32.0s | ok | missing_element (not_completed) | yes (not expected) |  |
| F039-X | fresh | 25.8s | ok | inconsistency (not_completed) | yes |  |
| F051 | fresh | 35.1s | yes | none | yes (not expected) | F-HISTORY inconsistency: Immigration record conflicts with the narrative [false_flag] |
| F051-C | fresh | 28.9s | yes | citation (routed_only) | yes | F-HISTORY inconsistency: Immigration record conflicts with the narrative [false_flag] |
| F051-E | fresh | 35.8s | yes | missing_element (detected) | yes (not expected) | F-HISTORY inconsistency: Immigration record conflicts with the narrative [false_flag]; C-1 citation: Possible citation mismatch: INA 212(a)(6)(A)(i) [false_flag] |
| F055 | fresh | 39.7s | yes | none | yes (not expected) |  |
| F055-A | fresh | 53.2s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes |  |
| F055-H | fresh | 36.9s | yes | inconsistency (missed) | yes |  |
| F075 | fresh | 55.0s | ok | none | yes (not expected) |  |
| F075-H | fresh | 46.7s | yes | inconsistency (missed) | yes |  |
| F075-X | fresh | 37.8s | yes | inconsistency (missed) | yes |  |
| FS01 | fresh | 28.0s | yes | none | no |  |
| FS02 | fresh | 28.5s | yes | none | yes (not expected) |  |
| FS03 | fresh | 26.8s | yes | missing_element (detected) | no |  |
| FS04 | fresh | 21.6s | yes | none | no |  |
| FS05 | fresh | 14.0s | yes | citation (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| FS06 | fresh | 13.0s | yes | none | yes (not expected) | M-N2 missing_element: Missing: status or classification claimed for admission [valid_observation] |
| FS07 | fresh | 13.1s | yes | missing_element (detected) | yes (not expected) | U-N3 unclear: Unclear: application for admission: port, documents presented, purpose of travel [valid_observation] |
| FS08 | fresh | 24.3s | yes | none | yes (not expected) |  |
| FS09 | fresh | 13.8s | yes | missing_element (detected) | yes (not expected) |  |
| FS10 | fresh | 17.2s | yes | none | yes (not expected) |  |
