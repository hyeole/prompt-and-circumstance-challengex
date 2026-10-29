# Evaluation run 2026-10-29T22-28-28

**Internal synthetic evaluation.** Test variants and expected findings were created by the team from adapted public records.
They are not Unissant's test set. References are provisional (see config/references.json).

| Measure | Result | Deck target |
|---|---|---|
| Detection recall, all planted issues | 89% (16/18) | at least 90% |
| Recall, dev split | n/a | |
| Recall, held-out split | 89% (16/18) | |
| Missing elements | 33% (1/3) | |
| Inconsistencies | 100% (6/6) | |
| Citation errors | 100% (4/4) | |
| Human-review routing (ambiguous or multi-charge) | 100% (5/5) | 100% |
| Incorrect flags among issued flags (variants, conservative) | 24% (4/17) | at most 10% |
| Evidence references valid | 100% (18/18) | every flag |
| Latency p50 / p90 / max | 22.0s / 35.9s / 55.0s | under 60s |
| Reviews over 60s / failed | 0 / 0 | |

Cases: 21 (16 variants, 5 unmodified bases). Model failures: none.

## Per case

| Case | Split | Time | Planted | Detected | Citation | Human review | Unexpected flags |
|---|---|---|---|---|---|---|---|
| C021 | heldout | 17.2s | none | n/a | consistent | yes | F-ENTRY-DATE inconsistency: Entry date differs from the form |
| C021-CIT | heldout | 19.6s | citation | 1/1 | likely_mismatch | yes | I-1 inconsistency: Encounter date mismatch |
| C021-MC | heldout | 42.2s | human_review | 1/1 | needs_human_review | yes | F-HISTORY inconsistency: Immigration record conflicts with the narrative |
| C021-X1 | heldout | 18.1s | inconsistency | 1/1 | likely_mismatch | yes | C-1 citation: Possible citation mismatch: INA 237(a)(1)(B) |
| C037 | heldout | 35.9s | none | n/a | consistent | no |  |
| C037-AMB | heldout | 11.1s | human_review, inconsistency | 2/2 | consistent | yes |  |
| C037-CIT | heldout | 19.3s | citation | 1/1 | likely_mismatch | yes |  |
| C037-M3 | heldout | 20.4s | missing_element | 0/1 | consistent | no |  |
| C037-X1 | heldout | 30.4s | inconsistency | 1/1 | consistent | yes |  |
| C045 | heldout | 55.0s | none | n/a | consistent | no |  |
| C045-CIT | heldout | 22.0s | citation | 1/1 | likely_mismatch | yes |  |
| C045-MC | heldout | 11.5s | human_review | 1/1 | needs_human_review | yes |  |
| C045-X1 | heldout | 35.4s | inconsistency | 1/1 | consistent | yes | I-2 inconsistency: Entry place mismatch |
| C119 | heldout | 34.1s | none | n/a | consistent | no |  |
| C119-AMB | heldout | 28.3s | human_review, inconsistency | 2/2 | consistent | yes |  |
| C119-CIT | heldout | 12.6s | citation | 1/1 | needs_human_review | yes |  |
| C119-X1 | heldout | 28.1s | inconsistency | 1/1 | consistent | yes |  |
| C135 | heldout | 28.8s | none | n/a | consistent | no |  |
| C135-M2 | heldout | 34.8s | missing_element | 1/1 | consistent | no |  |
| C135-M3 | heldout | 18.8s | missing_element | 0/1 | consistent | no |  |
| C135-MC | heldout | 5.7s | human_review | 1/1 | needs_human_review | yes |  |

Unexpected flags on unmodified bases are unadjudicated observations: the public records are not an answer key.
