# Evaluation run 2026-10-30T07-32-13 (scoring policy v2.3, dataset eval)

**Label: planned evaluation, final build, post-tuning (eval, build 4b10d72).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 95% (35/37) | |
| Detection recall, strict (failures count as missed) | 68% (21/31) | at least 90% |
| Missing elements | 100% (6/6) | |
| Inconsistencies | 30% (3/10) | |
| Citation errors (mismatch with verified evidence) | 86% (6/7) | |
| Routing: multi-charge (rule fired) | 100% (5/5) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 33% (1/3) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 6% (4/63) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 7% (1/15) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003, C003-M3, C012-M2, C013, C037-M3, C135-M3 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (64/64) | every flag |
| Sentence evidence by match type | exact 13 · partial 0 · unlabelled 40 | |
| Latency p50 / p90 / max (full HTTP review) | 22.0s / 44.3s / 55.0s | under 60s |

Plant outcomes: detected: 21, routed_only: 3, missed: 6, not_completed: 1.

**Partial reviews (a required check did not complete): 2.** C013-CIT (ok, 55s; facts:failed review-1:ok review-2:cancelled; plants: citation=detected); C021-X1 (ok, 55s; facts:failed review-1:ok review-2:ok; plants: inconsistency=not_completed).
Recall over completed reviews only (secondary): 69% (20/29). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 64 = 21 planted + 1 duplicates + 38 adjudicated valid observations + 4 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 13.4s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-CIT | dev | 21.9s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-M3 | dev | 18.3s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-MC | dev | 13.3s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-X1 | dev | 24.6s | yes | inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C003 | dev | 15.4s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-AMB | dev | 19.6s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-CIT | dev | 18.4s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-M3 | dev | 19.5s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C012 | dev | 21.0s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-M2 | dev | 32.1s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; I-2 inconsistency: Encounter time discrepancy [false_flag] |
| C012-MC | dev | 44.3s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-X1 | dev | 25.4s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013 | dev | 28.7s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-CIT | dev | 55.0s | ok | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-X1 | dev | 28.6s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; C-1 citation: Possible citation mismatch: 8 U.S.C. 1326(a) [valid_observation] |
| C021 | heldout | 43.7s | yes | none | yes (not expected) |  |
| C021-CIT | heldout | 40.8s | yes | citation (detected) | yes |  |
| C021-MC | heldout | 28.6s | yes | human_review:multi_charge (detected) | yes |  |
| C021-X1 | heldout | 55.0s | ok | inconsistency (not_completed) | yes | I-2 inconsistency: Entry manner mismatch [duplicate]; I-3 inconsistency: History record conflict [false_flag] |
| C037 | heldout | 25.8s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-AMB | heldout | 34.5s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C037-CIT | heldout | 32.6s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-M3 | heldout | 19.6s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C037-X1 | heldout | 53.7s | yes | inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045 | heldout | 22.0s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-CIT | heldout | 13.2s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-MC | heldout | 17.7s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-X1 | heldout | 27.6s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C119 | heldout | 18.1s | yes | none | no |  |
| C119-AMB | heldout | 42.7s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes |  |
| C119-CIT | heldout | 12.6s | yes | citation (routed_only) | yes |  |
| C119-X1 | heldout | 21.6s | yes | inconsistency (detected) | yes |  |
| C135 | heldout | 14.7s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M2 | heldout | 13.1s | yes | missing_element (detected) | no | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M3 | heldout | 16.8s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-MC | heldout | 22.3s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
