# Evaluation run 2026-10-29T22-34-04 (scoring policy v2.1)

**Label: see eval/RUNS.md.** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 94% (15/16) | |
| Detection recall, strict (failures count as missed) | 77% (10/13) | at least 90% |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 75% (3/4) | |
| Citation errors (mismatch with verified evidence) | 33% (1/3) | |
| Routing: multi-charge (rule fired) | 100% (2/2) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (1/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 7% (1/15) | at most 10% |
| Unnecessary human-review routing (cases with nothing that calls for review) | 43% (3/7) | |
| Evidence references valid (quote = source text at offsets) | 100% (15/15) | every flag |
| Sentence evidence by match type | exact 0 · partial 0 · unlabelled 13 | |
| Latency p50 / p90 / max (full HTTP review) | 37.9s / 55.0s / 55.1s | under 60s |

Plant outcomes: detected: 10, routed_only: 2, missed: 0, not_completed: 1. "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 15 = 9 planted + 0 duplicates + 5 adjudicated valid observations + 0 adjudicated false flags + 1 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 45.1s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-CIT | dev | 19.4s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-M3 | dev | 21.3s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-MC | dev | 37.9s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-X1 | dev | 43.7s | yes | inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003 | dev | 9.5s | yes | none | no |  |
| C003-AMB | dev | 9.4s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C003-CIT | dev | 55.1s | yes | citation (routed_only) | yes |  |
| C003-M3 | dev | 21.4s | yes | missing_element (detected) | no |  |
| C012 | dev | 55.0s | yes | none | no |  |
| C012-M2 | dev | 20.6s | yes | missing_element (detected) | no |  |
| C012-MC | dev | 55.0s | yes | human_review:multi_charge (detected) | yes |  |
| C012-X1 | dev | 18.2s | yes | inconsistency (detected) | yes |  |
| C013 | dev | 24.7s | yes | none | yes (not expected) | I-1 inconsistency: Entry facts mismatch [unadjudicated] |
| C013-CIT | dev | 55.0s | yes | citation (routed_only) | yes |  |
| C013-X1 | dev | 55.0s | failed | inconsistency (not_completed) | yes |  |
