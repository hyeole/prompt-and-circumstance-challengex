# Evaluation run 2026-10-30T21-36-27 (scoring policy v2.4 + claim-aware adjudication layer, dataset eval/fresh)

**Label: round-3 measured evaluation, post-tuning (frozen rc-round3 = 4cf02c3; code = 3655aa9; not held-out).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 93% (26/28) | |
| Detection recall, strict (failures count as missed) | 65% (11/17) | at least 90% |
| Missing elements | 83% (5/6) | |
| Inconsistencies | 33% (2/6) | |
| Citation errors (mismatch with verified evidence) | 67% (2/3) | |
| Routing: multi-charge (rule fired) | 100% (1/1) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (1/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 4% (1/28) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 17% (3/18) | |
| Routed because of an adjudicated real discrepancy in the source | F010-D, F039, F039-G, F051-E, FS06, FS07, FS10 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 97% (36/37) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (28/28) | every flag |
| Sentence evidence by match type | exact 10 · partial 0 · unlabelled 14 | |
| Latency p50 / p90 / max (full HTTP review) | 23.6s / 47.2s / 55.1s | under 60s |

Plant outcomes: detected: 11, routed_only: 1, missed: 4, not_completed: 1.

**Partial reviews (a required check did not complete): 2.** F010-D (ok, 55.1s; facts:failed review-1:ok review-2:ok; plants: missing_element=not_completed); F051 (failed, 55s; facts:ok review-1:failed review-2:failed; plants: none).
Recall over completed reviews only (secondary): 69% (11/16). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 28 = 11 planted + 0 duplicates + 16 adjudicated valid observations + 1 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| F010 | fresh | 17.1s | yes | none | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-D | fresh | 55.1s | ok | missing_element (not_completed) | yes (not expected) | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-X | fresh | 10.0s | yes | inconsistency (missed) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F036 | fresh | 21.8s | yes | none | no |  |
| F036-C | fresh | 33.7s | yes | citation (detected) | yes |  |
| F036-M | fresh | 36.9s | yes | human_review:multi_charge (detected) | yes |  |
| F039 | fresh | 18.6s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| F039-G | fresh | 31.9s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; I-4 inconsistency: Encounter date/time mismatch [false_flag]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| F039-X | fresh | 24.0s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| F051 | fresh | 55.0s | failed | none | yes (not expected) |  |
| F051-C | fresh | 15.0s | yes | citation (routed_only) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F051-E | fresh | 19.5s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| F055 | fresh | 25.5s | yes | none | no |  |
| F055-A | fresh | 41.6s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| F055-H | fresh | 24.0s | yes | inconsistency (missed) | yes | F-HISTORY-2 unclear: Prior removal on the form is not described in the narrative [valid_observation] |
| F075 | fresh | 23.4s | yes | none | no |  |
| F075-H | fresh | 23.6s | yes | inconsistency (detected) | yes |  |
| F075-X | fresh | 29.7s | yes | inconsistency (missed) | yes |  |
| FS01 | fresh | 27.1s | yes | none | no |  |
| FS02 | fresh | 21.0s | yes | none | no |  |
| FS03 | fresh | 47.2s | yes | missing_element (detected) | no |  |
| FS04 | fresh | 19.2s | yes | none | no |  |
| FS05 | fresh | 9.5s | yes | citation (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| FS06 | fresh | 19.0s | yes | none | yes (not expected) | M-N2 missing_element: Missing: status or classification claimed for admission [valid_observation] |
| FS07 | fresh | 21.6s | yes | missing_element (detected) | yes (not expected) | U-N3 unclear: Unclear: application for admission: port, documents presented, purpose of travel [valid_observation] |
| FS08 | fresh | 20.3s | yes | none | yes (not expected) |  |
| FS09 | fresh | 27.5s | yes | missing_element (detected) | yes (not expected) |  |
| FS10 | fresh | 9.7s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
