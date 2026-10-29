# Evaluation run 2026-10-29T22-13-53 (scoring policy v2.1)

**Label: see eval/RUNS.md.** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (16/16) | |
| Detection recall, strict (failures count as missed) | 77% (10/13) | at least 90% |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 25% (1/4) | |
| Citation errors (mismatch with verified evidence) | 100% (3/3) | |
| Routing: multi-charge (rule fired) | 100% (2/2) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (1/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 7% (1/15) | at most 10% |
| Unnecessary human-review routing (cases with nothing that calls for review) | 29% (2/7) | |
| Evidence references valid (quote = source text at offsets) | 100% (17/17) | every flag |
| Sentence evidence by match type | exact 0 · partial 0 · unlabelled 11 | |
| Latency p50 / p90 / max (full HTTP review) | 9.2s / 21.0s / 55.0s | under 60s |

Plant outcomes: detected: 10, routed_only: 0, missed: 3, not_completed: 0. "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 17 = 9 planted + 2 duplicates + 5 adjudicated valid observations + 0 adjudicated false flags + 1 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 8.9s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-CIT | dev | 9.7s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-M3 | dev | 9.0s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-MC | dev | 7.4s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-X1 | dev | 8.3s | yes | inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003 | dev | 9.2s | yes | none | no |  |
| C003-AMB | dev | 20.3s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes | I-2 inconsistency: Entry place inconsistency [duplicate]; C-1 citation: Possible citation mismatch: INA 212(a)(6)(A)(i) [duplicate] |
| C003-CIT | dev | 12.6s | yes | citation (detected) | yes |  |
| C003-M3 | dev | 55.0s | yes | missing_element (detected) | no |  |
| C012 | dev | 8.9s | yes | none | no |  |
| C012-M2 | dev | 10.2s | yes | missing_element (detected) | no |  |
| C012-MC | dev | 21.0s | yes | human_review:multi_charge (detected) | yes | I-1 inconsistency: Entry date mismatch [unadjudicated] |
| C012-X1 | dev | 6.4s | yes | inconsistency (missed) | no |  |
| C013 | dev | 7.4s | yes | none | no |  |
| C013-CIT | dev | 10.4s | yes | citation (detected) | yes |  |
| C013-X1 | dev | 8.4s | yes | inconsistency (missed) | no |  |
