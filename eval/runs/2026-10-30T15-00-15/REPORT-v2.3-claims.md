# Evaluation run 2026-10-30T15-00-15 (scoring policy v2.3 + claim-aware adjudication layer, dataset eval)

**Label: targeted post-tuning verification (commit d95d075; not overall target achievement).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 78% (7/9) | |
| Detection recall, strict (failures count as missed) | 60% (3/5) | at least 90% |
| Missing elements | 100% (1/1) | |
| Inconsistencies | 0% (0/2) | |
| Citation errors (mismatch with verified evidence) | 100% (1/1) | |
| Routing: multi-charge (rule fired) | 100% (1/1) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | n/a | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 0% (0/13) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 0% (0/5) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C003, C012, C012-M2, C013 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (13/13) | every flag |
| Sentence evidence by match type | exact 1 · partial 0 · unlabelled 10 | |
| Latency p50 / p90 / max (full HTTP review) | 27.3s / 55.0s / 55.0s | under 60s |

Plant outcomes: detected: 3, routed_only: 0, missed: 2, not_completed: 0.

**Partial reviews (a required check did not complete): 2.** C003 (ok, 55s; facts:failed review-1:ok review-2:ok; plants: none); C013 (ok, 55s; facts:failed review-1:cancelled review-2:ok; plants: none).
Recall over completed reviews only (secondary): 60% (3/5). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 13 = 3 planted + 0 duplicates + 10 adjudicated valid observations + 0 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 31.2s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation] |
| C003 | dev | 55.0s | ok | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C012 | dev | 22.6s | yes | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-M2 | dev | 20.4s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-MC | dev | 18.6s | yes | human_review:multi_charge (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-X1 | dev | 15.8s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013 | dev | 55.0s | ok | none | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-CIT | dev | 27.3s | yes | citation (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-X1 | dev | 31.9s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
