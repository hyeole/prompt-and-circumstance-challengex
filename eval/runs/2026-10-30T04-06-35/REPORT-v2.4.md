# Evaluation run 2026-10-30T04-06-35 (scoring policy v2.4, dataset eval)

**Label: post-tuning, post-audit (eval, commit 324c393).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 86% (32/37) | |
| Detection recall, strict (failures count as missed) | 68% (21/31) | at least 90% |
| Missing elements | 83% (5/6) | |
| Inconsistencies | 30% (3/10) | |
| Citation errors (mismatch with verified evidence) | 86% (6/7) | |
| Routing: multi-charge (rule fired) | 100% (5/5) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 67% (2/3) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 19% (11/57) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 33% (5/15) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003, C003-M3, C013, C045, C135, C135-M2, C135-M3 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (57/57) | every flag |
| Sentence evidence by match type | exact 13 · partial 0 · unlabelled 33 | |
| Latency p50 / p90 / max (full HTTP review) | 27.9s / 55.0s / 55.1s | under 60s |

Plant outcomes: detected: 21, routed_only: 2, missed: 7, not_completed: 1.

**Partial reviews (a required check did not complete): 5.** C001-CIT (ok, 55.1s; facts:failed review-1:ok review-2:ok; plants: citation=detected); C003-CIT (ok, 55s; facts:failed review-1:ok review-2:cancelled; plants: citation=detected); C013 (ok, 55s; facts:failed review-1:ok review-2:ok; plants: none); C021-CIT (ok, 55.1s; facts:failed review-1:ok review-2:ok; plants: citation=detected); C037-X1 (ok, 55s; facts:failed review-1:ok review-2:ok; plants: inconsistency=not_completed).
Recall over completed reviews only (secondary): 67% (18/27). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 57 = 20 planted + 0 duplicates + 26 adjudicated valid observations + 11 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 29.6s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-CIT | dev | 55.1s | ok | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-M3 | dev | 29.1s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-MC | dev | 27.8s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-X1 | dev | 25.3s | yes | inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C003 | dev | 41.7s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N1 unclear: Unclear: identifying documents [false_flag] |
| C003-AMB | dev | 22.8s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-CIT | dev | 55.0s | ok | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N1 unclear: Unclear: identifying documents [false_flag] |
| C003-M3 | dev | 48.3s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N1 unclear: Unclear: identifying documents [false_flag]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C012 | dev | 36.4s | yes | none | yes (not expected) |  |
| C012-M2 | dev | 27.9s | yes | missing_element (missed) | yes (not expected) |  |
| C012-MC | dev | 12.5s | yes | human_review:multi_charge (detected) | yes |  |
| C012-X1 | dev | 21.7s | yes | inconsistency (missed) | yes |  |
| C013 | dev | 55.0s | ok | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; C-1 citation: Possible citation mismatch: 8 U.S.C. 1326(a) [false_flag] |
| C013-CIT | dev | 26.1s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-X1 | dev | 25.4s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; C-1 citation: Possible citation mismatch: 8 U.S.C. 1326(a) [valid_observation] |
| C021 | heldout | 47.4s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [false_flag] |
| C021-CIT | heldout | 55.1s | ok | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [false_flag] |
| C021-MC | heldout | 44.9s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [false_flag] |
| C021-X1 | heldout | 28.9s | yes | inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [false_flag]; I-2 inconsistency: Immigration record mismatch [false_flag] |
| C037 | heldout | 30.3s | yes | none | no |  |
| C037-AMB | heldout | 34.5s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C037-CIT | heldout | 29.4s | yes | citation (detected) | yes |  |
| C037-M3 | heldout | 17.9s | yes | missing_element (detected) | yes (not expected) | U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C037-X1 | heldout | 55.0s | ok | inconsistency (not_completed) | yes |  |
| C045 | heldout | 21.5s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-CIT | heldout | 16.6s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-MC | heldout | 19.8s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-X1 | heldout | 22.6s | yes | inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C119 | heldout | 13.4s | yes | none | yes (not expected) |  |
| C119-AMB | heldout | 43.0s | yes | human_review:ambiguity (detected), inconsistency (missed) | yes |  |
| C119-CIT | heldout | 38.3s | yes | citation (routed_only) | yes |  |
| C119-X1 | heldout | 20.9s | yes | inconsistency (missed) | yes |  |
| C135 | heldout | 18.2s | yes | none | yes (not expected) | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M2 | heldout | 27.5s | yes | missing_element (detected) | yes (not expected) | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M3 | heldout | 15.7s | yes | missing_element (detected) | yes (not expected) | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-MC | heldout | 14.5s | yes | human_review:multi_charge (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
