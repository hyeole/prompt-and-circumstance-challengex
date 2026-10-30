# Evaluation run 2026-10-30T02-40-21 (scoring policy v2.3, dataset eval/dev-synthetic)

**Label: dev-synthetic development run (commit a5ba61b).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (12/12) | |
| Detection recall, strict (failures count as missed) | 67% (4/6) | at least 90% |
| Missing elements | 50% (2/4) | |
| Inconsistencies | 100% (1/1) | |
| Citation errors (mismatch with verified evidence) | 100% (1/1) | |
| Routing: multi-charge (rule fired) | n/a | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | n/a | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 25% (2/8) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 20% (2/10) | |
| Routed because of an adjudicated real discrepancy in the source | none | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 100% (50/50) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 1 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (8/8) | every flag |
| Sentence evidence by match type | exact 4 · partial 0 · unlabelled 0 | |
| Latency p50 / p90 / max (full HTTP review) | 13.9s / 17.7s / 17.9s | under 60s |

Plant outcomes: detected: 4, routed_only: 0, missed: 2, not_completed: 0.

**Partial reviews (a required check did not complete): 0.** none.
Recall over completed reviews only (secondary): 67% (4/6). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 8 = 4 planted + 0 duplicates + 2 adjudicated valid observations + 2 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| DS01 | dev-synthetic | 12.8s | yes | none | no |  |
| DS02 | dev-synthetic | 8.5s | yes | missing_element (detected) | no |  |
| DS03 | dev-synthetic | 15.2s | yes | missing_element (detected) | no |  |
| DS04 | dev-synthetic | 17.7s | yes | none | no |  |
| DS05 | dev-synthetic | 12.4s | yes | inconsistency (detected) | yes |  |
| DS06 | dev-synthetic | 17.9s | yes | none | yes (not expected) | F-ENTRY-DATE inconsistency: Entry date differs from the form [false_flag] |
| DS07 | dev-synthetic | 13.9s | yes | none | no |  |
| DS08 | dev-synthetic | 13.4s | yes | missing_element (missed) | no | M-N2 missing_element: Missing: status or classification claimed for admission [valid_observation] |
| DS09 | dev-synthetic | 9.7s | yes | none | no |  |
| DS10 | dev-synthetic | 16.2s | yes | missing_element (missed) | yes (not expected) | C-1 citation: Possible citation mismatch: INA 212(a)(7)(A)(i)(I) [false_flag] |
| DS11 | dev-synthetic | 8.6s | yes | none | no |  |
| DS12 | dev-synthetic | 13.9s | yes | citation (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
