# Evaluation run 2026-10-30T04-48-10 (scoring policy v2.3, dataset eval)

**Label: post-tuning, post-diagnosis (eval, commit 8864d7b).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 97% (36/37) | |
| Detection recall, strict (failures count as missed) | 65% (20/31) | at least 90% |
| Missing elements | 83% (5/6) | |
| Inconsistencies | 40% (4/10) | |
| Citation errors (mismatch with verified evidence) | 86% (6/7) | |
| Routing: multi-charge (rule fired) | 100% (5/5) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 0% (0/3) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 6% (4/63) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 7% (1/15) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003, C003-M3, C012-M2, C013, C037-M3, C135-M3 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (63/63) | every flag |
| Sentence evidence by match type | exact 12 · partial 0 · unlabelled 40 | |
| Latency p50 / p90 / max (full HTTP review) | 18.3s / 39.3s / 52.3s | under 60s |

Plant outcomes: detected: 20, routed_only: 3, missed: 6, not_completed: 2.

**Partial reviews (a required check did not complete): 1.** C037-AMB (ok, 47.4s; facts:invalid_output review-1:ok review-2:ok; plants: human_review:ambiguity=not_completed, inconsistency=not_completed).
Recall over completed reviews only (secondary): 69% (20/29). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 63 = 20 planted + 0 duplicates + 39 adjudicated valid observations + 4 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 16.1s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-CIT | dev | 32.0s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-M3 | dev | 16.9s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-MC | dev | 14.9s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-X1 | dev | 16.0s | yes | inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C003 | dev | 7.6s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-AMB | dev | 13.4s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-CIT | dev | 13.0s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-M3 | dev | 20.1s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C012 | dev | 29.4s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-M2 | dev | 16.6s | yes | missing_element (missed) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-MC | dev | 16.6s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-X1 | dev | 26.6s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; I-2 inconsistency: Encounter time discrepancy [false_flag] |
| C013 | dev | 36.6s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-CIT | dev | 25.3s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-X1 | dev | 33.2s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; C-1 citation: Possible citation mismatch: 8 U.S.C. 1326(a) [valid_observation] |
| C021 | heldout | 27.2s | yes | none | yes (not expected) |  |
| C021-CIT | heldout | 28.5s | yes | citation (detected) | yes |  |
| C021-MC | heldout | 28.6s | yes | human_review:multi_charge (detected) | yes |  |
| C021-X1 | heldout | 26.6s | yes | inconsistency (detected) | yes | I-3 inconsistency: History record conflict [false_flag] |
| C037 | heldout | 25.0s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-AMB | heldout | 47.4s | ok | human_review:ambiguity (not_completed), inconsistency (not_completed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-CIT | heldout | 24.9s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-M3 | heldout | 50.4s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C037-X1 | heldout | 52.3s | yes | inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045 | heldout | 20.7s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-CIT | heldout | 15.4s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-MC | heldout | 12.1s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-X1 | heldout | 18.0s | yes | inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C119 | heldout | 39.3s | yes | none | no |  |
| C119-AMB | heldout | 18.3s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes |  |
| C119-CIT | heldout | 15.6s | yes | citation (routed_only) | yes |  |
| C119-X1 | heldout | 11.4s | yes | inconsistency (detected) | yes |  |
| C135 | heldout | 16.2s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M2 | heldout | 12.7s | yes | missing_element (detected) | no | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M3 | heldout | 12.6s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-MC | heldout | 11.7s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
