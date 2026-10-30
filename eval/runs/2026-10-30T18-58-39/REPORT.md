# Evaluation run 2026-10-30T18-58-39 (scoring policy v2.4, dataset eval/gen-v1)

**Label: round-2 planned evaluation, post-tuning (frozen rc-round2 = 1b5f59b; not held-out); gen-v1 team-authored, locked before this run, not independently held out.** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 92% (11/12) | |
| Detection recall, strict (failures count as missed) | 71% (5/7) | at least 90% |
| Missing elements | 0% (0/1) | |
| Inconsistencies | 100% (3/3) | |
| Citation errors (mismatch with verified evidence) | 100% (1/1) | |
| Routing: multi-charge (rule fired) | 100% (1/1) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 0% (0/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 0% (0/7) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 17% (1/6) | |
| Routed because of an adjudicated real discrepancy in the source | G08, G10 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (7/7) | every flag |
| Sentence evidence by match type | exact 6 · partial 0 · unlabelled 0 | |
| Latency p50 / p90 / max (full HTTP review) | 20.9s / 25.3s / 31.8s | under 60s |

Plant outcomes: detected: 5, routed_only: 1, missed: 0, not_completed: 1.

**Partial reviews (a required check did not complete): 1.** G09 (ok, 13.6s; facts:ok review-1:ok review-2:ok; plants: missing_element=not_completed).
Recall over completed reviews only (secondary): 83% (5/6). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 7 = 5 planted + 0 duplicates + 2 adjudicated valid observations + 0 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| G01 | gen-v1 | 10.9s | yes | none | no |  |
| G02 | gen-v1 | 12.9s | yes | none | no |  |
| G03 | gen-v1 | 31.8s | yes | inconsistency (detected) | yes |  |
| G04 | gen-v1 | 22.6s | yes | inconsistency (detected) | yes |  |
| G05 | gen-v1 | 25.3s | yes | inconsistency (detected) | yes |  |
| G06 | gen-v1 | 24.9s | yes | human_review:ambiguity (routed_only) | yes |  |
| G07 | gen-v1 | 15.1s | yes | none | no |  |
| G08 | gen-v1 | 20.5s | yes | none | yes (not expected) | I-1 inconsistency: Encounter location mismatch [valid_observation] |
| G09 | gen-v1 | 13.6s | ok | missing_element (not_completed) | yes (not expected) |  |
| G10 | gen-v1 | 18.1s | yes | none | yes (not expected) | F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| G11 | gen-v1 | 23.2s | yes | citation (detected) | yes |  |
| G12 | gen-v1 | 20.9s | yes | human_review:multi_charge (detected) | yes |  |
