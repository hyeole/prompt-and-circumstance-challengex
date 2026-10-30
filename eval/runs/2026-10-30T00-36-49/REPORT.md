# Evaluation run 2026-10-30T00-36-49 (scoring policy v2.1)

**Label: M2 merge comparison: samples=1, round 2 (commit bcac131, production build).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 88% (14/16) | |
| Detection recall, strict (failures count as missed) | 77% (10/13) | at least 90% |
| Missing elements | 67% (2/3) | |
| Inconsistencies | 50% (2/4) | |
| Citation errors (mismatch with verified evidence) | 100% (3/3) | |
| Routing: multi-charge (rule fired) | 100% (2/2) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (1/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 13% (3/24) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 29% (2/7) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003, C003-M3 | |
| Evidence references valid (quote = source text at offsets) | 100% (24/24) | every flag |
| Sentence evidence by match type | exact 11 · partial 0 · unlabelled 9 | |
| Latency p50 / p90 / max (full HTTP review) | 17.9s / 33.7s / 55.0s | under 60s |

Plant outcomes: detected: 10, routed_only: 0, missed: 1, not_completed: 2.

**Partial reviews (model check did not complete): 2.** C012-M2 (failed, 55s; facts:ok review-1:failed; plants: missing_element=not_completed); C012-X1 (invalid_output, 17.9s; facts:ok review-1:invalid_output; plants: inconsistency=not_completed).
Recall over completed reviews only (secondary): 91% (10/11). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 24 = 10 planted + 0 duplicates + 11 adjudicated valid observations + 3 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 15.6s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-CIT | dev | 18.7s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; I-1 inconsistency: Entry facts conflict [valid_observation]; Q-2 unclear: Encounter location unclear [false_flag] |
| C001-M3 | dev | 9.6s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-MC | dev | 14.4s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-X1 | dev | 16.1s | yes | inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003 | dev | 8.8s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-AMB | dev | 10.5s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-CIT | dev | 14.8s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-M3 | dev | 33.7s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; I-1 inconsistency: Encounter time discrepancy [valid_observation] |
| C012 | dev | 18.7s | yes | none | no |  |
| C012-M2 | dev | 55.0s | failed | missing_element (not_completed) | yes (not expected) |  |
| C012-MC | dev | 8.2s | yes | human_review:multi_charge (detected) | yes |  |
| C012-X1 | dev | 17.9s | invalid_output | inconsistency (not_completed) | yes |  |
| C013 | dev | 25.7s | yes | none | yes (not expected) | I-1 inconsistency: Entry facts mismatch [false_flag]; C-1 citation: Possible citation mismatch: 8 U.S.C. 1326(a) [false_flag] |
| C013-CIT | dev | 29.1s | yes | citation (detected) | yes |  |
| C013-X1 | dev | 25.1s | yes | inconsistency (missed) | no |  |
