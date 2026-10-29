# Evaluation run 2026-10-29T22-28-28 (scoring policy v2.1)

**Label: see eval/RUNS.md.** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (21/21) | |
| Detection recall, strict (failures count as missed) | 83% (15/18) | at least 90% |
| Missing elements | 33% (1/3) | |
| Inconsistencies | 100% (6/6) | |
| Citation errors (mismatch with verified evidence) | 75% (3/4) | |
| Routing: multi-charge (rule fired) | 100% (3/3) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (2/2) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 28% (5/18) | at most 10% |
| Unnecessary human-review routing (cases with nothing that calls for review) | 13% (1/8) | |
| Evidence references valid (quote = source text at offsets) | 100% (18/18) | every flag |
| Sentence evidence by match type | exact 0 · partial 0 · unlabelled 15 | |
| Latency p50 / p90 / max (full HTTP review) | 22.0s / 35.9s / 55.0s | under 60s |

Plant outcomes: detected: 15, routed_only: 1, missed: 2, not_completed: 0. "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 18 = 13 planted + 0 duplicates + 0 adjudicated valid observations + 5 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C021 | heldout | 17.2s | yes | none | yes (not expected) | F-ENTRY-DATE inconsistency: Entry date differs from the form [false_flag] |
| C021-CIT | heldout | 19.6s | yes | citation (detected) | yes | I-1 inconsistency: Encounter date mismatch [false_flag] |
| C021-MC | heldout | 42.2s | yes | human_review:multi_charge (detected) | yes | F-HISTORY inconsistency: Immigration record conflicts with the narrative [false_flag] |
| C021-X1 | heldout | 18.1s | yes | inconsistency (detected) | yes | C-1 citation: Possible citation mismatch: INA 237(a)(1)(B) [false_flag] |
| C037 | heldout | 35.9s | yes | none | no |  |
| C037-AMB | heldout | 11.1s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C037-CIT | heldout | 19.3s | yes | citation (detected) | yes |  |
| C037-M3 | heldout | 20.4s | yes | missing_element (missed) | no |  |
| C037-X1 | heldout | 30.4s | yes | inconsistency (detected) | yes |  |
| C045 | heldout | 55.0s | yes | none | no |  |
| C045-CIT | heldout | 22.0s | yes | citation (detected) | yes |  |
| C045-MC | heldout | 11.5s | yes | human_review:multi_charge (detected) | yes |  |
| C045-X1 | heldout | 35.4s | yes | inconsistency (detected) | yes | I-2 inconsistency: Entry place mismatch [false_flag] |
| C119 | heldout | 34.1s | yes | none | no |  |
| C119-AMB | heldout | 28.3s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C119-CIT | heldout | 12.6s | yes | citation (routed_only) | yes |  |
| C119-X1 | heldout | 28.1s | yes | inconsistency (detected) | yes |  |
| C135 | heldout | 28.8s | yes | none | no |  |
| C135-M2 | heldout | 34.8s | yes | missing_element (detected) | no |  |
| C135-M3 | heldout | 18.8s | yes | missing_element (missed) | no |  |
| C135-MC | heldout | 5.7s | yes | human_review:multi_charge (detected) | yes |  |
