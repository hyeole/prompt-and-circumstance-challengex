# Evaluation run 2026-10-30T03-16-09 (scoring policy v2.2, dataset eval)

**Label: post-tuning (eval, commit e5a47a7).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (37/37) | |
| Detection recall, strict (failures count as missed) | 90% (28/31) | at least 90% |
| Missing elements | 83% (5/6) | |
| Inconsistencies | 90% (9/10) | |
| Citation errors (mismatch with verified evidence) | 86% (6/7) | |
| Routing: multi-charge (rule fired) | 100% (5/5) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (3/3) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 27% (17/62) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 0% (0/15) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003, C003-M3 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (63/63) | every flag |
| Sentence evidence by match type | exact 25 · partial 1 · unlabelled 22 | |
| Latency p50 / p90 / max (full HTTP review) | 19.3s / 35.7s / 55.0s | under 60s |

Plant outcomes: detected: 28, routed_only: 1, missed: 2, not_completed: 0.

**Partial reviews (model check did not complete): 0.** none.
Recall over completed reviews only (secondary): 90% (28/31). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 63 = 25 planted + 1 duplicates + 20 adjudicated valid observations + 17 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 46.8s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-CIT | dev | 18.8s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-M3 | dev | 18.7s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-MC | dev | 17.5s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-X1 | dev | 15.7s | yes | inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C003 | dev | 30.3s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag]; I-1 inconsistency: Encounter time conflict [valid_observation] |
| C003-AMB | dev | 26.9s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag]; C-1 citation: Possible citation mismatch: INA 212(a)(6)(A)(i) [duplicate] |
| C003-CIT | dev | 21.7s | yes | citation (routed_only) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C003-M3 | dev | 12.9s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C012 | dev | 17.7s | yes | none | no |  |
| C012-M2 | dev | 15.2s | yes | missing_element (missed) | no |  |
| C012-MC | dev | 16.3s | yes | human_review:multi_charge (detected) | yes |  |
| C012-X1 | dev | 23.2s | yes | inconsistency (detected) | yes |  |
| C013 | dev | 55.0s | yes | none | no |  |
| C013-CIT | dev | 55.0s | yes | citation (detected) | yes | I-1 inconsistency: Entry manner mismatch [false_flag]; I-3 inconsistency: Entry date mismatch [false_flag] |
| C013-X1 | dev | 27.8s | yes | inconsistency (missed) | yes | I-2 inconsistency: Entry place mismatch [valid_observation] |
| C021 | heldout | 27.5s | yes | none | no |  |
| C021-CIT | heldout | 34.4s | yes | citation (detected) | yes | I-3 inconsistency: Encounter Date Discrepancy [false_flag] |
| C021-MC | heldout | 32.0s | yes | human_review:multi_charge (detected) | yes |  |
| C021-X1 | heldout | 32.1s | yes | inconsistency (detected) | yes | I-2 inconsistency: Immigration record mismatch [false_flag] |
| C037 | heldout | 26.2s | yes | none | no | U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C037-AMB | heldout | 25.0s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes | U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C037-CIT | heldout | 29.0s | yes | citation (detected) | yes | U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C037-M3 | heldout | 25.7s | yes | missing_element (detected) | no | U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C037-X1 | heldout | 35.7s | yes | inconsistency (detected) | yes | U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C045 | heldout | 17.4s | yes | none | no |  |
| C045-CIT | heldout | 13.4s | yes | citation (detected) | yes |  |
| C045-MC | heldout | 9.8s | yes | human_review:multi_charge (detected) | yes |  |
| C045-X1 | heldout | 19.3s | yes | inconsistency (detected) | yes |  |
| C119 | heldout | 16.3s | yes | none | no | U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C119-AMB | heldout | 28.8s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes | U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C119-CIT | heldout | 16.0s | yes | citation (detected) | yes | U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C119-X1 | heldout | 14.6s | yes | inconsistency (detected) | yes | U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C135 | heldout | 15.1s | yes | none | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M2 | heldout | 12.7s | yes | missing_element (detected) | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M3 | heldout | 17.9s | yes | missing_element (detected) | no | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-MC | heldout | 17.8s | yes | human_review:multi_charge (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
