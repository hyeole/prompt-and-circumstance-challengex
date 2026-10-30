# Evaluation run 2026-10-29T23-32-42 (scoring policy v2.3, dataset eval)

**Label: post-tuning, shipped code (commit 8c0b474).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 97% (36/37) | |
| Detection recall, strict (failures count as missed) | 94% (29/31) | at least 90% |
| Missing elements | 83% (5/6) | |
| Inconsistencies | 100% (10/10) | |
| Citation errors (mismatch with verified evidence) | 86% (6/7) | |
| Routing: multi-charge (rule fired) | 100% (5/5) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (3/3) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 12% (5/41) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 20% (3/15) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3, C003, C003-M3 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (41/41) | every flag |
| Sentence evidence by match type | exact 23 · partial 2 · unlabelled 13 | |
| Latency p50 / p90 / max (full HTTP review) | 18.0s / 47.2s / 55.0s | under 60s |

Plant outcomes: detected: 29, routed_only: 1, missed: 1, not_completed: 0.

**Partial reviews (a required check did not complete): 1.** C003 (ok, 17.3s; facts:ok review-1:cancelled review-2:ok; plants: none).
Recall over completed reviews only (secondary): 94% (29/31). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 41 = 26 planted + 0 duplicates + 10 adjudicated valid observations + 5 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 9.4s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-CIT | dev | 20.3s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-M3 | dev | 35.4s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-MC | dev | 22.6s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-X1 | dev | 18.8s | yes | inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003 | dev | 17.3s | ok | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-AMB | dev | 46.1s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003-CIT | dev | 12.7s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-E6 missing_element: Missing: basis for the immigration violation [false_flag] |
| C003-M3 | dev | 27.8s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; I-1 inconsistency: Encounter time discrepancy [valid_observation] |
| C012 | dev | 47.2s | yes | none | no |  |
| C012-M2 | dev | 55.0s | yes | missing_element (detected) | no |  |
| C012-MC | dev | 16.6s | yes | human_review:multi_charge (detected) | yes |  |
| C012-X1 | dev | 35.1s | yes | inconsistency (detected) | yes |  |
| C013 | dev | 22.5s | yes | none | yes (not expected) | I-1 inconsistency: Entry facts mismatch [false_flag] |
| C013-CIT | dev | 50.4s | yes | citation (detected) | yes |  |
| C013-X1 | dev | 55.0s | yes | inconsistency (detected) | yes |  |
| C021 | heldout | 18.8s | yes | none | yes (not expected) | F-ENTRY-DATE inconsistency: Entry date differs from the form [false_flag] |
| C021-CIT | heldout | 10.3s | yes | citation (detected) | yes | F-ENTRY-DATE inconsistency: Entry date differs from the form [false_flag] |
| C021-MC | heldout | 18.0s | yes | human_review:multi_charge (detected) | yes | F-ENTRY-DATE inconsistency: Entry date differs from the form [false_flag] |
| C021-X1 | heldout | 18.2s | yes | inconsistency (detected) | yes |  |
| C037 | heldout | 13.3s | yes | none | no |  |
| C037-AMB | heldout | 6.1s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C037-CIT | heldout | 39.0s | yes | citation (detected) | yes |  |
| C037-M3 | heldout | 44.4s | yes | missing_element (detected) | no |  |
| C037-X1 | heldout | 17.4s | yes | inconsistency (detected) | yes |  |
| C045 | heldout | 15.7s | yes | none | no |  |
| C045-CIT | heldout | 16.1s | yes | citation (detected) | yes |  |
| C045-MC | heldout | 18.4s | yes | human_review:multi_charge (detected) | yes |  |
| C045-X1 | heldout | 12.3s | yes | inconsistency (detected) | yes |  |
| C119 | heldout | 13.5s | yes | none | no |  |
| C119-AMB | heldout | 31.3s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C119-CIT | heldout | 9.5s | yes | citation (routed_only) | yes |  |
| C119-X1 | heldout | 13.7s | yes | inconsistency (detected) | yes |  |
| C135 | heldout | 14.4s | yes | none | no |  |
| C135-M2 | heldout | 16.4s | yes | missing_element (detected) | yes (not expected) |  |
| C135-M3 | heldout | 10.5s | yes | missing_element (missed) | no |  |
| C135-MC | heldout | 11.2s | yes | human_review:multi_charge (detected) | yes |  |
