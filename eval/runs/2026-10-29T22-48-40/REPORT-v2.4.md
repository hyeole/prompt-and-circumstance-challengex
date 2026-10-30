# Evaluation run 2026-10-29T22-48-40 (scoring policy v2.4, dataset eval)

**Label: post-hoc (post-tuning).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 89% (33/37) | |
| Detection recall, strict (failures count as missed) | 84% (26/31) | at least 90% |
| Missing elements | 100% (6/6) | |
| Inconsistencies | 80% (8/10) | |
| Citation errors (mismatch with verified evidence) | 71% (5/7) | |
| Routing: multi-charge (rule fired) | 100% (5/5) | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 67% (2/3) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 9% (3/34) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 13% (2/15) | |
| Routed because of an adjudicated real discrepancy in the source | C001, C001-M3 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (34/34) | every flag |
| Sentence evidence by match type | exact 0 · partial 0 · unlabelled 30 | |
| Latency p50 / p90 / max (full HTTP review) | 22.9s / 55.0s / 55.1s | under 60s |

Plant outcomes: detected: 26, routed_only: 2, missed: 0, not_completed: 3.

**Partial reviews (a required check did not complete): 4.** C013 (failed, 55.1s; n/a; plants: none); C037-AMB (failed, 55s; n/a; plants: human_review:ambiguity=not_completed, inconsistency=not_completed); C037-CIT (failed, 55s; n/a; plants: citation=detected); C037-X1 (failed, 55s; n/a; plants: inconsistency=not_completed).
Recall over completed reviews only (secondary): 93% (25/27). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 34 = 26 planted + 0 duplicates + 5 adjudicated valid observations + 3 adjudicated false flags + 0 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001 | dev | 7.5s | yes | none | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-CIT | dev | 14.9s | yes | citation (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-M3 | dev | 13.0s | yes | missing_element (detected) | yes (not expected) | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-MC | dev | 11.8s | yes | human_review:multi_charge (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C001-X1 | dev | 10.9s | yes | inconsistency (detected) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C003 | dev | 19.0s | yes | none | no |  |
| C003-AMB | dev | 7.2s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C003-CIT | dev | 53.8s | yes | citation (detected) | yes | M-E6 missing_element: Missing: basis for the immigration violation [false_flag] |
| C003-M3 | dev | 27.8s | yes | missing_element (detected) | yes (not expected) |  |
| C012 | dev | 34.0s | yes | none | no |  |
| C012-M2 | dev | 35.7s | yes | missing_element (detected) | no |  |
| C012-MC | dev | 10.5s | yes | human_review:multi_charge (detected) | yes |  |
| C012-X1 | dev | 29.5s | yes | inconsistency (detected) | yes |  |
| C013 | dev | 55.1s | failed | none | yes (not expected) |  |
| C013-CIT | dev | 33.7s | yes | citation (routed_only) | yes | F-ENTRY-MANNER inconsistency: Conflicting accounts of how the subject entered [false_flag] |
| C013-X1 | dev | 26.3s | yes | inconsistency (detected) | yes |  |
| C021 | heldout | 55.0s | yes | none | no |  |
| C021-CIT | heldout | 17.8s | yes | citation (detected) | yes | F-ENTRY-DATE inconsistency: Entry date differs from the form [false_flag] |
| C021-MC | heldout | 55.0s | yes | human_review:multi_charge (detected) | yes |  |
| C021-X1 | heldout | 19.4s | yes | inconsistency (detected) | yes |  |
| C037 | heldout | 31.3s | yes | none | no |  |
| C037-AMB | heldout | 55.0s | failed | human_review:ambiguity (not_completed), inconsistency (not_completed) | yes |  |
| C037-CIT | heldout | 55.0s | failed | citation (detected) | yes |  |
| C037-M3 | heldout | 55.0s | yes | missing_element (detected) | no |  |
| C037-X1 | heldout | 55.0s | failed | inconsistency (not_completed) | yes |  |
| C045 | heldout | 27.4s | yes | none | no |  |
| C045-CIT | heldout | 11.2s | yes | citation (detected) | yes |  |
| C045-MC | heldout | 25.5s | yes | human_review:multi_charge (detected) | yes |  |
| C045-X1 | heldout | 16.2s | yes | inconsistency (detected) | yes |  |
| C119 | heldout | 11.8s | yes | none | no |  |
| C119-AMB | heldout | 19.9s | yes | human_review:ambiguity (detected), inconsistency (detected) | yes |  |
| C119-CIT | heldout | 22.5s | yes | citation (routed_only) | yes |  |
| C119-X1 | heldout | 12.0s | yes | inconsistency (detected) | yes |  |
| C135 | heldout | 23.8s | yes | none | no |  |
| C135-M2 | heldout | 7.4s | yes | missing_element (detected) | no |  |
| C135-M3 | heldout | 22.9s | yes | missing_element (detected) | no |  |
| C135-MC | heldout | 8.9s | yes | human_review:multi_charge (detected) | yes |  |
