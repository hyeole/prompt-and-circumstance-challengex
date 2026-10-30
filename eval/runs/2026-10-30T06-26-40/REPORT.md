# Evaluation run 2026-10-30T06-26-40 (scoring policy v2.3, dataset eval/dev-synthetic)

**Label: targeted check, not an evaluation (dev, build 78f2425).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (3/3) | |
| Detection recall, strict (failures count as missed) | 100% (1/1) | at least 90% |
| Missing elements | 100% (1/1) | |
| Inconsistencies | n/a | |
| Citation errors (mismatch with verified evidence) | n/a | |
| Routing: multi-charge (rule fired) | n/a | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | n/a | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 33% (1/3) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 0% (0/3) | |
| Routed because of an adjudicated real discrepancy in the source | DS06 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 100% (12/12) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 1 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (3/3) | every flag |
| Sentence evidence by match type | exact 1 · partial 0 · unlabelled 1 | |
| Latency p50 / p90 / max (full HTTP review) | 15.7s / 15.8s / 15.8s | under 60s |

Plant outcomes: detected: 1, routed_only: 0, missed: 0, not_completed: 0.

**Partial reviews (a required check did not complete): 0.** none.
Recall over completed reviews only (secondary): 100% (1/1). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 3 = 1 planted + 0 duplicates + 1 adjudicated valid observations + 0 adjudicated false flags + 1 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| DS06 | dev-synthetic | 15.8s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation]; U-ACCOUNT-1 unclear: Account that may conflict with this record (attribution unknown) [unadjudicated] |
| DS07 | dev-synthetic | 15.7s | yes | none | no |  |
| DS10 | dev-synthetic | 11.2s | yes | missing_element (detected) | no |  |
