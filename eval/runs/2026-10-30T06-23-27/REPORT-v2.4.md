# Evaluation run 2026-10-30T06-23-27 (scoring policy v2.4, dataset eval)

**Label: targeted check, not an evaluation (legacy, build 78f2425).** Internal synthetic evaluation on team-created test variants of adapted public records.
Not Unissant's test set. References are provisional.

| Measure | Result | Deck target |
|---|---|---|
| Review completion (model check finished) | 100% (10/10) | |
| Detection recall, strict (failures count as missed) | 40% (4/10) | at least 90% |
| Missing elements | 100% (1/1) | |
| Inconsistencies | 17% (1/6) | |
| Citation errors (mismatch with verified evidence) | 0% (0/1) | |
| Routing: multi-charge (rule fired) | n/a | 100% |
| Routing: planted ambiguity (reason cites the planted statement) | 100% (2/2) | 100% |
| Incorrect flags (false + unadjudicated, excl. duplicates) | 32% (6/19) | at most 10% |
| Unnecessary human-review routing (no planted reason and no adjudicated real discrepancy) | 0% (0/3) | |
| Routed because of an adjudicated real discrepancy in the source | C012-M2 | |
| Checklist expectations met (status per item, incl. not applicable / applicability unclear) | n/a | |
| "Should not flag" violations (resolved explanations, unattributable statements) | 0 | 0 |
| Evidence references valid (quote = source text at offsets) | 100% (23/23) | every flag |
| Sentence evidence by match type | exact 13 · partial 0 · unlabelled 9 | |
| Latency p50 / p90 / max (full HTTP review) | 17.8s / 31.3s / 31.3s | under 60s |

Plant outcomes: detected: 4, routed_only: 1, missed: 5, not_completed: 0.

**Partial reviews (a required check did not complete): 0.** none.
Recall over completed reviews only (secondary): 40% (4/10). "routed_only" means the case went to a person without the specific issue being identified; it is not counted as detected.
Flags issued: 23 = 4 planted + 4 duplicates + 9 adjudicated valid observations + 0 adjudicated false flags + 6 unadjudicated.

## Per case

| Case | Split | Time | Completed | Plants (outcome) | Human review | Non-planted flags |
|---|---|---|---|---|---|---|
| C001-X1 | dev | 16.2s | yes | inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation]; M-N5 missing_element: Missing: specific ground stated and explained [valid_observation]; U-ACCOUNT-1 unclear: Account that may conflict with this record (attribution unknown) [unadjudicated]; U-ACCOUNT-2 unclear: Account that may conflict with this record (attribution unknown) [unadjudicated] |
| C003-AMB | dev | 12.8s | yes | human_review:ambiguity (detected), inconsistency (missed) | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative [valid_observation] |
| C012-M2 | dev | 20.0s | yes | missing_element (detected) | yes (not expected) | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C012-X1 | dev | 16.6s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C013-X1 | dev | 29.8s | yes | inconsistency (detected) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; U-ACCOUNT-2 unclear: Account that may conflict with this record (attribution unknown) [duplicate]; U-ACCOUNT-3 unclear: Account that may conflict with this record (attribution unknown) [duplicate]; U-ACCOUNT-4 unclear: Account that may conflict with this record (attribution unknown) [duplicate]; U-ACCOUNT-5 unclear: Account that may conflict with this record (attribution unknown) [duplicate]; U-ACCOUNT-6 unclear: Account that may conflict with this record (attribution unknown) [unadjudicated]; U-ACCOUNT-7 unclear: Account that may conflict with this record (attribution unknown) [unadjudicated] |
| C037 | heldout | 17.8s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045 | heldout | 14.2s | yes | none | no | U-N1 unclear: Unclear: identifying documents [valid_observation] |
| C045-X1 | heldout | 18.3s | yes | inconsistency (missed) | yes | U-N1 unclear: Unclear: identifying documents [valid_observation]; U-ACCOUNT-1 unclear: Account that may conflict with this record (attribution unknown) [unadjudicated]; U-ACCOUNT-2 unclear: Account that may conflict with this record (attribution unknown) [unadjudicated] |
| C119-AMB | heldout | 31.3s | yes | human_review:ambiguity (detected), inconsistency (missed) | yes |  |
| C119-CIT | heldout | 15.4s | yes | citation (routed_only) | yes |  |
