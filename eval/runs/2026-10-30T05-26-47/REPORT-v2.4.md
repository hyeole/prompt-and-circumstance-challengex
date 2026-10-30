# Evaluation run 2026-10-30T05-26-47 (scoring policy v2.4, dataset eval)

**Label: post-tuning, refinements (eval, build d0ec8c3).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 81% (30/37) | |
| Detection recall, strict (failures count as missed) | 68% (21/31) | at least 90% |
| Missing elements | 83% (5/6) | |
| Inconsistencies | 40% (4/10) | |
| Citation errors (mismatch with verified evidence) | 86% (6/7) | |
| Routing: multi-charge (rule fired) | 100% (5/5) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 33% (1/3) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 6% (4/63) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 7% (1/15) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003, C003-M3, C012-M2, C013, C037, C037-M3, C135-M3 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (63/63) | every flag |
| Sentence evidence by match type | exact 17 · partial 0 · unlabelled 39 | |
| Latency p50 / p90 / max (full HTTP review) | 28.6s / 55.0s / 55.0s | under 60s |

Plant outcomes: detected: 21, routed_only: 2, missed: 5, not_completed: 3.

**Partial reviews (a required check did not complete): 7.** C001 (ok, 55s; facts:failed review-1:ok review-2:ok; plants: none); C003-CIT (ok, 55s; facts:failed review-1:ok review-2:ok; plants: citation=detected); C013-CIT (ok, 55s; facts:failed review-1:ok review-2:ok; plants: citation=detected); C037 (ok, 55s; facts:failed review-1:ok review-2:ok; plants: none); C037-CIT (ok, 55s; facts:failed review-1:ok review-2:ok; plants: citation=detected); C045-X1 (ok, 55s; facts:failed review-1:ok review-2:ok; plants: inconsistency=not_completed); C119-AMB (ok, 55s; facts:failed review-1:ok review-2:ok; plants: human_review:ambiguity=not_completed, inconsistency=not_completed).
Recall over completed reviews only (secondary): 72% (18/25). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 63 = 21 planted + 0 duplicates + 38 adjudicated valid observations + 4 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 55.0s | ok | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-CIT | dev | 26.5s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-M3 | dev | 17.2s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-MC | dev | 42.2s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-X1 | dev | 15.8s | yes | inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C003 | dev | 12.0s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-AMB | dev | 21.4s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-CIT | dev | 55.0s | ok | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; I-1 inconsistency: Encounter time mismatch [valid_observation] |
| C003-M3 | dev | 38.6s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C012 | dev | 30.5s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-M2 | dev | 39.4s | yes | missing_element (missed) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-MC | dev | 12.1s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-X1 | dev | 28.6s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013 | dev | 47.9s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-CIT | dev | 55.0s | ok | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-X1 | dev | 28.5s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; C-1 citation: Possible citation mismatch: 8 U.S.C. 1326(a) [false_flag] |
| C021 | heldout | 29.1s | yes | none | yes (not expected) |  |
| C021-CIT | heldout | 45.2s | yes | citation (detected) | yes |  |
| C021-MC | heldout | 43.3s | yes | human_review:multi_charge (detected) | yes |  |
| C021-X1 | heldout | 36.5s | yes | inconsistency (detected) | yes | I-3 inconsistency: History record conflict [false_flag] |
| C037 | heldout | 55.0s | ok | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-AMB | heldout | 44.9s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C037-CIT | heldout | 55.0s | ok | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-M3 | heldout | 17.7s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C037-X1 | heldout | 32.3s | yes | inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045 | heldout | 25.9s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-CIT | heldout | 18.2s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-MC | heldout | 15.0s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-X1 | heldout | 55.0s | ok | inconsistency (not_completed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C119 | heldout | 23.6s | yes | none | no |  |
| C119-AMB | heldout | 55.0s | ok | human_review:ambiguity (not_completed), inconsistency (not_completed) | yes |  |
| C119-CIT | heldout | 18.4s | yes | citation (routed_only) | yes |  |
| C119-X1 | heldout | 28.6s | yes | inconsistency (detected) | yes |  |
| C135 | heldout | 12.8s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M2 | heldout | 20.7s | yes | missing_element (detected) | no | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M3 | heldout | 17.8s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-MC | heldout | 13.4s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
