# Evaluation run 2026-10-29T22-21-33 (scoring policy v2.1)

**Label: see eval/RUNS.md.** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (16/16) | |
| Detection recall, strict (failures count as missed) | 77% (10/13) | at least 90% |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 100% (4/4) | |
| Citation errors (mismatch with verified evidence) | 0% (0/3) | |
| Routing: multi-charge (rule fired) | 100% (2/2) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (1/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 18% (3/17) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 0% (0/7) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3 | |
| Evidence references valid (quote = source text at offsets) | 100% (17/17) | every flag |
| Sentence evidence by match type | exact 0 · partial 0 · unlabelled 11 | |
| Latency p50 / p90 / max (full HTTP review) | 19.9s / 42.2s / 42.5s | under 60s |

Plant outcomes: detected: 10, routed_only: 1, missed: 2, not_completed: 0. "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 17 = 9 planted + 0 duplicates + 5 adjudicated valid observations + 1 adjudicated false flags + 2 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 28.7s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-CIT | dev | 18.5s | yes | citation (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-M3 | dev | 42.5s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; Q-2 unclear: Entry date not stated [unadjudicated]; Q-3 unclear: Encounter date/time not stated [unadjudicated] |
| C001-MC | dev | 29.9s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-X1 | dev | 19.6s | yes | inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003 | dev | 13.4s | yes | none | no |  |
| C003-AMB | dev | 19.9s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C003-CIT | dev | 17.0s | yes | citation (routed_only) | yes | M-E6 missing_element: Missing: basis for the immigration violation [false_flag] |
| C003-M3 | dev | 16.6s | yes | missing_element (detected) | no |  |
| C012 | dev | 12.2s | yes | none | no |  |
| C012-M2 | dev | 22.3s | yes | missing_element (detected) | no |  |
| C012-MC | dev | 9.5s | yes | human_review:multi_charge (detected) | yes |  |
| C012-X1 | dev | 11.0s | yes | inconsistency (detected) | yes |  |
| C013 | dev | 33.9s | yes | none | no |  |
| C013-CIT | dev | 25.3s | yes | citation (missed) | no |  |
| C013-X1 | dev | 42.2s | yes | inconsistency (detected) | yes |  |
