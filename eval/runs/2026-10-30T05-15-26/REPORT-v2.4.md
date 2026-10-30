# Evaluation run 2026-10-30T05-15-26 (scoring policy v2.4, dataset eval/fresh)

**Label: post-tuning, refinements (eval/fresh, build d0ec8c3).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 96% (27/28) | |
| Detection recall, strict (failures count as missed) | 53% (9/17) | at least 90% |
| Missing elements | 100% (6/6) | |
| Inconsistencies | 0% (0/6) | |
| Citation errors (mismatch with verified evidence) | 67% (2/3) | |
| Routing: multi-charge (rule fired) | 100% (1/1) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 0% (0/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 0% (0/24) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 17% (3/18) | |
| Routed because of an adjudicated real discrepancy in the source | F039, F051, F051-E, FS06, FS07, FS10 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 97% (36/37) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (24/24) | every flag |
| Sentence evidence by match type | exact 3 · partial 0 · unlabelled 18 | |
| Latency p50 / p90 / max (full HTTP review) | 20.0s / 37.0s / 55.0s | under 60s |

Plant outcomes: detected: 9, routed_only: 2, missed: 6, not_completed: 0.

**Partial reviews (a required check did not complete): 1.** F036-C (ok, 55s; facts:failed review-1:cancelled review-2:ok; plants: citation=detected).
Recall over completed reviews only (secondary): 50% (8/16). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 24 = 9 planted + 0 duplicates + 15 adjudicated valid observations + 0 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| F010 | fresh | 18.3s | yes | none | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-D | fresh | 18.9s | yes | missing_element (detected) | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-X | fresh | 19.2s | yes | inconsistency (missed) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F036 | fresh | 35.1s | yes | none | no |  |
| F036-C | fresh | 55.0s | ok | citation (detected) | yes |  |
| F036-M | fresh | 32.5s | yes | human_review:multi_charge (detected) | yes |  |
| F039 | fresh | 28.9s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; I-3 inconsistency: Immigration record inconsistency [valid_observation] |
| F039-G | fresh | 20.4s | yes | missing_element (detected) | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F039-X | fresh | 26.3s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F051 | fresh | 16.3s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F051-C | fresh | 17.7s | yes | citation (routed_only) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F051-E | fresh | 17.4s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F055 | fresh | 36.6s | yes | none | yes (not expected) |  |
| F055-A | fresh | 43.1s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes |  |
| F055-H | fresh | 31.3s | yes | inconsistency (missed) | yes | F-HISTORY-2 unclear: Prior removal on the form is not described in the narrative [valid_observation] |
| F075 | fresh | 32.8s | yes | none | no |  |
| F075-H | fresh | 19.9s | yes | inconsistency (missed) | no |  |
| F075-X | fresh | 37.0s | yes | inconsistency (missed) | yes |  |
| FS01 | fresh | 20.0s | yes | none | no |  |
| FS02 | fresh | 17.5s | yes | none | no |  |
| FS03 | fresh | 19.4s | yes | missing_element (detected) | no |  |
| FS04 | fresh | 15.8s | yes | none | no |  |
| FS05 | fresh | 13.3s | yes | citation (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| FS06 | fresh | 13.1s | yes | none | yes (not expected) | M-N2 missing_element: Missing: status or classification claimed for admission [valid_observation] |
| FS07 | fresh | 12.9s | yes | missing_element (detected) | yes (not expected) | U-N3 unclear: Unclear: application for admission: port, documents presented, purpose of travel [valid_observation] |
| FS08 | fresh | 21.6s | yes | none | yes (not expected) |  |
| FS09 | fresh | 27.7s | yes | missing_element (detected) | yes (not expected) |  |
| FS10 | fresh | 12.3s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
