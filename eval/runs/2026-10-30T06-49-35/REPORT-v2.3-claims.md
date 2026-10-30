# Evaluation run 2026-10-30T06-49-35 (scoring policy v2.3 + claim-aware adjudication layer, dataset eval)

**Label: planned evaluation, post-tuning (eval, build e4dd17b).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 97% (36/37) | |
| Detection recall, strict (failures count as missed) | 71% (22/31) | at least 90% |
| Missing elements | 100% (6/6) | |
| Inconsistencies | 40% (4/10) | |
| Citation errors (mismatch with verified evidence) | 86% (6/7) | |
| Routing: multi-charge (rule fired) | 100% (5/5) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 33% (1/3) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 2% (1/62) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 7% (1/15) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003, C003-M3, C013, C037-M3, C135-M3 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (62/62) | every flag |
| Sentence evidence by match type | exact 10 · partial 0 · unlabelled 46 | |
| Latency p50 / p90 / max (full HTTP review) | 18.4s / 34.0s / 55.0s | under 60s |

Plant outcomes: detected: 22, routed_only: 3, missed: 6, not_completed: 0.

**Partial reviews (a required check did not complete): 1.** C013-CIT (ok, 55s; facts:failed review-1:ok review-2:ok; plants: citation=detected).
Recall over completed reviews only (secondary): 70% (21/30). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 62 = 21 planted + 0 duplicates + 40 adjudicated valid observations + 1 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 14.6s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-CIT | dev | 41.4s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-M3 | dev | 10.8s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-MC | dev | 14.1s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-X1 | dev | 15.2s | yes | inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C003 | dev | 9.8s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-AMB | dev | 16.5s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-CIT | dev | 15.2s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-M3 | dev | 19.4s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [valid_observation] |
| C012 | dev | 21.6s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-M2 | dev | 20.2s | yes | missing_element (detected) | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-MC | dev | 9.4s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-X1 | dev | 24.3s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013 | dev | 26.6s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-CIT | dev | 55.0s | ok | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-X1 | dev | 34.0s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C021 | heldout | 26.8s | yes | none | yes (not expected) |  |
| C021-CIT | heldout | 27.1s | yes | citation (detected) | yes |  |
| C021-MC | heldout | 26.2s | yes | human_review:multi_charge (detected) | yes |  |
| C021-X1 | heldout | 22.1s | yes | inconsistency (detected) | yes | I-3 inconsistency: History record conflict [false_flag] |
| C037 | heldout | 37.6s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-AMB | heldout | 21.2s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-CIT | heldout | 18.4s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-M3 | heldout | 13.8s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [valid_observation] |
| C037-X1 | heldout | 28.2s | yes | inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045 | heldout | 14.3s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-CIT | heldout | 12.1s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-MC | heldout | 11.2s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-X1 | heldout | 24.6s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C119 | heldout | 18.1s | yes | none | no |  |
| C119-AMB | heldout | 29.7s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes |  |
| C119-CIT | heldout | 21.9s | yes | citation (routed_only) | yes |  |
| C119-X1 | heldout | 9.3s | yes | inconsistency (detected) | yes |  |
| C135 | heldout | 10.4s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M2 | heldout | 12.1s | yes | missing_element (detected) | no | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M3 | heldout | 12.6s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-MC | heldout | 12.3s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
