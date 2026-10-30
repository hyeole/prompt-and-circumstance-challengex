# Evaluation run 2026-10-30T14-58-11 (scoring policy v2.3, dataset eval/fresh)

**Label: targeted post-tuning verification (commit d95d075; not overall target achievement).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (5/5) | |
| Detection recall, strict (failures count as missed) | 0% (0/3) | at least 90% |
| Missing elements | n/a | |
| Inconsistencies | 0% (0/2) | |
| Citation errors (mismatch with verified evidence) | n/a | |
| Routing: multi-charge (rule fired) | n/a | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 0% (0/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 0% (0/2) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 67% (2/3) | |
| Routed because of an adjudicated real discrepancy in the source | FS10 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | 100% (3/3) | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (2/2) | every flag |
| Sentence evidence by match type | exact 0 · partial 0 · unlabelled 1 | |
| Latency p50 / p90 / max (full HTTP review) | 28.0s / 30.5s / 30.5s | under 60s |

Plant outcomes: detected: 0, routed_only: 1, missed: 2, not_completed: 0.

**Partial reviews (a required check did not complete): 0.** none.
Recall over completed reviews only (secondary): 0% (0/3). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 2 = 0 planted + 0 duplicates + 2 adjudicated valid observations + 0 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| F036 | fresh | 29.8s | yes | none | yes (not expected) |  |
| F055 | fresh | 30.5s | yes | none | yes (not expected) |  |
| F055-A | fresh | 28.0s | yes | human_review:ambiguity (routed_only), inconsistency (missed) | yes |  |
| F055-H | fresh | 26.4s | yes | inconsistency (missed) | yes | F-HISTORY-2 unclear: Prior removal on the form is not described in the narrative [valid_observation] |
| FS10 | fresh | 9.1s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
