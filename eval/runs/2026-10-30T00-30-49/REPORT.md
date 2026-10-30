# Evaluation run 2026-10-30T00-30-49 (scoring policy v2.1)

**Label: M2 merge comparison: samples=2, round 2 (commit bcac131, production build).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (16/16) | |
| Detection recall, strict (failures count as missed) | 85% (11/13) | at least 90% |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 75% (3/4) | |
| Citation errors (mismatch with verified evidence) | 100% (3/3) | |
| Routing: multi-charge (rule fired) | 100% (2/2) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 0% (0/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 12% (3/26) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 0% (0/7) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003, C003-M3, C013 | |
| Evidence references valid (quote = source text at offsets) | 100% (27/27) | every flag |
| Sentence evidence by match type | exact 17 · partial 0 · unlabelled 9 | |
| Latency p50 / p90 / max (full HTTP review) | 16.2s / 55.0s / 55.0s | under 60s |

Plant outcomes: detected: 11, routed_only: 1, missed: 1, not_completed: 0.

**Partial reviews (model check did not complete): 0.** none.
Recall over completed reviews only (secondary): 85% (11/13). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 27 = 11 planted + 1 duplicates + 12 adjudicated valid observations + 3 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 8.2s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-CIT | dev | 42.5s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; I-1 inconsistency: Entry facts mismatch [valid_observation]; I-2 inconsistency: Entry manner inconsistency [false_flag] |
| C001-M3 | dev | 15.1s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-MC | dev | 14.8s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-X1 | dev | 16.7s | yes | inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003 | dev | 9.1s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-AMB | dev | 55.0s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-CIT | dev | 14.8s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-M3 | dev | 18.1s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; I-1 inconsistency: Encounter time discrepancy [valid_observation] |
| C012 | dev | 9.8s | yes | none | no |  |
| C012-M2 | dev | 11.6s | yes | missing_element (detected) | no |  |
| C012-MC | dev | 16.2s | yes | human_review:multi_charge (detected) | yes |  |
| C012-X1 | dev | 12.9s | yes | inconsistency (detected) | yes |  |
| C013 | dev | 29.6s | yes | none | yes (not expected) | I-1 inconsistency: Entry place mismatch [valid_observation] |
| C013-CIT | dev | 27.3s | yes | citation (detected) | yes |  |
| C013-X1 | dev | 55.0s | yes | inconsistency (detected) | yes | I-3 inconsistency: Entry facts mismatch [false_flag]; I-4 inconsistency: History record mismatch [duplicate]; C-1 citation: Possible citation mismatch: 8 U.S.C. 1326(a) [false_flag] |
