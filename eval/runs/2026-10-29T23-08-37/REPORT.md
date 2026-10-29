# Evaluation run 2026-10-29T23-08-37 (scoring policy v2.1)

**Label: post-tuning diagnostics (commit 554c9b8).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 94% (15/16) | |
| Detection recall, strict (failures count as missed) | 85% (11/13) | at least 90% |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 75% (3/4) | |
| Citation errors (mismatch with verified evidence) | 100% (3/3) | |
| Routing: multi-charge (rule fired) | 100% (2/2) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 0% (0/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 10% (2/20) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 14% (1/7) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003-M3 | |
| Evidence references valid (quote = source text at offsets) | 100% (20/20) | every flag |
| Sentence evidence by match type | exact 10 · partial 0 · unlabelled 5 | |
| Latency p50 / p90 / max (full HTTP review) | 20.4s / 55.0s / 55.0s | under 60s |

Plant outcomes: detected: 11, routed_only: 0, missed: 0, not_completed: 2. "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 20 = 12 planted + 0 duplicates + 6 adjudicated valid observations + 2 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 17.1s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-CIT | dev | 20.4s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-M3 | dev | 8.9s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-MC | dev | 15.7s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-X1 | dev | 46.3s | yes | inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003 | dev | 6.5s | yes | none | no |  |
| C003-AMB | dev | 55.0s | failed | human_review:ambiguity (not_completed), inconsistency (not_completed) | yes |  |
| C003-CIT | dev | 55.0s | yes | citation (detected) | yes |  |
| C003-M3 | dev | 55.0s | yes | missing_element (detected) | yes (not expected) | I-1 inconsistency: Encounter time discrepancy [valid_observation] |
| C012 | dev | 8.4s | yes | none | no |  |
| C012-M2 | dev | 16.0s | yes | missing_element (detected) | no |  |
| C012-MC | dev | 16.3s | yes | human_review:multi_charge (detected) | yes |  |
| C012-X1 | dev | 24.4s | yes | inconsistency (detected) | yes |  |
| C013 | dev | 55.0s | yes | none | yes (not expected) | I-1 inconsistency: Entry date mismatch [false_flag]; I-2 inconsistency: Entry place mismatch [false_flag] |
| C013-CIT | dev | 34.5s | yes | citation (detected) | yes |  |
| C013-X1 | dev | 13.1s | yes | inconsistency (detected) | yes |  |
