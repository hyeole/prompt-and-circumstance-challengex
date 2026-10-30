# Round 2: baseline, protections and miss diagnosis (branch `improve/round2`)

## Baseline (verified from files, unchanged)
- **Evaluated production build:** `7efb231` (tag `rc-closeout`). Server code is identical to source `f5d952b`, which was confirmed with `git diff`.
- **Delivery snapshot:** `49a12be` (`share/narrativecheck-delivery-49a12be.zip`).
- **Runs:** dev `2026-10-30T15-57-53`, fresh `16-00-38`, legacy `16-10-34`.

| Layer (v2.4) | Strict detection | Incorrect flags | Completion |
|---|---|---|---|
| Claim-aware (`summary-v2.4-claims.json`) | 6 + 11 + 25 = **42/54** | 0 + 1 + 1 = **2/100** | 12 + 27 + 36 = **75/77** |
| Original records (`summary.json`, v2.4) | 42/54 | 0 + 1 + 3 = 4/100 | 75/77 |

**C003-AMB caveat:** its two detections occurred only because its fact call timed out. With them counted as routed, detection is 40/54.

## Protection map (existing correct behaviour → regression tests and saved outcomes)
| Behaviour | Tests | Saved outcomes compared after the change |
|---|---|---|
| Missing-element detection, incl. absent vs not stated, redaction | `review.test` (C012-M2, redacted field), `checklist.test`, `closeout.test` E | 16/16 missing-element plants |
| Multi-charge and ambiguity routing; never selects a charge | `rules` tests, `review.test` ("no displayed text may recommend…") | 6/6 multi-charge; 3/4 ambiguity |
| Clean and should-not-flag controls | `review.test` (DS06, FS10, DS10, DS11), `closeout.test` D controls | 0 should-not-flag violations; clean bases' flags |
| Attribution and event distinctions (companions, scope words, first vs last, request vs encounter time, voluntary return vs removal, offered vs completed removal) | `facts.test` scope/history, `review.test`, `closeout.test` D/E | Per-case findings in the baseline runs |
| Valid findings and citation checks | `review.test` (fix 4, precedence, C037-CIT) | 56 valid observations, 9/11 citations |
| Evidence references and source offsets | `text.test`, `support.test`, `review.test` (unverifiable evidence withheld) | Evidence validity 100% |
| Completion semantics | `review.test` audit item 1, `completion` | 75/77 |
| Cancellation, saving, intake drafts, history, exports | `requests.test`, `store.test`, `compare.test`, `scripts/e2e-workflow.mjs` (23 checks) | e2e 23/23 |

## Missed plants at the baseline: case by case (checked against the records)
| Case | Expected issue and evidence | What the record establishes about the subject | Baseline outcome | Why not detected | Defensible automatic finding? | Class and fix |
|---|---|---|---|---|---|---|
| C003-AMB ×2 (caveat) | S42 (port with a border crossing card) contradicts S41 (illegal crossing at five) and the form's EWI | S41→S42 is one continuous account ("He later told agents…"). It is not linked to the subject | Detected only when the fact call failed. Routed when extraction succeeded | A successful extraction's "not a U.S. entry" label for a sentence suppresses the within-account check, which overrides the source text ("crossed the Mexico-United States border") | Yes: a contradiction within one account | **Resolvable code defect.** Validate extracted exclusions against the source sentence (fix 1) |
| C013-X1 | Form NEGATIVE vs narrative removals | S38: "**Subject** did not receive a bond … being a reinstate case." This is explicitly the subject, and a reinstatement presupposes a prior removal order. S26–S31 name only a redacted person | Routed | The history check uses only removal sentences the extractor listed; S38 was not listed. History checks also do not run when extraction fails | Yes, from S38 (explicit subject). The plant's anchors ("deported", "Expedited Removal", "Reinstatement") are not in S38, so a correct finding may not be credited | **Resolvable code defect + incomplete check** (fix 2). Credit uncertain; reported either way |
| F075-H | Form NEGATIVE vs prior Border Patrol arrests, NTA and voluntary return | S22 states the subject's **exact recorded entry date** (the day after 06/08/2011 = 06/09/2011, the form's full date) and manner (river crossing, EWI); its voluntary return is that same account's. No other account states that date (S24 gives a place, El Paso, but no date) | Routed | Linking requires two facts with no other account sharing any, and S24 shares the place. A full-date match was not given its weight | Yes: an exact full-date and manner match is uniquely identifying unless another account states the same date | **Resolvable code defect** (fix 3, exact-entry link). Control: F075-X (year differs) stays routed |
| F010-X | Entry year 2014 vs form 2011 (S34) | S34 is a group crossing ("with eight other individuals") on the form's month and day | Routed (S34) | The shared date cannot single out the subject | No | **Genuinely ambiguous attribution** |
| F039-X | Feb 2004 vs form 02/15/2009 (S3) | Only the month and manner category match. S6 is a group crossing | Routed (S3) | Insufficient link | No | **Genuinely ambiguous** |
| F075-X | 06/08/2011 (+1 day) vs form 06/09/2013 (S22) | Month/day and area match, but the year is the conflict. S24 shares the place | Routed (S22) | Not uniquely linked | No | **Genuinely ambiguous** |
| C001-X1 | June 2, 2016 vs form 2014 (S23) | S23 is a group crossing ("with three other individuals") | Routed (S23) | Group entry | No | **Genuinely ambiguous** |
| C045-X1 | Feb 21, 2015 vs form 02/21/2012 (S35) | S30 (separately introduced) gives the form's exact date, port and visa class. S35 is another introduced person or a second account | Routed (S35) | Two persons cannot be told apart | No | **Genuinely ambiguous / questionable label** |
| C119-AMB ×2 | Manner: "first entered … walking" (S15) vs form AIR | S15's "He" follows "Both subjects…" after a female's statement. It is a *first* entry, while the form records the *last* | Routed (S15) | Ambiguous pronoun, and not a contradiction of the last entry | No | **Questionable expected label** (inconsistency plant) + ambiguous |
| F051-C | Citation (1326 on a NEGATIVE record) | The removal belongs to an unidentified group member | Citation routed | Correct routing | No | **Questionable label** (its own note accepts routing) |
| C119-CIT | Citation (1326, no removal described) | Record "POSITIVE - See Narrative" | Citation routed | A mismatch cannot be established | No | **Questionable label** |
| F055-H | Form "POSITIVE - prior removal 2012" vs no removal in the narrative | Field-only discrepancy | Partial review (fact-call timeout) | Incomplete check. Even complete, its field-only finding cannot be credited under v2.4 (the plant has no anchor) | Yes (`F-HISTORY-2`), but not creditable | **Incomplete check** (fix 2 runs it without extraction) + **scorer/label question** |

**Ceiling.** Without label changes, the fixes can add F075-H (+1), possibly C013-X1 (+1, if credited), and stabilise C003-AMB (+0 against 42, +2 against the 40 sensitivity figure). The 90% target (49/54) is out of reach this round without counting routing or changing labels, and neither will be done.

## Fixes made (branch `improve/round2`)
Each was reproduced first (`scripts/repro-round2.ts`) and has regression tests (`tests/round2.test.ts`). On `7efb231`, 15 defect tests fail and the 8 control-only tests pass (`eval/ROUND2-prefix-test-results.txt`).

1. **Extraction must not override the source.** An extracted "not a U.S. entry" label is ignored when the sentence itself describes entering or crossing into the United States and names no other destination. C003-AMB keeps its within-account finding in all five extraction scenarios: accurate, incomplete, wrong non-U.S. label, invalid output, timeout. Failed extraction still makes the review partial.
2. **History from the source text.**
   - Prior-removal statements come from the narrative's own sentences as well as the extractor's list.
   - The history checks also run when extraction fails; the review remains partial.
   - Negated removals ("has never been deported") and approved or current expedited removal are not prior removals.
   - Removed again after review: a source-scan false positive on DS09 S12, an officer "approved the expedited removal".
3. **Structured attribution** (`attributeStatement`: supported, ambiguous or other, with sentence IDs and a rationale):
   - an explicit subject in the fact's clause;
   - a one-person narrative;
   - pronoun continuity from a sentence naming the subject;
   - an exact recorded entry date in full, plus the same manner, with no other sentence stating that date and no group entry in the account.

   Headings, citizenship, a month and day, or a place alone never establish identity.
4. **History distinctions.**
   - One account that both affirms and denies a prior removal is a within-account contradiction.
   - A form removal against the subject's affirmative denial is a conflict (`F-HISTORY-4`); an omission stays a clarity gap (`F-HISTORY-2`).
5. **Empty extraction is not completion.** A valid but empty extraction for a narrative that describes a U.S. entry is retried within the remaining budget. Otherwise the fact check is reported as not completed. This occurred once in the baseline final run (C003-M3) and once in the diagnostic below.

**Kept, not counted as improvement:** new routing items for unattributable reinstatement or removal statements, for example C012 S6, "the second subject was processed as a Reinstate". These route and claim no contradiction.

**Superseding rule refined:** a within-account finding never replaces a fact-comparison finding (`F-…`) about the same sentences; only free-text model issues are superseded.

## Fact-call reliability: measured, and the prompt change not adopted
| Measurement (successful calls, final run, `facts-v2.0`) | Value |
|---|---|
| Duration vs completion tokens | r = 0.96; about 44 tokens/s |
| Hidden reasoning share | median 55%; about 75% in the longest calls |
| Timeouts | 2/77 (no tokens reported for failed calls) |
| Schema-invalid outputs | 0 |
| Valid but empty extractions despite an entry in the narrative | 1 (C003-M3) |

**Bounded diagnostic.** Runs `2026-10-30T18-17-17`, `18-19-47`, `18-20-57`, commit `48e9dee`, 10 cases, once each. They tested `facts-v2.1` (quotes capped at 12 words; the unused `uncertainty` field dropped) on the 2 timed-out cases and the 8 longest fact calls.
- Both earlier timeouts completed (10 s and 18 s).
- Over the 8 paired cases, completion tokens went 13,211 → 8,904.
- But per-case variance far exceeds what the prompt change can explain (C001-CIT 1,958 → 438, mostly reasoning). The same `facts-v2.0` prompt has both timed out and completed on C003-AMB.
- C037-X1 returned an empty extraction after 1,901 reasoning tokens and lost its date finding.

**Decision.** The reduction cannot be attributed to the prompt, so `facts-v2.1` is **not adopted**, and the frozen candidate uses `facts-v2.0`. Timeouts, budget and model settings are unchanged. Reliability is addressed by the deterministic changes (fixes 2 and 5).

## Generalization set `gen-v1` (not independently held out)
- **Contents:** 12 team-authored synthetic cases (`scripts/build-gen-v1.ts`) with 7 plants:
  - 2 clean;
  - 3 resolvable conflicts (entry year, manner, prior removal);
  - 1 unattributable account;
  - 3 person/event controls (other subject, companion removal, request time and arrest city);
  - 1 voluntary-return control;
  - 1 missing element, 1 citation mismatch, 1 multi-charge.
- **Lock:** labels were locked (`eval/gen-v1/LOCK.json`, SHA-256 per label) and committed before the frozen build ran on them.
- **Independence:** they were written by the same team that tuned the system, after seeing the tuning cases, so they are **not** independent evidence.
