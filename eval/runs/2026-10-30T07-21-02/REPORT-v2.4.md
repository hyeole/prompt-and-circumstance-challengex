# Evaluation run 2026-10-30T07-21-02 (scoring policy v2.4, dataset eval/fresh)

**Label: planned evaluation, final build, post-tuning (eval/fresh, build 4b10d72).** Internal synthetic evaluation on team-created test variants of adapted public records.
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
| Incorrect flags (false + unadjudicated, excl. duplicates) | 0% (0/26) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 22% (4/18) | |
| Routed because of an adjudicated real discrepancy in the source | F039, F039-G, F051, F051-E, FS06, FS07, FS10 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 97% (36/37) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (26/26) | every flag |
| Sentence evidence by match type | exact 7 · partial 0 · unlabelled 16 | |
| Latency p50 / p90 / max (full HTTP review) | 21.3s / 39.8s / 55.0s | under 60s |

Plant outcomes: detected: 9, routed_only: 2, missed: 6, not_completed: 0.

**Partial reviews (a required check did not complete): 1.** F036-C (ok, 55s; facts:failed review-1:ok review-2:ok; plants: citation=detected).
Recall over completed reviews only (secondary): 50% (8/16). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 26 = 9 planted + 0 duplicates + 17 adjudicated valid observations + 0 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| F010 | fresh | 16.3s | yes | none | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-D | fresh | 21.1s | yes | missing_element (detected) | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-X | fresh | 16.4s | yes | inconsistency (missed) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F036 | fresh | 29.6s | yes | none | yes (not expected) |  |
| F036-C | fresh | 55.0s | ok | citation (detected) | yes |  |
| F036-M | fresh | 50.8s | yes | human_review:multi_charge (detected) | yes |  |
| F039 | fresh | 19.3s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| F039-G | fresh | 26.7s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| F039-X | fresh | 21.4s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| F051 | fresh | 19.5s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F051-C | fresh | 33.4s | yes | citation (routed_only) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F051-E | fresh | 17.4s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F055 | fresh | 39.8s | yes | none | yes (not expected) |  |
| F055-A | fresh | 39.6s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes |  |
| F055-H | fresh | 34.7s | yes | inconsistency (missed) | yes | F-HISTORY-2 unclear: Prior removal on the form is not described in the narrative [valid_observation] |
| F075 | fresh | 19.5s | yes | none | no |  |
| F075-H | fresh | 22.4s | yes | inconsistency (missed) | yes |  |
| F075-X | fresh | 25.9s | yes | inconsistency (missed) | yes |  |
| FS01 | fresh | 19.3s | yes | none | no |  |
| FS02 | fresh | 22.1s | yes | none | no |  |
| FS03 | fresh | 26.2s | yes | missing_element (detected) | no |  |
| FS04 | fresh | 16.1s | yes | none | no |  |
| FS05 | fresh | 10.6s | yes | citation (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| FS06 | fresh | 15.6s | yes | none | yes (not expected) | M-N2 missing_element: Missing: status or classification claimed for admission [valid_observation] |
| FS07 | fresh | 9.8s | yes | missing_element (detected) | yes (not expected) | U-N3 unclear: Unclear: application for admission: port, documents presented, purpose of travel [valid_observation] |
| FS08 | fresh | 21.3s | yes | none | yes (not expected) |  |
| FS09 | fresh | 9.4s | yes | missing_element (detected) | yes (not expected) |  |
| FS10 | fresh | 10.5s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
