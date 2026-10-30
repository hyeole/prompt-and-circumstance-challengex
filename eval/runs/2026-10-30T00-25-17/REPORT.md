# Evaluation run 2026-10-30T00-25-17 (scoring policy v2.1)

**Label: M2 merge comparison: samples=1, round 1 (commit bcac131, production build).** Internal synthetic evaluation on team-created test variants of adapted public records.
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
| Incorrect flags (false + unadjudicated, excl. duplicates) | 12% (3/25) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 14% (1/7) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003, C003-M3 | |
| Evidence references valid (quote = source text at offsets) | 100% (25/25) | every flag |
| Sentence evidence by match type | exact 11 · partial 0 · unlabelled 9 | |
| Latency p50 / p90 / max (full HTTP review) | 16.0s / 36.2s / 55.0s | under 60s |

Plant outcomes: detected: 13, routed_only: 0, missed: 0, not_completed: 0.

**Partial reviews (model check did not complete): 0.** none.
Recall over completed reviews only (secondary): 100% (13/13). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 25 = 12 planted + 0 duplicates + 10 adjudicated valid observations + 3 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 16.0s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-CIT | dev | 16.1s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; I-1 inconsistency: Entry facts mismatch [valid_observation]; I-2 inconsistency: Entry manner inconsistency [false_flag] |
| C001-M3 | dev | 10.2s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-MC | dev | 14.7s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-X1 | dev | 26.1s | yes | inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003 | dev | 55.0s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-AMB | dev | 9.9s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-CIT | dev | 14.9s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-M3 | dev | 33.8s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C012 | dev | 10.0s | yes | none | no |  |
| C012-M2 | dev | 12.3s | yes | missing_element (detected) | no |  |
| C012-MC | dev | 9.3s | yes | human_review:multi_charge (detected) | yes |  |
| C012-X1 | dev | 12.9s | yes | inconsistency (detected) | yes |  |
| C013 | dev | 36.2s | yes | none | yes (not expected) | I-1 inconsistency: Entry facts mismatch [false_flag]; C-1 citation: Possible citation mismatch: 8 U.S.C. 1326(a) [false_flag] |
| C013-CIT | dev | 25.0s | yes | citation (detected) | yes |  |
| C013-X1 | dev | 25.1s | yes | inconsistency (detected) | yes |  |
