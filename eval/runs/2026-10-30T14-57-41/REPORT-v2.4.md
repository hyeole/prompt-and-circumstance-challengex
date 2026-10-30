# Evaluation run 2026-10-30T14-57-41 (scoring policy v2.4, dataset eval/dev-synthetic)

**Label: targeted post-tuning verification (commit d95d075; not overall target achievement).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (2/2) | |
| Detection recall, strict (failures count as missed) | 100% (1/1) | at least 90% |
| Missing elements | n/a | |
| Inconsistencies | n/a | |
| Citation errors (mismatch with verified evidence) | 100% (1/1) | |
| Routing: multi-charge (rule fired) | n/a | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | n/a | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 0% (0/3) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 0% (0/1) | |
| Routed because of an adjudicated real discrepancy in the source | DS06 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 100% (6/6) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (3/3) | every flag |
| Sentence evidence by match type | exact 1 · partial 0 · unlabelled 1 | |
| Latency p50 / p90 / max (full HTTP review) | 16.8s / 16.8s / 16.8s | under 60s |

Plant outcomes: detected: 1, routed_only: 0, missed: 0, not_completed: 0.

**Partial reviews (a required check did not complete): 0.** none.
Recall over completed reviews only (secondary): 100% (1/1). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 3 = 1 planted + 0 duplicates + 2 adjudicated valid observations + 0 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| DS06 | dev-synthetic | 16.8s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| DS12 | dev-synthetic | 12.6s | yes | citation (detected) | yes | M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
