# Evaluation run 2026-10-30T22-09-01 (scoring policy v2.4, dataset eval/gen-v1)

**Label: round-3 measured evaluation on gen-v1, post-tuning (frozen rc-round3 = 4cf02c3); team-authored, locked before round 2, NOT independently held out.** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 83% (10/12) | |
| Detection recall, strict (failures count as missed) | 86% (6/7) | at least 90% |
| Missing elements | 0% (0/1) | |
| Inconsistencies | 100% (3/3) | |
| Citation errors (mismatch with verified evidence) | 100% (1/1) | |
| Routing: multi-charge (rule fired) | 100% (1/1) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (1/1) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 0% (0/8) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 33% (2/6) | |
| Routed because of an adjudicated real discrepancy in the source | G08, G10 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (8/8) | every flag |
| Sentence evidence by match type | exact 7 · partial 0 · unlabelled 0 | |
| Latency p50 / p90 / max (full HTTP review) | 29.9s / 55.0s / 55.1s | under 60s |

Plant outcomes: detected: 6, routed_only: 0, missed: 1, not_completed: 0.

**Partial reviews (a required check did not complete): 2.** G01 (ok, 55.1s; facts:failed review-1:ok review-2:cancelled; plants: none); G10 (ok, 55s; facts:failed review-1:ok review-2:cancelled; plants: none).
Recall over completed reviews only (secondary): 86% (6/7). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 8 = 6 planted + 0 duplicates + 2 adjudicated valid observations + 0 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| G01 | gen-v1 | 55.1s | ok | none | yes (not expected) |  |
| G02 | gen-v1 | 13.7s | yes | none | no |  |
| G03 | gen-v1 | 47.0s | yes | inconsistency (detected) | yes |  |
| G04 | gen-v1 | 17.1s | yes | inconsistency (detected) | yes |  |
| G05 | gen-v1 | 21.1s | yes | inconsistency (detected) | yes |  |
| G06 | gen-v1 | 36.0s | yes | human_review:ambiguity (detected) | yes |  |
| G07 | gen-v1 | 20.6s | yes | none | no |  |
| G08 | gen-v1 | 49.0s | yes | none | yes (not expected) | I-1 inconsistency: Encounter location mismatch [valid_observation] |
| G09 | gen-v1 | 25.4s | yes | missing_element (missed) | yes (not expected) |  |
| G10 | gen-v1 | 55.0s | ok | none | yes (not expected) | F-HISTORY-3 unclear: Prior immigration encounters described while the record is NEGATIVE [valid_observation] |
| G11 | gen-v1 | 26.9s | yes | citation (detected) | yes |  |
| G12 | gen-v1 | 29.9s | yes | human_review:multi_charge (detected) | yes |  |
