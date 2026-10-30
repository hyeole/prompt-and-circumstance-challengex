# Evaluation run 2026-10-30T03-03-23 (scoring policy v2.3, dataset eval/dev-synthetic)

**Label: post-tuning (eval/dev-synthetic, commit e5a47a7).** Internal synthetic evaluation on team-created test variants of adapted public records.
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
| Incorrect flags (false + unadjudicated, excl. duplicates) | 20% (2/10) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 20% (2/10) | |
| Routed because of an adjudicated real discrepancy in the source | none | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 100% (50/50) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 1 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (10/10) | every flag |
| Sentence evidence by match type | exact 4 · partial 0 · unlabelled 2 | |
| Latency p50 / p90 / max (full HTTP review) | 11.8s / 18.9s / 20.1s | under 60s |

Plant outcomes: detected: 6, routed_only: 0, missed: 0, not_completed: 0.

**Partial reviews (a required check did not complete): 0.** none.
Recall over completed reviews only (secondary): 100% (6/6). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 10 = 6 planted + 0 duplicates + 2 adjudicated valid observations + 2 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| DS01 | dev-synthetic | 12.6s | yes | none | no |  |
| DS02 | dev-synthetic | 10.8s | yes | missing_element (detected) | no |  |
| DS03 | dev-synthetic | 11.2s | yes | missing_element (detected) | no |  |
| DS04 | dev-synthetic | 20.1s | yes | none | no |  |
| DS05 | dev-synthetic | 12.3s | yes | inconsistency (detected) | yes |  |
| DS06 | dev-synthetic | 18.9s | yes | none | yes (not expected) | F-ENTRY-DATE inconsistency: Entry date differs from the form [false_flag] |
| DS07 | dev-synthetic | 11.8s | yes | none | no |  |
| DS08 | dev-synthetic | 11.2s | yes | missing_element (detected) | no | M-N2 missing_element: Missing: status or classification claimed for admission [valid_observation] |
| DS09 | dev-synthetic | 10.3s | yes | none | no |  |
| DS10 | dev-synthetic | 10.4s | yes | missing_element (detected) | yes (not expected) | F-HISTORY inconsistency: Immigration record conflicts with the narrative [false_flag] |
| DS11 | dev-synthetic | 6.4s | yes | none | no |  |
| DS12 | dev-synthetic | 14.7s | yes | citation (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
