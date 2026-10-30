# Evaluation run 2026-10-30T05-52-49 (scoring policy v2.4, dataset eval)

**Label: post-tuning, refinements, legacy rerun (build d0ec8c3; recorded HEAD has no server changes since).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (37/37) | |
| Detection recall, strict (failures count as missed) | 68% (21/31) | at least 90% |
| Missing elements | 83% (5/6) | |
| Inconsistencies | 40% (4/10) | |
| Citation errors (mismatch with verified evidence) | 86% (6/7) | |
| Routing: multi-charge (rule fired) | 100% (5/5) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 33% (1/3) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 7% (4/61) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 7% (1/15) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003, C003-M3, C012-M2, C013, C037-M3, C135-M3 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (61/61) | every flag |
| Sentence evidence by match type | exact 12 · partial 0 · unlabelled 38 | |
| Latency p50 / p90 / max (full HTTP review) | 16.5s / 30.5s / 49.2s | under 60s |

Plant outcomes: detected: 21, routed_only: 3, missed: 7, not_completed: 0.

**Partial reviews (a required check did not complete): 0.** none.
Recall over completed reviews only (secondary): 68% (21/31). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 61 = 20 planted + 0 duplicates + 37 adjudicated valid observations + 4 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 16.5s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-CIT | dev | 14.8s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-M3 | dev | 16.5s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-MC | dev | 16.0s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-X1 | dev | 14.2s | yes | inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C003 | dev | 9.1s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-AMB | dev | 13.0s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-CIT | dev | 18.4s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-M3 | dev | 7.1s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C012 | dev | 19.2s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-M2 | dev | 16.7s | yes | missing_element (missed) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-MC | dev | 9.3s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-X1 | dev | 20.1s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013 | dev | 49.2s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; C-1 citation: Possible citation mismatch: 8 U.S.C. 1326(a) [false_flag] |
| C013-CIT | dev | 25.3s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-X1 | dev | 31.6s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C021 | heldout | 26.3s | yes | none | yes (not expected) |  |
| C021-CIT | heldout | 26.6s | yes | citation (detected) | yes |  |
| C021-MC | heldout | 29.7s | yes | human_review:multi_charge (detected) | yes |  |
| C021-X1 | heldout | 26.2s | yes | inconsistency (detected) | yes | I-3 inconsistency: History record conflict [false_flag] |
| C037 | heldout | 37.6s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-AMB | heldout | 17.1s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C037-CIT | heldout | 18.3s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-M3 | heldout | 17.2s | yes | missing_element (detected) | yes (not expected) | M-N1 missing_element: Missing: identifying documents [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C037-X1 | heldout | 30.5s | yes | inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045 | heldout | 12.7s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-CIT | heldout | 12.3s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-MC | heldout | 11.6s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-X1 | heldout | 18.2s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C119 | heldout | 8.8s | yes | none | no |  |
| C119-AMB | heldout | 15.0s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes |  |
| C119-CIT | heldout | 19.3s | yes | citation (routed_only) | yes |  |
| C119-X1 | heldout | 9.9s | yes | inconsistency (detected) | yes |  |
| C135 | heldout | 9.6s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M2 | heldout | 9.6s | yes | missing_element (detected) | no | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M3 | heldout | 11.2s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-MC | heldout | 13.3s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
