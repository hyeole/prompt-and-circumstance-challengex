# Evaluation run 2026-10-30T21-34-06 (scoring policy v2.4, dataset eval/dev-synthetic)

**Label: round-3 measured evaluation, post-tuning (frozen rc-round3 = 4cf02c3; code = 3655aa9; not held-out).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (12/12) | |
| Detection recall, strict (failures count as missed) | 100% (6/6) | at least 90% |
| Missing elements | 100% (4/4) | |
| Inconsistencies | 100% (1/1) | |
| Citation errors (mismatch with verified evidence) | 100% (1/1) | |
| Routing: multi-charge (rule fired) | n/a | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | n/a | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 0% (0/11) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 0% (0/10) | |
| Routed because of an adjudicated real discrepancy in the source | DS06, DS11 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 100% (50/50) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (11/11) | every flag |
| Sentence evidence by match type | exact 2 · partial 0 · unlabelled 4 | |
| Latency p50 / p90 / max (full HTTP review) | 11.6s / 15.7s / 19.9s | under 60s |

Plant outcomes: detected: 6, routed_only: 0, missed: 0, not_completed: 0.

**Partial reviews (a required check did not complete): 0.** none.
Recall over completed reviews only (secondary): 100% (6/6). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 11 = 6 planted + 0 duplicates + 5 adjudicated valid observations + 0 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| DS01 | dev-synthetic | 13.5s | yes | none | no |  |
| DS02 | dev-synthetic | 10.3s | yes | missing_element (detected) | no |  |
| DS03 | dev-synthetic | 12.5s | yes | missing_element (detected) | no |  |
| DS04 | dev-synthetic | 19.9s | yes | none | no |  |
| DS05 | dev-synthetic | 11.6s | yes | inconsistency (detected) | yes |  |
| DS06 | dev-synthetic | 15.7s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| DS07 | dev-synthetic | 7.1s | yes | none | no |  |
| DS08 | dev-synthetic | 10.0s | yes | missing_element (detected) | no | M-N1 missing_element: Missing: identifying documents [valid_observation]; M-N2 missing_element: Missing: status or classification claimed for admission [valid_observation] |
| DS09 | dev-synthetic | 8.3s | yes | none | no |  |
| DS10 | dev-synthetic | 10.1s | yes | missing_element (detected) | no |  |
| DS11 | dev-synthetic | 7.6s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| DS12 | dev-synthetic | 14.7s | yes | citation (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
