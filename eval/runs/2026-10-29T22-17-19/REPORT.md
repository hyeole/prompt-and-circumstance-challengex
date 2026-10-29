# Evaluation run 2026-10-29T22-17-19

**Internal synthetic evaluation.** Test variants and expected findings were created by the team from adapted public records.
They are not Unissant's test set. References are provisional (see config/references.json).

| Measure | Result | Deck target |
|---|---|---|
| Detection recall, all planted issues | 85% (11/13) | at least 90% |
| Recall, dev split | 85% (11/13) | |
| Recall, held-out split | n/a | |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 75% (3/4) | |
| Citation errors | 67% (2/3) | |
| Human-review routing (ambiguous or multi-charge) | 100% (3/3) | 100% |
| Incorrect flags among issued flags (variants, conservative) | 9% (1/11) | at most 10% |
| Evidence references valid | 100% (16/16) | every flag |
| Latency p50 / p90 / max | 11.6s / 25.2s / 55.0s | under 60s |
| Reviews over 60s / failed | 0 / 0 | |

Cases: 16 (12 variants, 4 unmodified bases). Model failures: none.

## Per case

| Case | Split | Time | Planted | Detected | Citation | Human review | Unexpected flags |
|---|---|---|---|---|---|---|---|
| C001 | dev | 8.4s | none | n/a | consistent | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative |
| C001-CIT | dev | 8.1s | citation | 1/1 | likely_mismatch | yes |  |
| C001-M3 | dev | 9.2s | missing_element | 1/1 | insufficient_information | yes |  |
| C001-MC | dev | 9.1s | human_review | 1/1 | needs_human_review | yes |  |
| C001-X1 | dev | 14.6s | inconsistency | 1/1 | consistent | yes |  |
| C003 | dev | 9.0s | none | n/a | consistent | no |  |
| C003-AMB | dev | 13.4s | human_review, inconsistency | 2/2 | needs_human_review | yes |  |
| C003-CIT | dev | 13.1s | citation | 0/1 | insufficient_information | no |  |
| C003-M3 | dev | 55.0s | missing_element | 1/1 | consistent | no |  |
| C012 | dev | 10.1s | none | n/a | consistent | no |  |
| C012-M2 | dev | 11.0s | missing_element | 1/1 | consistent | no |  |
| C012-MC | dev | 23.9s | human_review | 1/1 | needs_human_review | yes | I-1 inconsistency: Entry date conflict |
| C012-X1 | dev | 10.7s | inconsistency | 0/1 | consistent | no |  |
| C013 | dev | 25.2s | none | n/a | consistent | no |  |
| C013-CIT | dev | 17.9s | citation | 1/1 | likely_mismatch | yes |  |
| C013-X1 | dev | 11.6s | inconsistency | 1/1 | consistent | yes |  |

Unexpected flags on unmodified bases are unadjudicated observations: the public records are not an answer key.
