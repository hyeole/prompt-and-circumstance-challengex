# Final planned evaluation: reliability closeout (build `7efb231`, tag `rc-closeout`)

**What this is.** One planned evaluation of all three datasets on a frozen production build. It is **post-tuning**, not untouched held-out:
- every dataset has been inspected during development;
- the closeout fixes were designed with knowledge of the cases.

Each case ran once. Nothing was restarted, rerun or cherry-picked, and the earlier runs and reports are unchanged.

**Targets:** ≥90% strict detection and ≤10% incorrect flags.
- **Detection is not met:** 78% (42/54) pooled.
- **Incorrect flags are met:** 2% (2/100) in the claim layer, 4% (4/100) in the original-record layer.

## Frozen build and configuration
| Item | Value |
|---|---|
| Evaluated production build | `7efb231` (tag `rc-closeout`). Server code (`lib`, `app`, `components`, `config`) is identical to source commit `f5d952b`; `7efb231` adds only documentation, the claim v2 migration and historical rescoring. `uncommittedServerChanges: none` in every `run-info.json` |
| Model | `gpt-oss-20b` on the sponsor endpoint; reasoning effort low; 2 review samples merged; fact extraction `facts-v2.0`; fact budget 55 s (unchanged) |
| References | `team-provisional-2026-10-31.1` (unchanged) |
| Scoring | Policy **v2.4**, frozen before the run (`scripts/score-match.ts`). Claim-aware layer with **claim v2** (`eval/migrations/2026-10-30-adjudication-claims-v2.json`) |
| Runs | dev `2026-10-30T15-57-53` (12 cases), fresh `2026-10-30T16-00-38` (28), legacy `2026-10-30T16-10-34` (37). Concurrency 1, as in earlier runs |
| Verification before the run | Type-check, 199 offline tests (the 24 closeout tests' 12 defect cases fail on `0810a78`), production build, e2e workflow 23/23 (`scripts/e2e-workflow.mjs`, a few live reviews) |

## Results (claim-aware layer, headline)
| Dataset | Completion | Strict detection | Incorrect flags | False flags | Duplicates | Unadjudicated | Unnecessary routing | Should-not-flag violations | Latency p50 / p90 / max |
|---|---|---|---|---|---|---|---|---|---|
| dev-synthetic | 100% (12/12) | 100% (6/6) | 0% (0/10) | 0 | 0 | 0 | 0% (0/10) | 0 | 13.2 s / 18.3 s / 29.0 s |
| fresh-v1 | 96% (27/28) | 65% (11/17) | 4% (1/27) | 1 | 0 | 0 | 11% (2/18) | 0 | 21.7 s / 31.4 s / 55.0 s |
| legacy | 97% (36/37) | 81% (25/31) | 2% (1/63) | 1 | 0 | 0 | 7% (1/15) | 0 | 21.2 s / 41.5 s / 55.0 s |
| **Pooled** | **97% (75/77)** | **78% (42/54)** | **2% (2/100)** | 2 | 0 | 0 | 7% (3/43) | 0 | |

**Original-record layer** (key-only, for continuity):
- Detection is the same.
- Incorrect flags are fresh 1/27 and legacy 3/63, so **4/100 pooled**.
- The 2 extra are C003-M3 and C037-M3 U-N5. This is the known inheritance error in the original records, corrected only in the claim layer and documented since `EVALUATION-4b10d72.md`.

**Manual adjudication after the run:**
- Three findings were unadjudicated in the claim layer and were decided by hand. Each is recorded in the v2 migration with its reason; no original record was changed.
  - F055-H C-1, false flag: it treats PWA as conflicting with an illegal crossing.
  - FS06 M-N2, valid: the same verdict as its original record.
  - C021-X1 I-3, false flag: a lawful B2 admission does not contradict a NEGATIVE record.
- One new original-layer record was added: F055-H C-1, a new key.
- Every automatically matched planted finding (42) was read. Each states the planted discrepancy or missing element about the right fact and event.

## Category results (pooled)
| Plant type | Detected |
|---|---|
| Missing element | 100% (16/16) |
| Inconsistency | 47% (8/17) |
| Citation | 82% (9/11) |
| Routing: multiple charges | 100% (6/6) |
| Routing: planted ambiguity | 75% (3/4) |

| Finding category | Flags | Incorrect | Valid observations | Planted |
|---|---|---|---|---|
| Identity documents (reported separately) | 29 | 0 | 29 | 0 |
| Citation | 10 | 1 | 0 | 9 |
| Inconsistency | 18 | 1 | 9 | 8 |
| Missing element | 29 | 0 | 15 | 14 |
| Unclear | 8 | 0 | 6 | 2 |
| Routing (multiple charges) | 6 | 0 | 0 | 6 |

Incorrect flags excluding identity-document observations: 3% (2/71).

**Within-account detections, reported separately.** Five planted issues were detected only by the new check for a contradiction within one person's continuous account:
- F055-A, both plants;
- C003-AMB, both plants;
- C012-X1.

These findings do not claim the account is this subject's, and make no comparison with the form. Without that check, detection would be 69% (37/54).

## Evidence: source-text matching vs support
- **Source-text matching:** every cited quote in every flag equals the source text at its offsets (evidence validity 100% in all three datasets). Model quotes are exact matches; rule evidence quotes whole sentences.
- **Support:** decided by adjudication. 98 of 100 non-duplicate flags are supported: 42 planted plus 56 valid observations. The 2 false flags quote real text accurately, but the text does not support the claimed conflict.

## Completion and latency
- **Partial reviews, 2:** F055-H and C003-AMB. Both are fact-extraction timeouts at the 55 s budget. C003-AMB's plants were still detected, because the within-account check is rule-based. F055-H's history check did not run.
- **Review calls:** 4 review samples were cancelled after the grace period, and the other sample was used. No HTTP failures.
- **End-to-end latency:** p50 13–22 s and p90 18–42 s by dataset; max 55 s.

**Timeout diagnostics (new token logging; no setting changed):**
- Fact-call duration tracks generated tokens closely: r = 0.96 for completion tokens and 0.89 for reasoning tokens over 75 successful calls.
- Throughput is steady: 44 tokens/s median, 32–48 from the 10th to the 90th percentile. Reasoning is 55% of fact output (median).
- The longest successful fact call produced 1,977 tokens in 49 s. The budget allows about 2,400 tokens at this rate.
- The two timeouts are therefore consistent with unusually long generations. This is **inferred, not observed**: a failed call reports no tokens.
- Endpoint load is **not** supported as the cause in this run: throughput was stable.
- A bounded fix would cap or shorten the fact output. It has not been made.

## Every remaining missed issue (12) and its cause
| Case | Plant | Outcome | Evidence-based cause |
|---|---|---|---|
| F010-X | inconsistency (entry year) | routed, S34 named | S34 says the person crossed "with eight other individuals"; nothing links it to this subject uniquely. Genuine attribution uncertainty |
| F039-X | inconsistency (entry year) | routed, S3 named | Only the month and manner match the form, and there is no continuing account. Genuine uncertainty |
| F075-X | inconsistency (entry year) | routed, S22 named | Another person's group entry (S24) shares the place. Genuine uncertainty |
| F075-H | inconsistency (history) | routed, S16+S19+S22 named | History sentences name only a redacted person in a two-person narrative. Genuine uncertainty |
| C001-X1 | inconsistency (entry year) | routed, S23 named | S23 is a group entry ("with three other individuals"). Genuine uncertainty |
| C013-X1 | inconsistency (history) | routed, removal sentences named | Three travellers, all Nicaraguan; removals name only a redacted person. Genuine uncertainty |
| C045-X1 | inconsistency (entry year) | routed, S35 named | S30 and S35 are separately introduced redacted persons, and identical markers are not taken as one person. Genuine uncertainty; label question |
| C119-AMB | inconsistency (manner) | routed, S15 named | S15 is a *first* entry; the form records the *last* entry. Label question |
| C119-AMB | ambiguity routing | routed only (reason and routing item name S15) | No finding, because the statement follows "both/all subjects" and cannot be attributed. A routing item is not a finding under the policy |
| F051-C | citation | routed | The removal belongs to an unidentified group member. The label's own note accepts routing |
| C119-CIT | citation | routed | "POSITIVE - See Narrative" with no removal described, so a mismatch cannot be established. Label question |
| F055-H | inconsistency (history) | not completed | The fact-extraction timeout (partial review) stopped the history check |

## Sensitivity analysis (labels unchanged; alternatives only)
| Alternative reading | Strict detection |
|---|---|
| As labelled | 78% (42/54) |
| C119-AMB inconsistency plant excluded (first vs last entry) | 79% (42/53) |
| Routing accepted for F051-C and C119-CIT | 81% (44/54) |
| C045-X1 excluded (two persons) | 79% (42/53) |
| All three together | 85% (44/52) |

**Detection stays below 90% under every alternative.** The gap is the 7 attribution-limited plants and 1 timeout. Counting a routing item that names the sentence as detection would contradict the declared policy, so it is not reported as a score.

## Robustness caveat (found after the run; disclosed, not patched)
**C003-AMB.** Its two plants were detected in this run by the within-account check, but its fact call had timed out, so the check ran without the extractor's "not a U.S. entry" classifications.
- In the live demo verification on the same build the fact call succeeded. There, C003-AMB was routed with S42 named, and no within-account finding was produced.
- The likely cause is that the extractor classifies one of the two sentences as not a U.S. entry. The extracted facts are not stored, so this is **not confirmed**.
- F055-A and C012-X1 were detected with successful fact calls.
- Counting C003-AMB as routed gives **74% (40/54)** strict detection. This is a missed detection, not a false flag. The evaluated build is unchanged, and no patch has been made.

## Demo (illustrative)
`scripts/verify-demo.ts` passed all six beats on the second run; the first run's two failures are kept in `docs/demo-verification.md`. The recording is `recordings/narrativecheck-demo-2026-10-30T16-59-37.webm` (git-ignored; delivered separately). Every review in it is a live call.

**Four recordings were made**, and all are kept on disk:
1. The first had captions that assumed results the live review did not return.
2. The second still had one such caption.
3. The third started from a narrative the first recording had edited and saved. That edit was set aside to `tmp/store-backup/`, so the sample case starts from its original text.
4. The fourth is the delivered one. Its captions describe only what each live review returned. It shows a partial review (C037-X1) as it happened.

## Same-policy comparison with checkpoint `4b10d72` (v2.4, original-record layer)
| | Completion | Strict detection | Incorrect flags | Unnecessary routing |
|---|---|---|---|---|
| `4b10d72` (runs `07-18-04`, `07-21-02`, `07-32-13`) | 74/77 | 67% (36/54) | 5/101 (4 false, 1 unadjudicated) | 5/43 |
| `7efb231` (this run) | 75/77 | 78% (42/54) | 4/100 | 3/43 |

## Remaining unnecessary routing (3)
- **FS08 and FS09:** INA 212(a)(9)(A)(ii) is not in the provisional reference list, so the citation cannot be checked. This is a reference coverage gap.
- **C021:** an unattributable second arrival account (S29) qualifies the entry-dependent citation.

## Limitations
1. **Detection target not met (78%).** The gap is mostly genuine attribution uncertainty in multi-person narratives with redacted names. The system routes these with the statement named; it does not force a contradiction.
2. **Fact-call timeouts** (2 of 77 reviews): consistent with long generations. Not yet capped.
3. **Claim v2 and element findings.** Model-written notes vary between runs, so some element findings' claims are not shared across instances. This makes the claim layer stricter, with more manual adjudication, but not more lenient.
4. **The model's citation verdict** can still treat PWA as conflicting with an illegal crossing in a multi-person narrative, where the record's support cannot be attributed (F055-H C-1).
5. **Reference coverage** is limited to the provisional team list (FS08, FS09).
6. **Post-tuning.** These are not independent held-out results.
