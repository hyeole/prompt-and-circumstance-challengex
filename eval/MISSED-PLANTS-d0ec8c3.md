# Remaining missed plants on the d0ec8c3 build: diagnosis

Evaluated build: production build of commit `d0ec8c3`. Runs: fresh-v1 `2026-10-30T05-15-26` and legacy `2026-10-30T05-26-47`, both scored under policy v2.3 with every flag adjudicated by hand. dev-synthetic `2026-10-30T05-12-29` missed nothing. All are post-tuning. Scoring and labels are unchanged; uncertain attribution is kept uncertain.

Columns:
- **Attribution uncertain**: the conflicting statement does not name the subject in a multi-person narrative, and nothing ties it uniquely to this subject.
- **Incomplete check**: a required check did not complete (fact-call timeout), so under the scoring rules only rule findings earn credit.

## Case-by-case

| Case | Expected issue | What the review did | Evidence | Attribution uncertain | Incomplete check | Proposed general fix |
|---|---|---|---|---|---|---|
| F010-X | Narrative 2014 vs form 05/05/2011 | Routed: "S34 may conflict … cannot be attributed". **Citation shown as consistent** | S34 "…with eight other individuals on or about May 5, 2014…" | Yes: companions entered together | No | Keep routed. **A routed, unattributed entry conflict must also block a plain "consistent" citation** (it currently blocks only when a finding exists) |
| F075-X | Narrative "day after 06/08/2011" vs form 06/09/2013 | Routed (S22 named). Citation consistent | S22; another account S24 "with about five other individuals … into El Paso" | Yes: another account could be the subject's | No | Same as F010-X |
| F039-X | Form 02/15/2009 vs narrative "February of 2004" | Routed (S3 named); model claim withheld. Citation consistent | S3 "…in February of 2004 near Nogales…"; S6 "he and a group of two other subjects walked across" | Yes: group entry described | No (fixed: was invalid output) | Same as F010-X |
| F055-A (×2: conflict + ambiguity) | Added "entered through the Hidalgo port with a border crossing card" vs PWA | Routed (S4 named). Citation consistent | S4 "During a later interview, he stated…"; form date and place unknown | Yes: nothing on the form links S4 | No | Same as F010-X. The ambiguity plant needs a review-marked *finding*; a routing reason is not one. **Proposal:** issue a low-severity "unattributed conflicting account" finding (category unclear, marked for human review, no contradiction claimed) |
| C001-X1 | Narrative June 2, 2016 vs form 05/15/2014 | Routed (S23 named) | S23 "…from Matamoros … with three other individuals" | Yes | No | Same as F055-A |
| C003-AMB (×2) | Added "entered at the Nogales port of entry using a border crossing card" vs EWI | Routed (S42 named) | S42 "He later told agents…"; form date and place unknown | Yes | No | Same as F055-A |
| C012-X1 | Narrative changed to "flying … on a tourist visa" vs PWA | Routed (S17 named); model claims withheld | S17; form date unknown | Yes | No | Same as F055-A |
| C013-X1 | Form changed to NEGATIVE; narrative documents removals | Routed (S26, S28, S30, S31, S36 named). Model issued a citation "mismatch" whose explanation says the narrative *documents* the removal (false flag) | S26 "…received an Expedited Removal" | Yes: several people, history sentences unattributed | No | **Support wording:** "the narrative documents [the requirement]" must count as affirming support, so such a "mismatch" is routed (the support pattern lacks "documents"). The removals stay routed |
| C045-X1 | Narrative February 21, 2015 vs form 02/21/2012 | Original run: partial review, narrative-vs-narrative claim routed ("S30 and S35 may be about different people"). Repeat: complete, still routed (S35 named). **Citation shown as consistent** in the repeat | S30 (2012) and S35 (2015) | Yes: another account agrees with the form | Original run only (fact call timed out at 55 s) | Same as F010-X (block plain "consistent"). The timeout hid an attribution routing |
| C119-AMB (×2) | Added "first entered … by walking across the border near El Paso" | Original run: partial review; the model's C-1 cites S15 and is marked for review, but a partial review credits only rule findings. Repeat: complete, routed (S15 named); the model issued no C-1 | S15 "He also stated…" | Yes | Original run only (fact call timed out) | Same as F055-A (an unattributed-account finding) |
| F055-H | Form "POSITIVE - prior removal 2012"; narrative describes none | `F-HISTORY-2` (clarity, routed) issued and adjudicated a valid observation. **No detection credit**: the plant has no anchor text and v2.3 requires a field-only finding to name the planted value | field history.immigration_record | No | No | None to the scorer (unchanged by instruction). The finding is shown to the officer |
| F075-H | Form changed to NEGATIVE; narrative describes two earlier apprehensions (NTA, voluntary return) | Nothing | S16 "…previously arrested by U.S. Border Patrol on two separate occasions"; S21 "Voluntary Return" | Yes (S16 unattributed) | No | **Prior encounters vs NEGATIVE**, kept distinct from removals: report "the narrative describes prior arrests or voluntary returns while the form's record is NEGATIVE" as a clarity item, routed when unattributed |
| F051-C | 8 U.S.C. 1326 on a NEGATIVE record | Citation routed: the model said "consistent"; the safety net routed it. The rule check declines to call a mismatch because a group member's removal is described | S8 "one had been ordered removed … the last subject was in status" | Yes: group member | No | None. Routing is correct given the unattributed removal |
| C119-CIT | 8 U.S.C. 1326 with no removal documented | Citation routed: the model said insufficient. The form says "POSITIVE - See Narrative" | field history.immigration_record | No | No | None. With a POSITIVE record the tool cannot establish a mismatch; routing is the honest result |
| C012-M2 | Place of entry removed | **Model false "present"**: E2 cited S17 "…crossing the border illegally via a river", which names no place | S17 | No | No | **Place-of-entry guard** (like N1/N7): a model "present" for E2 must cite a sentence that names a place (a city, port, landmark, or "N miles of X") |

## Summary by cause (fresh 8 + legacy 10 undetected plants)
- **Attribution uncertain, routed with the sentence named: 10** (fresh: F010-X, F075-X, F039-X, F055-A ×2; legacy: C001-X1, C003-AMB ×2, C012-X1, C013-X1). These are the multi-person cases. Routing is the intended behaviour. Two gaps remain:
  - the citation can still read "consistent" while such a conflict is routed (F010-X, F075-X, F039-X, F055-A);
  - ambiguity plants need a finding, not just a reason.
- **Incomplete check: 3 in the original legacy run** (C045-X1, C119-AMB ×2; fact-call timeouts). In the repeat, all three completed and were routed for attribution instead, so attribution is their underlying cause.
- **Model miss: 1** (C012-M2 false present).
- **Correct routing that the label expected to be a mismatch: 2** (F051-C, C119-CIT).
- **Coverage gaps: 2.** F055-H is found but cannot be credited under the scorer; F075-H has no prior-encounter check.

## Inherited adjudications: semantic check
An adjudication is keyed by base case, category and evidence sources (`scripts/finding-key.ts`), not by what the finding claims. So a different claim citing the same sources inherits the same verdict. Every inherited verdict in the three d0ec8c3 runs was rechecked:
- **56 of 62 inherited from a finding with the same claim.** Finding type, element and title match. The two free-text model findings among them were read in full and are equivalent.
- **6 inherited from differently worded or differently sourced findings, all reviewed:**
  - the C003 encounter-time findings (5) make the same claim: form 0950 vs arrest 1030;
  - C021-X1 I-3 adds "overstay", which is the current charge, not a prior record, so the same standard applies.
- **None was semantically different.** C013-X1 C-1 inherited the C013 base false-flag verdict, and its claim matches that standard ("the narrative documents" the prior removal).

**Proposed:** include the finding's claim (element id, or for free-text findings a normalized title) in the adjudication key, so a different claim on the same sources must be adjudicated on its own.

## Flags by category (d0ec8c3)

Issued flags exclude duplicates. Incorrect = false + unadjudicated.

| Dataset | Finding group | Issued | Planted matches | Valid observations | False flags | Incorrect |
|---|---|---|---|---|---|---|
| dev-synthetic | identity documents (N1) | 3 | 0 | 3 | 0 | 0/3 |
| dev-synthetic | all except N1 | 8 | 6 | 2 | 0 | 0/8 |
| fresh-v1 | identity documents (N1) | 7 | 0 | 7 | 0 | 0/7 |
| fresh-v1 | citation | 2 | 2 | 0 | 0 | 0/2 |
| fresh-v1 | inconsistency | 1 | 0 | 1 | 0 | 0/1 |
| fresh-v1 | other checklist items | 12 | 6 | 6 | 0 | 0/12 |
| fresh-v1 | clarity (other) | 1 | 0 | 1 | 0 | 0/1 |
| fresh-v1 | human-review routing | 1 | 1 | 0 | 0 | 0/1 |
| fresh-v1 | all except N1 | 17 | 9 | 8 | 0 | 0/17 |
| legacy | identity documents (N1) | 19 | 0 | 19 | 0 | 0/19 |
| legacy | citation | 8 | 7 | 0 | 1 | 1/8 |
| legacy | inconsistency | 15 | 4 | 10 | 1 | 1/15 |
| legacy | other checklist items | 16 | 5 | 9 | 2 | 2/16 |
| legacy | human-review routing | 5 | 5 | 0 | 0 | 0/5 |
| legacy | all except N1 | 44 | 21 | 19 | 4 | 4/44 (9%) |

The N1 observations are real gaps (no identity document stated), but they are numerous. They lower the overall incorrect proportion (legacy 4/63 = 6% overall vs 4/44 = 9% without N1). Both figures should always be reported together.

## Diagnostic repeat: legacy on the same build (`d0ec8c3`) and configuration

Two runs: the original `2026-10-30T05-26-47` and the repeat `2026-10-30T05-52-49`. Both are kept and reported as run; neither replaces the other. The repeat recorded HEAD `4c32391`, which differs from `d0ec8c3` only in documents and run results (no change in `lib`, `app`, `components` or `config`). The server served the same `d0ec8c3` build for both.

| Measure | 2026-10-30T05-26-47 | 2026-10-30T05-52-49 |
|---|---|---|
| facts p50 | 24.3s | 15.0s |
| facts p90 | 55.0s | 30.5s |
| facts max | 55.0s | 49.2s |
| facts timeouts | 7 | 0 |
| review-1 p50 | 14.0s | 8.9s |
| review-1 p90 | 27.9s | 16.1s |
| review-1 max | 36.7s | 18.1s |
| review-1 timeouts | 2 | 0 |
| review-2 p50 | 12.1s | 9.6s |
| review-2 p90 | 28.9s | 19.2s |
| review-2 max | 39.4s | 22.9s |
| review-2 timeouts | 1 | 1 |
| fact extraction failed (cases) | 7: C001, C003-CIT, C013-CIT, C037, C037-CIT, C045-X1, C119-AMB | 0:  |
| completion | 81% (30/37) | 100% (37/37) |
| unnecessaryRouting | 7% (1/15) | 7% (1/15) |
| strict recall | 68% (21/31) | 68% (21/31) |
| incorrect flags | 6% (4/63) (false 4) | 7% (4/61) (false 4) |
| outcomes | detected: 21, routed_only: 2, missed: 5, not_completed: 3 | detected: 21, routed_only: 3, missed: 7, not_completed: 0 |

Plant outcomes that differ:

| Case | 2026-10-30T05-26-47 | 2026-10-30T05-52-49 |
|---|---|---|
| C045-X1 | not_completed | missed |
| C119-AMB | not_completed, not_completed | routed_only, missed |


**Interpretation.**
- Every call type was faster in the repeat, and the 7 fact-call timeouts did not recur. Completion went from 81% to 100%.
- Detections were identical: the same 21 plants were detected, and the same 10 were not. Only the recorded cause changed for C045-X1 and C119-AMB (not completed → routed for attribution).
- So the timeouts in the original run changed completion but not detection.
- The variability is in latency on the shared endpoint during the run. One repeat shows that the latency is variable, but it cannot prove endpoint load as the cause.
- False flags: 4 in each run, against 63 and 61 issued.

## Proposed next focused reliability changes (not yet made; each needs regression tests and negative controls)
1. **Block a plain "consistent" citation while an entry conflict is routed for attribution**, not only when a conflict finding exists. Seen in F010-X, F075-X, F039-X, F055-A and C045-X1.
2. **Unattributed-account finding.** When a conflicting account cannot be attributed, issue a low-severity clarity finding marked for human review. It names the statement, claims no contradiction, and needs no attribution. This gives the officer an item to act on, not only a reason line. It does **not** change scoring: an "unclear" finding is credited only if it identifies the planted discrepancy under v2.3.
3. **Place-of-entry guard** (C012-M2): a model "present" for E2 must cite a sentence that names a place.
4. **Support wording:** "the narrative documents [the requirement]" affirms support, so a self-contradicting "mismatch" is routed (C013-X1).
5. **Adjudication key includes the claim** (element id, or a normalized title for free-text findings), so a different claim on the same evidence is never judged by inheritance.
6. **Prior encounters vs a NEGATIVE record** (F075-H), kept distinct from removals: a clarity item, routed when unattributed.
7. **Fact-call timeouts:**
   - Record per-call timings in every report (now done in this comparison).
   - **Measured on the original run.** Narrative length is not the cause: the 7 cases whose fact call timed out had a median of 45 sentences, against 44 for the other 30. Review-1 calls on those cases were not slower (median 12.7 s vs 14.6 s); review-2 was somewhat slower (18.2 s vs 11.3 s). So the fact call stalled on its own rather than everything slowing together. One untested explanation is that it produces the longest output.
   - **Next measurement:** record the fact call's output length, and test a tighter output budget (cap the number of statements).
   - Before changing anything else, measure whether fact-call timeouts coincide with slow review calls on the same case. If they do, the shared endpoint is the bottleneck and the fix is the budget or the number of parallel calls, not the prompt. The fact prompt is unchanged between builds, and its output parsing no longer fails.
