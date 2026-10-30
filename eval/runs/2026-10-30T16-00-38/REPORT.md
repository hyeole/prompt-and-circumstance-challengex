# Evaluation run 2026-10-30T16-00-38 (scoring policy v2.4, dataset eval/fresh)

**Label: final planned evaluation, post-tuning (frozen rc-closeout = 7efb231; source f5d952b; not held-out).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 96% (27/28) | |
| Detection recall, strict (failures count as missed) | 65% (11/17) | at least 90% |
| Missing elements | 100% (6/6) | |
| Inconsistencies | 17% (1/6) | |
| Citation errors (mismatch with verified evidence) | 67% (2/3) | |
| Routing: multi-charge (rule fired) | 100% (1/1) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (1/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 4% (1/27) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 11% (2/18) | |
| Routed because of an adjudicated real discrepancy in the source | F039, F039-G, F051, F051-E, FS06, FS07, FS10 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 97% (36/37) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (27/27) | every flag |
| Sentence evidence by match type | exact 8 · partial 0 · unlabelled 17 | |
| Latency p50 / p90 / max (full HTTP review) | 21.7s / 31.4s / 55.0s | under 60s |

Plant outcomes: detected: 11, routed_only: 1, missed: 4, not_completed: 1.

**Partial reviews (a required check did not complete): 1.** F055-H (ok, 55s; facts:failed review-1:ok review-2:ok; plants: inconsistency=not_completed).
Recall over completed reviews only (secondary): 69% (11/16). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 27 = 10 planted + 0 duplicates + 16 adjudicated valid observations + 1 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| F010 | fresh | 15.9s | yes | none | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-D | fresh | 21.0s | yes | missing_element (detected) | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-X | fresh | 10.7s | yes | inconsistency (missed) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F036 | fresh | 26.4s | yes | none | no |  |
| F036-C | fresh | 28.6s | yes | citation (detected) | yes |  |
| F036-M | fresh | 28.0s | yes | human_review:multi_charge (detected) | yes |  |
| F039 | fresh | 28.5s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| F039-G | fresh | 21.7s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| F039-X | fresh | 23.2s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| F051 | fresh | 18.5s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F051-C | fresh | 14.8s | yes | citation (routed_only) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F051-E | fresh | 13.8s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F055 | fresh | 24.4s | yes | none | no |  |
| F055-A | fresh | 32.0s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| F055-H | fresh | 55.0s | ok | inconsistency (not_completed) | yes | C-1 citation: Possible citation mismatch: INA 212(a)(6)(A)(i) [false_flag] |
| F075 | fresh | 31.4s | yes | none | no |  |
| F075-H | fresh | 27.1s | yes | inconsistency (missed) | yes |  |
| F075-X | fresh | 26.3s | yes | inconsistency (missed) | yes |  |
| FS01 | fresh | 17.7s | yes | none | no |  |
| FS02 | fresh | 22.7s | yes | none | no |  |
| FS03 | fresh | 23.8s | yes | missing_element (detected) | no |  |
| FS04 | fresh | 10.7s | yes | none | no |  |
| FS05 | fresh | 9.5s | yes | citation (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| FS06 | fresh | 11.4s | yes | none | yes (not expected) | M-N2 missing_element: Missing: status or classification claimed for admission [valid_observation] |
| FS07 | fresh | 9.2s | yes | missing_element (detected) | yes (not expected) | U-N3 unclear: Unclear: application for admission: port, documents presented, purpose of travel [valid_observation] |
| FS08 | fresh | 16.5s | yes | none | yes (not expected) |  |
| FS09 | fresh | 16.5s | yes | missing_element (detected) | yes (not expected) |  |
| FS10 | fresh | 9.5s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
