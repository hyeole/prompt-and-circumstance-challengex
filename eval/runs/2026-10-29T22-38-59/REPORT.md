# Evaluation run 2026-10-29T22-38-59

**Internal synthetic evaluation.** Test variants and expected findings were created by the team from adapted public records.
They are not Unissant's test set. References are provisional (see config/references.json).

| Measure | Result | Deck target |
|---|---|---|
| Detection recall, all planted issues | 72% (13/18) | at least 90% |
| Recall, dev split | n/a | |
| Recall, held-out split | 72% (13/18) | |
| Missing elements | 67% (2/3) | |
| Inconsistencies | 83% (5/6) | |
| Citation errors | 25% (1/4) | |
| Human-review routing (ambiguous or multi-charge) | 100% (5/5) | 100% |
| Incorrect flags among issued flags (variants, conservative) | 0% (0/11) | at most 10% |
| Evidence references valid | 100% (11/11) | every flag |
| Latency p50 / p90 / max | 18.1s / 53.2s / 55.1s | under 60s |
| Reviews over 60s / failed | 0 / 0 | |

Cases: 21 (16 variants, 5 unmodified bases). Model failures: C037-CIT.

## Per case

| Case | Split | Time | Planted | Detected | Citation | Human review | Unexpected flags |
|---|---|---|---|---|---|---|---|
| C021 | heldout | 10.5s | none | n/a | consistent | no |  |
| C021-CIT | heldout | 55.1s | citation | 0/1 | consistent | no |  |
| C021-MC | heldout | 53.2s | human_review | 1/1 | needs_human_review | yes |  |
| C021-X1 | heldout | 13.6s | inconsistency | 1/1 | consistent | yes |  |
| C037 | heldout | 20.7s | none | n/a | consistent | no |  |
| C037-AMB | heldout | 18.0s | human_review, inconsistency | 2/2 | consistent | yes |  |
| C037-CIT | heldout | 55.0s | citation | 0/1 | not_checked | yes |  |
| C037-M3 | heldout | 8.5s | missing_element | 0/1 | consistent | no |  |
| C037-X1 | heldout | 18.3s | inconsistency | 1/1 | consistent | yes |  |
| C045 | heldout | 8.6s | none | n/a | consistent | no |  |
| C045-CIT | heldout | 24.9s | citation | 1/1 | likely_mismatch | yes |  |
| C045-MC | heldout | 47.7s | human_review | 1/1 | needs_human_review | yes |  |
| C045-X1 | heldout | 27.7s | inconsistency | 0/1 | consistent | no |  |
| C119 | heldout | 21.8s | none | n/a | consistent | no |  |
| C119-AMB | heldout | 9.4s | human_review, inconsistency | 2/2 | consistent | yes |  |
| C119-CIT | heldout | 12.0s | citation | 0/1 | consistent | no |  |
| C119-X1 | heldout | 10.3s | inconsistency | 1/1 | consistent | yes |  |
| C135 | heldout | 11.2s | none | n/a | consistent | no |  |
| C135-M2 | heldout | 32.3s | missing_element | 1/1 | consistent | no |  |
| C135-M3 | heldout | 9.2s | missing_element | 1/1 | consistent | no |  |
| C135-MC | heldout | 18.1s | human_review | 1/1 | needs_human_review | yes |  |

Unexpected flags on unmodified bases are unadjudicated observations: the public records are not an answer key.
