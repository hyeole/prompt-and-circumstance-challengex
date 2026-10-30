# Evaluation run 2026-10-30T18-32-38 (scoring policy v2.4, dataset eval/fresh)

**Label: round-2 planned evaluation, post-tuning (frozen rc-round2 = 1b5f59b; not held-out).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (28/28) | |
| Detection recall, strict (failures count as missed) | 71% (12/17) | at least 90% |
| Missing elements | 100% (6/6) | |
| Inconsistencies | 33% (2/6) | |
| Citation errors (mismatch with verified evidence) | 67% (2/3) | |
| Routing: multi-charge (rule fired) | 100% (1/1) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (1/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 0% (0/28) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 17% (3/18) | |
| Routed because of an adjudicated real discrepancy in the source | F039, F039-G, F051, F051-E, FS06, FS07, FS10 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 97% (36/37) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (28/28) | every flag |
| Sentence evidence by match type | exact 8 · partial 0 · unlabelled 19 | |
| Latency p50 / p90 / max (full HTTP review) | 20.7s / 40.7s / 49.0s | under 60s |

Plant outcomes: detected: 12, routed_only: 1, missed: 4, not_completed: 0.

**Partial reviews (a required check did not complete): 0.** none.
Recall over completed reviews only (secondary): 71% (12/17). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 28 = 11 planted + 0 duplicates + 17 adjudicated valid observations + 0 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| F010 | fresh | 33.0s | yes | none | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-D | fresh | 23.7s | yes | missing_element (detected) | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-X | fresh | 12.9s | yes | inconsistency (missed) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F036 | fresh | 27.9s | yes | none | yes (not expected) |  |
| F036-C | fresh | 44.3s | yes | citation (detected) | yes |  |
| F036-M | fresh | 37.5s | yes | human_review:multi_charge (detected) | yes |  |
| F039 | fresh | 15.3s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| F039-G | fresh | 28.1s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| F039-X | fresh | 21.9s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| F051 | fresh | 22.4s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F051-C | fresh | 15.1s | yes | citation (routed_only) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F051-E | fresh | 16.3s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F055 | fresh | 26.9s | yes | none | no |  |
| F055-A | fresh | 40.7s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| F055-H | fresh | 35.3s | yes | inconsistency (missed) | yes | F-HISTORY-2 unclear: Prior removal on the form is not described in the narrative [valid_observation] |
| F075 | fresh | 49.0s | yes | none | no |  |
| F075-H | fresh | 20.7s | yes | inconsistency (detected) | yes |  |
| F075-X | fresh | 23.4s | yes | inconsistency (missed) | yes |  |
| FS01 | fresh | 13.9s | yes | none | no |  |
| FS02 | fresh | 19.9s | yes | none | no |  |
| FS03 | fresh | 19.8s | yes | missing_element (detected) | no |  |
| FS04 | fresh | 11.9s | yes | none | no |  |
| FS05 | fresh | 7.2s | yes | citation (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| FS06 | fresh | 7.5s | yes | none | yes (not expected) | M-N2 missing_element: Missing: status or classification claimed for admission [valid_observation] |
| FS07 | fresh | 8.9s | yes | missing_element (detected) | yes (not expected) | U-N3 unclear: Unclear: application for admission: port, documents presented, purpose of travel [valid_observation] |
| FS08 | fresh | 13.5s | yes | none | yes (not expected) |  |
| FS09 | fresh | 15.2s | yes | missing_element (detected) | yes (not expected) |  |
| FS10 | fresh | 14.2s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
