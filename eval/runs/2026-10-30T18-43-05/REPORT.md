# Evaluation run 2026-10-30T18-43-05 (scoring policy v2.4, dataset eval)

**Label: round-2 planned evaluation, post-tuning (frozen rc-round2 = 1b5f59b; not held-out).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 92% (34/37) | |
| Detection recall, strict (failures count as missed) | 74% (23/31) | at least 90% |
| Missing elements | 83% (5/6) | |
| Inconsistencies | 50% (5/10) | |
| Citation errors (mismatch with verified evidence) | 86% (6/7) | |
| Routing: multi-charge (rule fired) | 100% (5/5) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 67% (2/3) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 6% (4/65) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 7% (1/15) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003, C003-M3, C012, C012-M2, C013, C037-M3, C135-M3 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (65/65) | every flag |
| Sentence evidence by match type | exact 16 · partial 0 · unlabelled 38 | |
| Latency p50 / p90 / max (full HTTP review) | 24.9s / 41.8s / 55.0s | under 60s |

Plant outcomes: detected: 23, routed_only: 2, missed: 4, not_completed: 2.

**Partial reviews (a required check did not complete): 3.** C003 (ok, 55s; facts:failed review-1:ok review-2:ok; plants: none); C003-M3 (ok, 26.2s; facts:invalid_output facts-retry:invalid_output review-1:ok review-2:ok; plants: missing_element=not_completed); C037-X1 (ok, 55s; facts:failed review-1:ok review-2:ok; plants: inconsistency=not_completed).
Recall over completed reviews only (secondary): 79% (23/29). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 65 = 22 planted + 0 duplicates + 39 adjudicated valid observations + 4 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 16.1s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-CIT | dev | 24.2s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-M3 | dev | 14.2s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-MC | dev | 41.8s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-X1 | dev | 34.2s | yes | inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C003 | dev | 55.0s | ok | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-AMB | dev | 18.9s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-CIT | dev | 23.6s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; I-1 inconsistency: Encounter time mismatch [valid_observation] |
| C003-M3 | dev | 26.2s | ok | missing_element (not_completed) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C012 | dev | 29.5s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-M2 | dev | 26.9s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-MC | dev | 34.6s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-X1 | dev | 24.2s | yes | inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013 | dev | 26.9s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-CIT | dev | 24.8s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-X1 | dev | 25.6s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; F-HISTORY inconsistency: Immigration record conflicts with the narrative [valid_observation] |
| C021 | heldout | 27.2s | yes | none | yes (not expected) |  |
| C021-CIT | heldout | 26.7s | yes | citation (detected) | yes |  |
| C021-MC | heldout | 27.1s | yes | human_review:multi_charge (detected) | yes |  |
| C021-X1 | heldout | 45.2s | yes | inconsistency (detected) | yes | I-3 inconsistency: History record inconsistency [false_flag] |
| C037 | heldout | 28.9s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-AMB | heldout | 26.2s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes | I-1 inconsistency: Encounter date/time mismatch [false_flag] |
| C037-CIT | heldout | 27.8s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-M3 | heldout | 15.2s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [false_flag] |
| C037-X1 | heldout | 55.0s | ok | inconsistency (not_completed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045 | heldout | 24.1s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-CIT | heldout | 25.7s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-MC | heldout | 18.1s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-X1 | heldout | 24.9s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C119 | heldout | 16.6s | yes | none | no |  |
| C119-AMB | heldout | 18.9s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes |  |
| C119-CIT | heldout | 14.2s | yes | citation (routed_only) | yes |  |
| C119-X1 | heldout | 10.9s | yes | inconsistency (detected) | yes |  |
| C135 | heldout | 11.3s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M2 | heldout | 14.4s | yes | missing_element (detected) | no | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M3 | heldout | 14.5s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-MC | heldout | 13.6s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
