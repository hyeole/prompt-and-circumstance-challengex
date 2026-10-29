# Evaluation run 2026-10-29T22-21-33

**Internal synthetic evaluation.** Test variants and expected findings were created by the team from adapted public records.
They are not Unissant's test set. References are provisional (see config/references.json).

| Measure | Result | Deck target |
|---|---|---|
| Detection recall, all planted issues | 85% (11/13) | at least 90% |
| Recall, dev split | 85% (11/13) | |
| Recall, held-out split | n/a | |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 100% (4/4) | |
| Citation errors | 33% (1/3) | |
| Human-review routing (ambiguous or multi-charge) | 100% (3/3) | 100% |
| Incorrect flags among issued flags (variants, conservative) | 25% (3/12) | at most 10% |
| Evidence references valid | 100% (17/17) | every flag |
| Latency p50 / p90 / max | 19.9s / 42.2s / 42.5s | under 60s |
| Reviews over 60s / failed | 0 / 0 | |

Cases: 16 (12 variants, 4 unmodified bases). Model failures: none.

## Per case

| Case | Split | Time | Planted | Detected | Citation | Human review | Unexpected flags |
|---|---|---|---|---|---|---|---|
| C001 | dev | 28.7s | none | n/a | consistent | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative |
| C001-CIT | dev | 18.5s | citation | 0/1 | consistent | yes |  |
| C001-M3 | dev | 42.5s | missing_element | 1/1 | consistent | yes | Q-2 unclear: Entry date not stated; Q-3 unclear: Encounter date/time not stated |
| C001-MC | dev | 29.9s | human_review | 1/1 | needs_human_review | yes |  |
| C001-X1 | dev | 19.6s | inconsistency | 1/1 | consistent | yes |  |
| C003 | dev | 13.4s | none | n/a | consistent | no |  |
| C003-AMB | dev | 19.9s | human_review, inconsistency | 2/2 | consistent | yes |  |
| C003-CIT | dev | 17.0s | citation | 1/1 | needs_human_review | yes | M-E6 missing_element: Missing: basis for the immigration violation |
| C003-M3 | dev | 16.6s | missing_element | 1/1 | consistent | no |  |
| C012 | dev | 12.2s | none | n/a | consistent | no |  |
| C012-M2 | dev | 22.3s | missing_element | 1/1 | consistent | no |  |
| C012-MC | dev | 9.5s | human_review | 1/1 | needs_human_review | yes |  |
| C012-X1 | dev | 11.0s | inconsistency | 1/1 | consistent | yes |  |
| C013 | dev | 33.9s | none | n/a | consistent | no |  |
| C013-CIT | dev | 25.3s | citation | 0/1 | consistent | no |  |
| C013-X1 | dev | 42.2s | inconsistency | 1/1 | consistent | yes |  |

Unexpected flags on unmodified bases are unadjudicated observations: the public records are not an answer key.
