# Evaluation run 2026-10-29T22-25-33

**Internal synthetic evaluation.** Test variants and expected findings were created by the team from adapted public records.
They are not Unissant's test set. References are provisional (see config/references.json).

| Measure | Result | Deck target |
|---|---|---|
| Detection recall, all planted issues | 100% (13/13) | at least 90% |
| Recall, dev split | 100% (13/13) | |
| Recall, held-out split | n/a | |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 100% (4/4) | |
| Citation errors | 100% (3/3) | |
| Human-review routing (ambiguous or multi-charge) | 100% (3/3) | 100% |
| Incorrect flags among issued flags (variants, conservative) | 14% (2/14) | at most 10% |
| Evidence references valid | 100% (19/19) | every flag |
| Latency p50 / p90 / max | 17.4s / 28.0s / 36.0s | under 60s |
| Reviews over 60s / failed | 0 / 0 | |

Cases: 16 (12 variants, 4 unmodified bases). Model failures: none.

## Per case

| Case | Split | Time | Planted | Detected | Citation | Human review | Unexpected flags |
|---|---|---|---|---|---|---|---|
| C001 | dev | 15.7s | none | n/a | consistent | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative |
| C001-CIT | dev | 15.1s | citation | 1/1 | likely_mismatch | yes |  |
| C001-M3 | dev | 25.8s | missing_element | 1/1 | consistent | yes |  |
| C001-MC | dev | 16.8s | human_review | 1/1 | needs_human_review | yes |  |
| C001-X1 | dev | 12.8s | inconsistency | 1/1 | consistent | yes |  |
| C003 | dev | 22.8s | none | n/a | consistent | yes |  |
| C003-AMB | dev | 11.9s | human_review, inconsistency | 2/2 | consistent | yes |  |
| C003-CIT | dev | 17.4s | citation | 1/1 | likely_mismatch | yes | U-E6 unclear: Unclear: basis for the immigration violation |
| C003-M3 | dev | 18.5s | missing_element | 1/1 | consistent | no |  |
| C012 | dev | 9.4s | none | n/a | consistent | no |  |
| C012-M2 | dev | 10.9s | missing_element | 1/1 | consistent | no |  |
| C012-MC | dev | 10.2s | human_review | 1/1 | needs_human_review | yes |  |
| C012-X1 | dev | 23.5s | inconsistency | 1/1 | consistent | yes |  |
| C013 | dev | 22.6s | none | n/a | consistent | no |  |
| C013-CIT | dev | 36.0s | citation | 1/1 | likely_mismatch | yes |  |
| C013-X1 | dev | 28.0s | inconsistency | 1/1 | consistent | yes | I-1 inconsistency: Entry facts mismatch |

Unexpected flags on unmodified bases are unadjudicated observations: the public records are not an answer key.
