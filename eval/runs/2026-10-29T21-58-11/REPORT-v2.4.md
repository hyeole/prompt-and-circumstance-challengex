# Evaluation run 2026-10-29T21-58-11 (scoring policy v2.4, dataset eval)

**Label: see eval/RUNS.md.** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (16/16) | |
| Detection recall, strict (failures count as missed) | 69% (9/13) | at least 90% |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 25% (1/4) | |
| Citation errors (mismatch with verified evidence) | 100% (3/3) | |
| Routing: multi-charge (rule fired) | 100% (2/2) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 0% (0/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 40% (10/25) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 0% (0/7) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C012-M2 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (25/25) | every flag |
| Sentence evidence by match type | exact 0 · partial 0 · unlabelled 19 | |
| Latency p50 / p90 / max (full HTTP review) | 26.4s / 52.1s / 53.0s | under 60s |

Plant outcomes: detected: 9, routed_only: 0, missed: 4, not_completed: 0.

**Partial reviews (a required check did not complete): 0.** none.
Recall over completed reviews only (secondary): 69% (9/13). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 25 = 9 planted + 0 duplicates + 6 adjudicated valid observations + 2 adjudicated false flags + 8 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 20.4s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-CIT | dev | 43.5s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; I-1 inconsistency: Subject not admitted but charge requires admission [unadjudicated] |
| C001-M3 | dev | 28.2s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-MC | dev | 52.1s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-X1 | dev | 16.0s | yes | inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003 | dev | 23.2s | yes | none | no | M-E7 missing_element: Missing: means and route of travel to the interior [unadjudicated] |
| C003-AMB | dev | 23.1s | yes | human_review:ambiguity (missed), inconsistency (missed) | no | M-E7 missing_element: Missing: means and route of travel to the interior [unadjudicated] |
| C003-CIT | dev | 53.0s | yes | citation (detected) | yes | M-E7 missing_element: Missing: means and route of travel to the interior [unadjudicated]; I-1 inconsistency: No evidence of prior removal [unadjudicated] |
| C003-M3 | dev | 27.9s | yes | missing_element (detected) | no | U-E7 unclear: Unclear: means and route of travel to the interior [unadjudicated] |
| C012 | dev | 26.4s | yes | none | no | M-E7 missing_element: Missing: means and route of travel to the interior [unadjudicated] |
| C012-M2 | dev | 43.4s | yes | missing_element (detected) | yes (not expected) | U-E7 unclear: Unclear: means and route of travel to the interior [valid_observation]; I-1 inconsistency: Entry manner conflict [false_flag] |
| C012-MC | dev | 13.8s | yes | human_review:multi_charge (detected) | yes |  |
| C012-X1 | dev | 51.7s | yes | inconsistency (detected) | yes | U-E7 unclear: Unclear: means and route of travel to the interior [unadjudicated] |
| C013 | dev | 22.2s | yes | none | no |  |
| C013-CIT | dev | 26.2s | yes | citation (detected) | yes | I-1 inconsistency: Charge requires admission but narrative shows illegal entry [false_flag] |
| C013-X1 | dev | 21.6s | yes | inconsistency (missed) | no |  |
