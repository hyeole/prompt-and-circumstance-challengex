# Evaluation run 2026-10-30T21-48-37 (scoring policy v2.4 + claim-aware adjudication layer, dataset eval)

**Label: round-3 measured evaluation, post-tuning (frozen rc-round3 = 4cf02c3; code = 3655aa9; not held-out).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 78% (29/37) | |
| Detection recall, strict (failures count as missed) | 77% (24/31) | at least 90% |
| Missing elements | 83% (5/6) | |
| Inconsistencies | 60% (6/10) | |
| Citation errors (mismatch with verified evidence) | 86% (6/7) | |
| Routing: multi-charge (rule fired) | 100% (5/5) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 67% (2/3) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 3% (2/62) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 13% (2/15) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003, C003-M3, C012, C012-M2, C037-M3, C135-M3 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (62/62) | every flag |
| Sentence evidence by match type | exact 14 · partial 0 · unlabelled 32 | |
| Latency p50 / p90 / max (full HTTP review) | 27.4s / 55.0s / 55.1s | under 60s |

Plant outcomes: detected: 24, routed_only: 2, missed: 4, not_completed: 1.

**Partial reviews (a required check did not complete): 8.** C001-CIT (ok, 55.1s; facts:failed review-1:cancelled review-2:ok; plants: citation=detected); C003-CIT (ok, 55s; facts:failed review-1:ok review-2:cancelled; plants: citation=detected); C003-M3 (failed, 55s; facts:failed review-1:failed review-2:failed; plants: missing_element=not_completed); C012-MC (ok, 55s; facts:failed review-1:ok review-2:ok; plants: human_review:multi_charge=detected); C013 (failed, 55s; facts:failed review-1:failed review-2:failed; plants: none); C013-CIT (failed, 55s; facts:failed review-1:failed review-2:failed; plants: citation=detected); C021 (ok, 55s; facts:failed review-1:ok review-2:ok; plants: none); C021-CIT (ok, 55s; facts:failed review-1:cancelled review-2:ok; plants: citation=detected).
Recall over completed reviews only (secondary): 76% (19/25). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 62 = 22 planted + 0 duplicates + 38 adjudicated valid observations + 2 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 31.2s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-CIT | dev | 55.1s | ok | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-M3 | dev | 19.2s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-MC | dev | 16.2s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C001-X1 | dev | 35.4s | yes | inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C003 | dev | 8.1s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-AMB | dev | 13.4s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-CIT | dev | 55.0s | ok | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; I-1 inconsistency: Encounter time discrepancy [false_flag] |
| C003-M3 | dev | 55.0s | failed | missing_element (not_completed) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [valid_observation] |
| C012 | dev | 44.8s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-M2 | dev | 30.1s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-MC | dev | 55.0s | ok | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-X1 | dev | 27.4s | yes | inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013 | dev | 55.0s | failed | none | yes (not expected) |  |
| C013-CIT | dev | 55.0s | failed | citation (detected) | yes |  |
| C013-X1 | dev | 35.0s | yes | inconsistency (missed) | yes | M-N1 missing_element: Missing: identifying documents [valid_observation]; F-HISTORY inconsistency: Immigration record conflicts with the narrative [valid_observation] |
| C021 | heldout | 55.0s | ok | none | yes (not expected) |  |
| C021-CIT | heldout | 55.0s | ok | citation (detected) | yes |  |
| C021-MC | heldout | 27.2s | yes | human_review:multi_charge (detected) | yes |  |
| C021-X1 | heldout | 38.7s | yes | inconsistency (detected) | yes | I-2 inconsistency: History record mismatch [false_flag] |
| C037 | heldout | 44.0s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-AMB | heldout | 21.8s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C037-CIT | heldout | 23.7s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C037-M3 | heldout | 16.1s | yes | missing_element (detected) | yes (not expected) | M-N1 missing_element: Missing: identifying documents [valid_observation]; U-N5 unclear: Unclear: specific ground stated and explained [valid_observation] |
| C037-X1 | heldout | 25.6s | yes | inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045 | heldout | 25.3s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-CIT | heldout | 9.5s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-MC | heldout | 22.5s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-X1 | heldout | 46.3s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C119 | heldout | 25.2s | yes | none | no |  |
| C119-AMB | heldout | 26.7s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes |  |
| C119-CIT | heldout | 48.7s | yes | citation (routed_only) | yes |  |
| C119-X1 | heldout | 42.4s | yes | inconsistency (detected) | yes |  |
| C135 | heldout | 20.6s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M2 | heldout | 27.0s | yes | missing_element (detected) | no | M-N1 missing_element: Missing: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-M3 | heldout | 18.0s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C135-MC | heldout | 12.7s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
