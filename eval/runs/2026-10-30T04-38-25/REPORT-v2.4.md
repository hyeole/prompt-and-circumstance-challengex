# Evaluation run 2026-10-30T04-38-25 (scoring policy v2.4, dataset eval/fresh)

**Label: post-tuning, post-diagnosis (eval/fresh, commit 8864d7b).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 96% (27/28) | |
| Detection recall, strict (failures count as missed) | 71% (12/17) | at least 90% |
| Missing elements | 100% (6/6) | |
| Inconsistencies | 33% (2/6) | |
| Citation errors (mismatch with verified evidence) | 100% (3/3) | |
| Routing: multi-charge (rule fired) | 100% (1/1) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 0% (0/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 4% (1/27) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 22% (4/18) | |
| Routed because of an adjudicated real discrepancy in the source | F039-G, F051, F051-E, FS06, FS07, FS10 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 97% (36/37) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (27/27) | every flag |
| Sentence evidence by match type | exact 6 · partial 0 · unlabelled 16 | |
| Latency p50 / p90 / max (full HTTP review) | 22.7s / 32.1s / 33.6s | under 60s |

Plant outcomes: detected: 12, routed_only: 1, missed: 4, not_completed: 0.

**Partial reviews (a required check did not complete): 1.** F039-G (ok, 33.4s; facts:invalid_output facts-retry:invalid_output review-1:ok review-2:ok; plants: missing_element=detected).
Recall over completed reviews only (secondary): 69% (11/16). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 27 = 12 planted + 0 duplicates + 14 adjudicated valid observations + 1 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| F010 | fresh | 18.2s | yes | none | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-D | fresh | 13.8s | yes | missing_element (detected) | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-X | fresh | 16.4s | yes | inconsistency (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F036 | fresh | 27.3s | yes | none | yes (not expected) |  |
| F036-C | fresh | 27.9s | yes | citation (detected) | yes |  |
| F036-M | fresh | 26.6s | yes | human_review:multi_charge (detected) | yes |  |
| F039 | fresh | 31.5s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F039-G | fresh | 33.4s | ok | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F039-X | fresh | 10.5s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F051 | fresh | 18.2s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F051-C | fresh | 23.0s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F051-E | fresh | 22.5s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F055 | fresh | 32.1s | yes | none | yes (not expected) |  |
| F055-A | fresh | 28.9s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes |  |
| F055-H | fresh | 26.9s | yes | inconsistency (missed) | yes | F-HISTORY-2 unclear: Prior removal on the form is not described in the narrative [valid_observation] |
| F075 | fresh | 33.6s | yes | none | no |  |
| F075-H | fresh | 25.8s | yes | inconsistency (missed) | yes |  |
| F075-X | fresh | 22.8s | yes | inconsistency (detected) | yes |  |
| FS01 | fresh | 19.2s | yes | none | no |  |
| FS02 | fresh | 22.7s | yes | none | no |  |
| FS03 | fresh | 22.8s | yes | missing_element (detected) | no |  |
| FS04 | fresh | 10.4s | yes | none | no |  |
| FS05 | fresh | 7.1s | yes | citation (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| FS06 | fresh | 11.2s | yes | none | yes (not expected) | M-N2 missing_element: Missing: status or classification claimed for admission [valid_observation] |
| FS07 | fresh | 9.4s | yes | missing_element (detected) | yes (not expected) | U-N3 unclear: Unclear: application for admission: port, documents presented, purpose of travel [valid_observation] |
| FS08 | fresh | 19.0s | yes | none | yes (not expected) |  |
| FS09 | fresh | 13.7s | yes | missing_element (detected) | yes (not expected) | F-HISTORY-2 unclear: Prior removal on the form is not described in the narrative [false_flag] |
| FS10 | fresh | 10.0s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
