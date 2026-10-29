# Evaluation run 2026-10-29T22-03-32

**Internal synthetic evaluation.** Test variants and expected findings were created by the team from adapted public records.
They are not Unissant's test set. References are provisional (see config/references.json).

| Measure | Result | Deck target |
|---|---|---|
| Detection recall, all planted issues | 69% (9/13) | at least 90% |
| Recall, dev split | 69% (9/13) | |
| Recall, held-out split | n/a | |
| Missing elements | 0% (0/3) | |
| Inconsistencies | 75% (3/4) | |
| Citation errors | 100% (3/3) | |
| Human-review routing (ambiguous or multi-charge) | 100% (3/3) | 100% |
| Incorrect flags among issued flags (variants, conservative) | 20% (2/10) | at most 10% |
| Evidence references valid | 100% (17/17) | every flag |
| Latency p50 / p90 / max | 51.9s / 55.1s / 55.3s | under 60s |
| Reviews over 60s / failed | 0 / 0 | |

Cases: 16 (12 variants, 4 unmodified bases). Model failures: C001-M3, C001-MC, C003, C003-AMB, C003-M3, C012-M2.

## Per case

| Case | Split | Time | Planted | Detected | Citation | Human review | Unexpected flags |
|---|---|---|---|---|---|---|---|
| C001 | dev | 30.7s | none | n/a | consistent | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative; I-1 inconsistency: Entry facts conflict with form fields |
| C001-CIT | dev | 41.2s | citation | 1/1 | likely_mismatch | yes |  |
| C001-M3 | dev | 55.3s | missing_element | 0/1 | not_checked | yes |  |
| C001-MC | dev | 55.0s | human_review | 1/1 | needs_human_review | yes |  |
| C001-X1 | dev | 29.3s | inconsistency | 1/1 | needs_human_review | yes |  |
| C003 | dev | 55.1s | none | n/a | not_checked | yes |  |
| C003-AMB | dev | 55.0s | human_review, inconsistency | 1/2 | not_checked | yes |  |
| C003-CIT | dev | 54.8s | citation | 1/1 | likely_mismatch | yes |  |
| C003-M3 | dev | 55.0s | missing_element | 0/1 | not_checked | yes |  |
| C012 | dev | 47.8s | none | n/a | consistent | yes | I-1 inconsistency: Entry date conflict |
| C012-M2 | dev | 55.0s | missing_element | 0/1 | not_checked | yes |  |
| C012-MC | dev | 44.4s | human_review | 1/1 | needs_human_review | yes | I-1 inconsistency: Entry date inconsistency |
| C012-X1 | dev | 33.7s | inconsistency | 1/1 | consistent | yes |  |
| C013 | dev | 39.0s | none | n/a | consistent | yes |  |
| C013-CIT | dev | 33.2s | citation | 1/1 | likely_mismatch | yes | I-1 inconsistency: Entry facts conflict with form fields |
| C013-X1 | dev | 51.9s | inconsistency | 1/1 | consistent | yes |  |

Unexpected flags on unmodified bases are unadjudicated observations: the public records are not an answer key.
