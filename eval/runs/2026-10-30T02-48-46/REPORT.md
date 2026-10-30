# Evaluation run 2026-10-30T02-48-46 (scoring policy v2.2, dataset eval/fresh)

**Label: fresh-v1 internal evaluation (frozen, tag fresh-eval-v1-frozen).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (28/28) | |
| Detection recall, strict (failures count as missed) | 71% (12/17) | at least 90% |
| Missing elements | 83% (5/6) | |
| Inconsistencies | 50% (3/6) | |
| Citation errors (mismatch with verified evidence) | 67% (2/3) | |
| Routing: multi-charge (rule fired) | 100% (1/1) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (1/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 30% (11/37) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 22% (4/18) | |
| Routed because of an adjudicated real discrepancy in the source | F039, F039-G, F055, FS06, FS07 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 95% (35/37) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 2 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (37/37) | every flag |
| Sentence evidence by match type | exact 22 · partial 0 · unlabelled 7 | |
| Latency p50 / p90 / max (full HTTP review) | 19.8s / 32.6s / 55.0s | under 60s |

Plant outcomes: detected: 12, routed_only: 1, missed: 4, not_completed: 0.

**Partial reviews (model check did not complete): 0.** none.
Recall over completed reviews only (secondary): 71% (12/17). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 37 = 11 planted + 0 duplicates + 15 adjudicated valid observations + 10 adjudicated false flags + 1 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| F010 | fresh | 18.5s | yes | none | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-D | fresh | 42.1s | yes | missing_element (missed) | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F010-X | fresh | 19.8s | yes | inconsistency (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| F036 | fresh | 28.1s | yes | none | no |  |
| F036-C | fresh | 28.5s | yes | citation (detected) | yes |  |
| F036-M | fresh | 27.9s | yes | human_review:multi_charge (detected) | yes |  |
| F039 | fresh | 18.0s | yes | none | yes (not expected) | I-1 inconsistency: Entry date and place mismatch [valid_observation] |
| F039-G | fresh | 21.9s | yes | missing_element (detected) | yes (not expected) | I-1 inconsistency: Entry facts mismatch [valid_observation] |
| F039-X | fresh | 32.6s | yes | inconsistency (detected) | yes | I-5 inconsistency: Encounter time mismatch [false_flag] |
| F051 | fresh | 22.6s | yes | none | no |  |
| F051-C | fresh | 27.5s | yes | citation (routed_only) | yes | I-1 inconsistency: Entry facts mismatch [false_flag]; I-2 inconsistency: Entry place and date conflict [valid_observation]; I-3 inconsistency: History immigration record mismatch [false_flag] |
| F051-E | fresh | 17.4s | yes | missing_element (detected) | no |  |
| F055 | fresh | 24.7s | yes | none | yes (not expected) | I-1 inconsistency: Entry place and date mismatch [valid_observation]; I-2 inconsistency: Entry facts mismatch [false_flag] |
| F055-A | fresh | 31.4s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| F055-H | fresh | 32.5s | yes | inconsistency (missed) | yes | I-1 inconsistency: Entry place mismatch [valid_observation]; I-2 inconsistency: Entry date mismatch [valid_observation] |
| F075 | fresh | 18.4s | yes | none | no | U-N5 unclear: Unclear: specific ground stated and explained [valid_observation] |
| F075-H | fresh | 27.5s | yes | inconsistency (missed) | no | U-N5 unclear: Unclear: specific ground stated and explained [valid_observation] |
| F075-X | fresh | 55.0s | yes | inconsistency (missed) | no | U-N5 unclear: Unclear: specific ground stated and explained [valid_observation] |
| FS01 | fresh | 15.9s | yes | none | no |  |
| FS02 | fresh | 19.0s | yes | none | yes (not expected) | F-ENTRY-DATE inconsistency: Entry date differs from the form [false_flag] |
| FS03 | fresh | 16.2s | yes | missing_element (detected) | no |  |
| FS04 | fresh | 7.4s | yes | none | no |  |
| FS05 | fresh | 9.4s | yes | citation (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| FS06 | fresh | 9.6s | yes | none | yes (not expected) | M-E6 missing_element: Missing: basis for the immigration violation [false_flag]; M-N2 missing_element: Missing: status or classification claimed for admission [valid_observation] |
| FS07 | fresh | 10.0s | yes | missing_element (detected) | yes (not expected) | M-E6 missing_element: Missing: basis for the immigration violation [unadjudicated]; U-N3 unclear: Unclear: application for admission: port, documents presented, purpose of travel [valid_observation] |
| FS08 | fresh | 17.0s | yes | none | yes (not expected) | U-N3 unclear: Unclear: application for admission: port, documents presented, purpose of travel [false_flag] |
| FS09 | fresh | 11.3s | yes | missing_element (detected) | yes (not expected) | U-N3 unclear: Unclear: application for admission: port, documents presented, purpose of travel [false_flag] |
| FS10 | fresh | 17.0s | yes | none | yes (not expected) | I-1 inconsistency: History record conflict [false_flag]; F-ENTRY-DATE-2 inconsistency: Narrative gives two different entry years [false_flag] |
