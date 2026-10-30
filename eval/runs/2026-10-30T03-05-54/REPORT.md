# Evaluation run 2026-10-30T03-05-54 (scoring policy v2.2, dataset eval/fresh)

**Label: post-tuning (eval/fresh, commit e5a47a7).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (28/28) | |
| Detection recall, strict (failures count as missed) | 82% (14/17) | at least 90% |
| Missing elements | 100% (6/6) | |
| Inconsistencies | 67% (4/6) | |
| Citation errors (mismatch with verified evidence) | 67% (2/3) | |
| Routing: multi-charge (rule fired) | 100% (1/1) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (1/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 18% (5/28) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 28% (5/18) | |
| Routed because of an adjudicated real discrepancy in the source | FS06, FS07 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 97% (36/37) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 1 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (28/28) | every flag |
| Sentence evidence by match type | exact 14 · partial 1 · unlabelled 5 | |
| Latency p50 / p90 / max (full HTTP review) | 19.3s / 36.8s / 55.0s | under 60s |

Plant outcomes: detected: 14, routed_only: 1, missed: 2, not_completed: 0.

**Partial reviews (model check did not complete): 0.** none.
Recall over completed reviews only (secondary): 82% (14/17). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 28 = 13 planted + 0 duplicates + 10 adjudicated valid observations + 5 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| F010 | fresh | 19.3s | yes | none | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-D | fresh | 20.4s | yes | missing_element (detected) | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-X | fresh | 16.0s | yes | inconsistency (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F036 | fresh | 29.3s | yes | none | no |  |
| F036-C | fresh | 22.7s | yes | citation (detected) | yes |  |
| F036-M | fresh | 22.1s | yes | human_review:multi_charge (detected) | yes |  |
| F039 | fresh | 18.5s | yes | none | no |  |
| F039-G | fresh | 15.2s | yes | missing_element (detected) | no |  |
| F039-X | fresh | 16.2s | yes | inconsistency (detected) | yes |  |
| F051 | fresh | 17.7s | yes | none | no |  |
| F051-C | fresh | 19.7s | yes | citation (routed_only) | yes | F-HISTORY inconsistency: Immigration record conflicts with the narrative [false_flag] |
| F051-E | fresh | 15.0s | yes | missing_element (detected) | yes (not expected) | F-HISTORY inconsistency: Immigration record conflicts with the narrative [false_flag] |
| F055 | fresh | 32.1s | yes | none | no |  |
| F055-A | fresh | 29.2s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| F055-H | fresh | 36.8s | yes | inconsistency (missed) | yes | I-1 inconsistency: Entry date and place mismatch [valid_observation] |
| F075 | fresh | 21.8s | yes | none | no | U-N5 unclear: Unclear: specific ground stated and explained [valid_observation] |
| F075-H | fresh | 55.0s | yes | inconsistency (missed) | no | U-N5 unclear: Unclear: specific ground stated and explained [valid_observation] |
| F075-X | fresh | 55.0s | yes | inconsistency (detected) | yes | U-N5 unclear: Unclear: specific ground stated and explained [valid_observation]; C-1 citation: Possible citation mismatch: INA 212(a)(6)(A)(i) [false_flag] |
| FS01 | fresh | 16.2s | yes | none | no |  |
| FS02 | fresh | 26.8s | yes | none | yes (not expected) | F-ENTRY-DATE-2 inconsistency: Narrative gives two different entry years [false_flag] |
| FS03 | fresh | 22.4s | yes | missing_element (detected) | no |  |
| FS04 | fresh | 17.4s | yes | none | no |  |
| FS05 | fresh | 10.1s | yes | citation (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| FS06 | fresh | 16.4s | yes | none | yes (not expected) | M-N2 missing_element: Missing: status or classification claimed for admission [valid_observation] |
| FS07 | fresh | 9.1s | yes | missing_element (detected) | yes (not expected) | U-N3 unclear: Unclear: application for admission: port, documents presented, purpose of travel [valid_observation] |
| FS08 | fresh | 14.7s | yes | none | yes (not expected) |  |
| FS09 | fresh | 9.2s | yes | missing_element (detected) | yes (not expected) |  |
| FS10 | fresh | 9.2s | yes | none | yes (not expected) | F-ENTRY-DATE-2 inconsistency: Narrative gives two different entry years [false_flag] |
