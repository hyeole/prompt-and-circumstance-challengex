# Evaluation run 2026-10-29T21-58-11

**Internal synthetic evaluation.** Test variants and expected findings were created by the team from adapted public records.
They are not Unissant's test set. References are provisional (see config/references.json).

| Measure | Result | Deck target |
|---|---|---|
| Detection recall, all planted issues | 69% (9/13) | at least 90% |
| Recall, dev split | 69% (9/13) | |
| Recall, held-out split | n/a | |
| Missing elements | 100% (3/3) | |
| Inconsistencies | 25% (1/4) | |
| Citation errors | 100% (3/3) | |
| Human-review routing (ambiguous or multi-charge) | 67% (2/3) | 100% |
| Incorrect flags among issued flags (variants, conservative) | 44% (7/16) | at most 10% |
| Evidence references valid | 100% (25/25) | every flag |
| Latency p50 / p90 / max | 26.4s / 52.1s / 53.0s | under 60s |
| Reviews over 60s / failed | 0 / 0 | |

Cases: 16 (12 variants, 4 unmodified bases). Model failures: none.

## Per case

| Case | Split | Time | Planted | Detected | Citation | Human review | Unexpected flags |
|---|---|---|---|---|---|---|---|
| C001 | dev | 20.4s | none | n/a | consistent | yes | R-TIME-MISMATCH inconsistency: Encounter time differs between form and narrative |
| C001-CIT | dev | 43.5s | citation | 1/1 | likely_mismatch | yes | I-1 inconsistency: Subject not admitted but charge requires admission |
| C001-M3 | dev | 28.2s | missing_element | 1/1 | consistent | yes |  |
| C001-MC | dev | 52.1s | human_review | 1/1 | needs_human_review | yes |  |
| C001-X1 | dev | 16.0s | inconsistency | 0/1 | consistent | yes |  |
| C003 | dev | 23.2s | none | n/a | consistent | no | M-E7 missing_element: Missing: means and route of travel to the interior |
| C003-AMB | dev | 23.1s | human_review, inconsistency | 0/2 | consistent | no |  |
| C003-CIT | dev | 53.0s | citation | 1/1 | likely_mismatch | yes | I-1 inconsistency: No evidence of prior removal |
| C003-M3 | dev | 27.9s | missing_element | 1/1 | consistent | no | U-E7 unclear: Unclear: means and route of travel to the interior |
| C012 | dev | 26.4s | none | n/a | consistent | no | M-E7 missing_element: Missing: means and route of travel to the interior |
| C012-M2 | dev | 43.4s | missing_element | 1/1 | consistent | yes | U-E7 unclear: Unclear: means and route of travel to the interior; I-1 inconsistency: Entry manner conflict |
| C012-MC | dev | 13.8s | human_review | 1/1 | needs_human_review | yes |  |
| C012-X1 | dev | 51.7s | inconsistency | 1/1 | consistent | yes | U-E7 unclear: Unclear: means and route of travel to the interior |
| C013 | dev | 22.2s | none | n/a | consistent | no |  |
| C013-CIT | dev | 26.2s | citation | 1/1 | likely_mismatch | yes | I-1 inconsistency: Charge requires admission but narrative shows illegal entry |
| C013-X1 | dev | 21.6s | inconsistency | 0/1 | consistent | no |  |

Unexpected flags on unmodified bases are unadjudicated observations: the public records are not an answer key.
