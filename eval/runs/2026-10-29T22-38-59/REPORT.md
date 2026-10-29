# Evaluation run 2026-10-29T22-38-59 (scoring policy v2.1)

**Label: see eval/RUNS.md.** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 95% (20/21) | |
| Detection recall, strict (failures count as missed) | 72% (13/18) | at least 90% |
| Missing elements | 67% (2/3) | |
| Inconsistencies | 83% (5/6) | |
| Citation errors (mismatch with verified evidence) | 25% (1/4) | |
| Routing: multi-charge (rule fired) | 100% (3/3) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (2/2) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 0% (0/11) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 0% (0/8) | |
| Routed because of an adjudicated real discrepancy in the source | none | |
| Evidence references valid (quote = source text at offsets) | 100% (11/11) | every flag |
| Sentence evidence by match type | exact 0 · partial 0 · unlabelled 7 | |
| Latency p50 / p90 / max (full HTTP review) | 18.1s / 53.2s / 55.1s | under 60s |

Plant outcomes: detected: 13, routed_only: 0, missed: 4, not_completed: 1. "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 11 = 11 planted + 0 duplicates + 0 adjudicated valid observations + 0 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C021 | heldout | 10.5s | yes | none | no |  |
| C021-CIT | heldout | 55.1s | yes | citation (missed) | no |  |
| C021-MC | heldout | 53.2s | yes | human_review:multi_charge (detected) | yes |  |
| C021-X1 | heldout | 13.6s | yes | inconsistency (detected) | yes |  |
| C037 | heldout | 20.7s | yes | none | no |  |
| C037-AMB | heldout | 18.0s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C037-CIT | heldout | 55.0s | failed | citation (not_completed) | yes |  |
| C037-M3 | heldout | 8.5s | yes | missing_element (missed) | no |  |
| C037-X1 | heldout | 18.3s | yes | inconsistency (detected) | yes |  |
| C045 | heldout | 8.6s | yes | none | no |  |
| C045-CIT | heldout | 24.9s | yes | citation (detected) | yes |  |
| C045-MC | heldout | 47.7s | yes | human_review:multi_charge (detected) | yes |  |
| C045-X1 | heldout | 27.7s | yes | inconsistency (missed) | no |  |
| C119 | heldout | 21.8s | yes | none | no |  |
| C119-AMB | heldout | 9.4s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C119-CIT | heldout | 12.0s | yes | citation (missed) | no |  |
| C119-X1 | heldout | 10.3s | yes | inconsistency (detected) | yes |  |
| C135 | heldout | 11.2s | yes | none | no |  |
| C135-M2 | heldout | 32.3s | yes | missing_element (detected) | no |  |
| C135-M3 | heldout | 9.2s | yes | missing_element (detected) | no |  |
| C135-MC | heldout | 18.1s | yes | human_review:multi_charge (detected) | yes |  |
