# Evaluation run 2026-10-29T22-13-53

**Internal synthetic evaluation.** Test variants and expected findings were created by the team from adapted public records.
They are not Unissant's test set. References are provisional (see config/references.json).

| Measure | Result | Deck target |
|---|---|---|
| Detection recall, all planted issues | 77% (10/13) | at least 90% |
| Recall, dev split | 77% (10/13) | |
| Recall, held-out split | n/a | |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 25% (1/4) | |
| Citation errors | 100% (3/3) | |
| Human-review routing (ambiguous or multi-charge) | 100% (3/3) | 100% |
| Incorrect flags among issued flags (variants, conservative) | 18% (2/11) | at most 10% |
| Evidence references valid | 100% (17/17) | every flag |
| Latency p50 / p90 / max | 9.2s / 21.0s / 55.0s | under 60s |
| Reviews over 60s / failed | 0 / 0 | |

Cases: 16 (12 variants, 4 unmodified bases). Model failures: none.

## Per case

| Case | Split | Time | Planted | Detected | Citation | Human review | Unexpected flags |
|---|---|---|---|---|---|---|---|
| C001 | dev | 8.9s | none | n/a | consistent | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative |
| C001-CIT | dev | 9.7s | citation | 1/1 | likely_mismatch | yes |  |
| C001-M3 | dev | 9.0s | missing_element | 1/1 | insufficient_information | yes |  |
| C001-MC | dev | 7.4s | human_review | 1/1 | needs_human_review | yes |  |
| C001-X1 | dev | 8.3s | inconsistency | 0/1 | consistent | yes |  |
| C003 | dev | 9.2s | none | n/a | consistent | no |  |
| C003-AMB | dev | 20.3s | human_review, inconsistency | 2/2 | likely_mismatch | yes | C-1 citation: Possible citation mismatch: INA 212(a)(6)(A)(i) |
| C003-CIT | dev | 12.6s | citation | 1/1 | likely_mismatch | yes |  |
| C003-M3 | dev | 55.0s | missing_element | 1/1 | consistent | no |  |
| C012 | dev | 8.9s | none | n/a | consistent | no |  |
| C012-M2 | dev | 10.2s | missing_element | 1/1 | consistent | no |  |
| C012-MC | dev | 21.0s | human_review | 1/1 | needs_human_review | yes | I-1 inconsistency: Entry date mismatch |
| C012-X1 | dev | 6.4s | inconsistency | 0/1 | consistent | no |  |
| C013 | dev | 7.4s | none | n/a | consistent | no |  |
| C013-CIT | dev | 10.4s | citation | 1/1 | likely_mismatch | yes |  |
| C013-X1 | dev | 8.4s | inconsistency | 0/1 | consistent | no |  |

Unexpected flags on unmodified bases are unadjudicated observations: the public records are not an answer key.
