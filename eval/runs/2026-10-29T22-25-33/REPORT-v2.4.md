# Evaluation run 2026-10-29T22-25-33 (scoring policy v2.4, dataset eval)

**Label: see eval/RUNS.md.** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (16/16) | |
| Detection recall, strict (failures count as missed) | 100% (13/13) | at least 90% |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 100% (4/4) | |
| Citation errors (mismatch with verified evidence) | 100% (3/3) | |
| Routing: multi-charge (rule fired) | 100% (2/2) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (1/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 11% (2/19) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 14% (1/7) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (19/19) | every flag |
| Sentence evidence by match type | exact 0 · partial 0 · unlabelled 15 | |
| Latency p50 / p90 / max (full HTTP review) | 17.4s / 28.0s / 36.0s | under 60s |

Plant outcomes: detected: 13, routed_only: 0, missed: 0, not_completed: 0.

**Partial reviews (a required check did not complete): 0.** none.
Recall over completed reviews only (secondary): 100% (13/13). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 19 = 12 planted + 0 duplicates + 5 adjudicated valid observations + 1 adjudicated false flags + 1 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 15.7s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-CIT | dev | 15.1s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-M3 | dev | 25.8s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-MC | dev | 16.8s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-X1 | dev | 12.8s | yes | inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003 | dev | 22.8s | yes | none | yes (not expected) |  |
| C003-AMB | dev | 11.9s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C003-CIT | dev | 17.4s | yes | citation (detected) | yes | U-E6 unclear: Unclear: basis for the immigration violation [unadjudicated] |
| C003-M3 | dev | 18.5s | yes | missing_element (detected) | no |  |
| C012 | dev | 9.4s | yes | none | no |  |
| C012-M2 | dev | 10.9s | yes | missing_element (detected) | no |  |
| C012-MC | dev | 10.2s | yes | human_review:multi_charge (detected) | yes |  |
| C012-X1 | dev | 23.5s | yes | inconsistency (detected) | yes |  |
| C013 | dev | 22.6s | yes | none | no |  |
| C013-CIT | dev | 36.0s | yes | citation (detected) | yes |  |
| C013-X1 | dev | 28.0s | yes | inconsistency (detected) | yes | I-1 inconsistency: Entry facts mismatch [false_flag] |
