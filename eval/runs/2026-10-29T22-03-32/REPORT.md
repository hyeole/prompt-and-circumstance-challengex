# Evaluation run 2026-10-29T22-03-32 (scoring policy v2.1)

**Label: see eval/RUNS.md.** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 63% (10/16) | |
| Detection recall, strict (failures count as missed) | 62% (8/13) | at least 90% |
| Missing elements | 0% (0/3) | |
| Inconsistencies | 75% (3/4) | |
| Citation errors (mismatch with verified evidence) | 100% (3/3) | |
| Routing: multi-charge (rule fired) | 100% (2/2) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 0% (0/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 24% (4/17) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 71% (5/7) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3 | |
| Evidence references valid (quote = source text at offsets) | 100% (17/17) | every flag |
| Sentence evidence by match type | exact 0 · partial 0 · unlabelled 23 | |
| Latency p50 / p90 / max (full HTTP review) | 51.9s / 55.1s / 55.3s | under 60s |

Plant outcomes: detected: 8, routed_only: 0, missed: 0, not_completed: 5. "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 17 = 8 planted + 0 duplicates + 5 adjudicated valid observations + 0 adjudicated false flags + 4 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 30.7s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; I-1 inconsistency: Entry facts conflict with form fields [unadjudicated] |
| C001-CIT | dev | 41.2s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-M3 | dev | 55.3s | failed | missing_element (not_completed) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-MC | dev | 55.0s | failed | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-X1 | dev | 29.3s | yes | inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003 | dev | 55.1s | failed | none | yes (not expected) |  |
| C003-AMB | dev | 55.0s | failed | human_review:ambiguity (not_completed), inconsistency (not_completed) | yes |  |
| C003-CIT | dev | 54.8s | yes | citation (detected) | yes |  |
| C003-M3 | dev | 55.0s | failed | missing_element (not_completed) | yes (not expected) |  |
| C012 | dev | 47.8s | yes | none | yes (not expected) | I-1 inconsistency: Entry date conflict [unadjudicated] |
| C012-M2 | dev | 55.0s | failed | missing_element (not_completed) | yes (not expected) |  |
| C012-MC | dev | 44.4s | yes | human_review:multi_charge (detected) | yes | I-1 inconsistency: Entry date inconsistency [unadjudicated] |
| C012-X1 | dev | 33.7s | yes | inconsistency (detected) | yes |  |
| C013 | dev | 39.0s | yes | none | yes (not expected) |  |
| C013-CIT | dev | 33.2s | yes | citation (detected) | yes | I-1 inconsistency: Entry facts conflict with form fields [unadjudicated] |
| C013-X1 | dev | 51.9s | yes | inconsistency (detected) | yes |  |
