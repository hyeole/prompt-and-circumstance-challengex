# Evaluation run 2026-10-30T07-10-11 (scoring policy v2.4, dataset eval)

**Label: targeted check, not an evaluation (citation, build db07cf6).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (7/7) | |
| Detection recall, strict (failures count as missed) | 57% (4/7) | at least 90% |
| Missing elements | n/a | |
| Inconsistencies | 0% (0/1) | |
| Citation errors (mismatch with verified evidence) | 67% (4/6) | |
| Routing: multi-charge (rule fired) | n/a | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | n/a | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 0% (0/10) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | n/a | |
| Routed because of an adjudicated real discrepancy in the source | none | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (10/10) | every flag |
| Sentence evidence by match type | exact 3 · partial 0 · unlabelled 5 | |
| Latency p50 / p90 / max (full HTTP review) | 22.5s / 42.9s / 42.9s | under 60s |

Plant outcomes: detected: 4, routed_only: 2, missed: 1, not_completed: 0.

**Partial reviews (a required check did not complete): 0.** none.
Recall over completed reviews only (secondary): 57% (4/7). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 10 = 4 planted + 0 duplicates + 6 adjudicated valid observations + 0 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001-CIT | dev | 18.7s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C003-CIT | dev | 42.9s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C013-X1 | dev | 25.0s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C021-CIT | heldout | 31.6s | yes | citation (detected) | yes |  |
| C037-CIT | heldout | 22.5s | yes | citation (routed_only) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-CIT | heldout | 15.0s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C119-CIT | heldout | 13.4s | yes | citation (routed_only) | yes |  |
