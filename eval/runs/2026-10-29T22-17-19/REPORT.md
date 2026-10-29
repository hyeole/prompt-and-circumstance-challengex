# Evaluation run 2026-10-29T22-17-19 (scoring policy v2.1)

**Label: see eval/RUNS.md.** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (16/16) | |
| Detection recall, strict (failures count as missed) | 85% (11/13) | at least 90% |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 75% (3/4) | |
| Citation errors (mismatch with verified evidence) | 67% (2/3) | |
| Routing: multi-charge (rule fired) | 100% (2/2) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (1/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 6% (1/16) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 0% (0/7) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3 | |
| Evidence references valid (quote = source text at offsets) | 100% (16/16) | every flag |
| Sentence evidence by match type | exact 0 · partial 0 · unlabelled 11 | |
| Latency p50 / p90 / max (full HTTP review) | 11.6s / 25.2s / 55.0s | under 60s |

Plant outcomes: detected: 11, routed_only: 0, missed: 2, not_completed: 0. "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 16 = 10 planted + 0 duplicates + 5 adjudicated valid observations + 0 adjudicated false flags + 1 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 8.4s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-CIT | dev | 8.1s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-M3 | dev | 9.2s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-MC | dev | 9.1s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-X1 | dev | 14.6s | yes | inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003 | dev | 9.0s | yes | none | no |  |
| C003-AMB | dev | 13.4s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C003-CIT | dev | 13.1s | yes | citation (missed) | no |  |
| C003-M3 | dev | 55.0s | yes | missing_element (detected) | no |  |
| C012 | dev | 10.1s | yes | none | no |  |
| C012-M2 | dev | 11.0s | yes | missing_element (detected) | no |  |
| C012-MC | dev | 23.9s | yes | human_review:multi_charge (detected) | yes | I-1 inconsistency: Entry date conflict [unadjudicated] |
| C012-X1 | dev | 10.7s | yes | inconsistency (missed) | no |  |
| C013 | dev | 25.2s | yes | none | no |  |
| C013-CIT | dev | 17.9s | yes | citation (detected) | yes |  |
| C013-X1 | dev | 11.6s | yes | inconsistency (detected) | yes |  |
