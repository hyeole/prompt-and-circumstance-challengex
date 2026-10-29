# Evaluation run 2026-10-29T22-34-04

**Internal synthetic evaluation.** Test variants and expected findings were created by the team from adapted public records.
They are not Unissant's test set. References are provisional (see config/references.json).

| Measure | Result | Deck target |
|---|---|---|
| Detection recall, all planted issues | 92% (12/13) | at least 90% |
| Recall, dev split | 92% (12/13) | |
| Recall, held-out split | n/a | |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 75% (3/4) | |
| Citation errors | 100% (3/3) | |
| Human-review routing (ambiguous or multi-charge) | 100% (3/3) | 100% |
| Incorrect flags among issued flags (variants, conservative) | 0% (0/9) | at most 10% |
| Evidence references valid | 100% (15/15) | every flag |
| Latency p50 / p90 / max | 37.9s / 55.0s / 55.1s | under 60s |
| Reviews over 60s / failed | 0 / 0 | |

Cases: 16 (12 variants, 4 unmodified bases). Model failures: C013-X1.

## Per case

| Case | Split | Time | Planted | Detected | Citation | Human review | Unexpected flags |
|---|---|---|---|---|---|---|---|
| C001 | dev | 45.1s | none | n/a | consistent | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative |
| C001-CIT | dev | 19.4s | citation | 1/1 | likely_mismatch | yes |  |
| C001-M3 | dev | 21.3s | missing_element | 1/1 | consistent | yes |  |
| C001-MC | dev | 37.9s | human_review | 1/1 | needs_human_review | yes |  |
| C001-X1 | dev | 43.7s | inconsistency | 1/1 | consistent | yes |  |
| C003 | dev | 9.5s | none | n/a | consistent | no |  |
| C003-AMB | dev | 9.4s | human_review, inconsistency | 2/2 | consistent | yes |  |
| C003-CIT | dev | 55.1s | citation | 1/1 | needs_human_review | yes |  |
| C003-M3 | dev | 21.4s | missing_element | 1/1 | consistent | no |  |
| C012 | dev | 55.0s | none | n/a | consistent | no |  |
| C012-M2 | dev | 20.6s | missing_element | 1/1 | consistent | no |  |
| C012-MC | dev | 55.0s | human_review | 1/1 | needs_human_review | yes |  |
| C012-X1 | dev | 18.2s | inconsistency | 1/1 | consistent | yes |  |
| C013 | dev | 24.7s | none | n/a | consistent | yes | I-1 inconsistency: Entry facts mismatch |
| C013-CIT | dev | 55.0s | citation | 1/1 | needs_human_review | yes |  |
| C013-X1 | dev | 55.0s | inconsistency | 0/1 | not_checked | yes |  |

Unexpected flags on unmodified bases are unadjudicated observations: the public records are not an answer key.
