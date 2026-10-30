# Evaluation run registry

Every run is listed with its code version, so results can be traced and compared fairly.
**Only one run is an untouched held-out result, and it is an internal evaluation on team-made test cases, not a sponsor evaluation.** Every later run on held-out cases is **post-tuning**: the errors it found informed later changes.

| Run | Label | Code | Split | Concurrency | Notes |
|---|---|---|---|---|---|
| 2026-10-29T21-58-11 | dev baseline | commit `08debef` + v1.0 prompt (uncommitted UI/test edits only) | dev | 2 | `reasoning_effort` default; 1 sample |
| 2026-10-29T22-03-32 | dev tuning | working tree, review-v1.1 (committed in `5ca9946`) | dev | 2 | default effort; 6 timeouts |
| 2026-10-29T22-13-53 | dev tuning | working tree: effort=low, 2 samples | dev | 2 | |
| 2026-10-29T22-17-19 | dev tuning | working tree: + facts-v1.0 | dev | 2 | |
| 2026-10-29T22-21-33 | dev tuning | working tree: facts-v1.1, sample grace, citation mapping | dev | 2 | |
| 2026-10-29T22-25-33 | dev tuning (final) | identical to commit `ae55a38` | dev | 2 | configuration frozen after this run |
| **2026-10-29T22-28-28** | **internal held-out** | **commit `ae55a38`, no changes** | **held-out** | 2 | **The only untouched held-out evaluation.** `REPORT-official-heldout.md` (file name kept from the time of the run; "official" there means "the untouched one", not sponsor-official) |
| 2026-10-29T22-34-04 | post-tuning (dev regression) | working tree after held-out error analysis (partial fixes) | dev | 2 | informed by held-out errors |
| 2026-10-29T22-38-59 | post-tuning | same working tree as above | held-out | 1 | NOT a held-out claim |
| 2026-10-29T22-48-40 | post-hoc | commit `2c9e2d4`, dataset v2 | all 37 | 1 | NOT a held-out claim. 4 model timeouts |
| 2026-10-29T23-08-37 | post-tuning diagnostics | commit `554c9b8` | dev | 1 | first run with per-call logs and sample agreement; the time-rule fix came after it |
| **2026-10-29T23-32-42** | **post-tuning, shipped code** | **commit `8c0b474`, no uncommitted server changes** | all 37 | 1 | final run; source of the per-case PDF reports. NOT a held-out claim. 0 partial reviews |

From now on `run-info.json` in each run folder records the commit, any uncommitted server changes, the label, and the concurrency.
New held-out claims need a **fresh independent set** of base cases that were never used for tuning.

## All runs under scoring policy v2.1 (generated from each run's summary.json)

Re-scored on 2026-10-29 with one policy. Unadjudicated flags count as incorrect, which is why the early tuning runs look worse than they did under policy v1.

| Run | Label | Completion | Strict recall | Incorrect flags | Unnecessary routing | Routed for a real source discrepancy | p50 latency |
|---|---|---|---|---|---|---|---|
| 21-58-11 | dev baseline | 100% (16/16) | 69% (9/13) | 44% (11/25) | 14% (1/7) | C001, C001-M3 | 26.4s |
| 22-03-32 | dev tuning | 63% (10/16) | 62% (8/13) | 24% (4/17) | 71% (5/7) | C001, C001-M3 | 51.9s |
| 22-13-53 | dev tuning | 100% (16/16) | 77% (10/13) | 7% (1/15) | 0% (0/7) | C001, C001-M3 | 9.2s |
| 22-17-19 | dev tuning | 100% (16/16) | 85% (11/13) | 6% (1/16) | 0% (0/7) | C001, C001-M3 | 11.6s |
| 22-21-33 | dev tuning | 100% (16/16) | 77% (10/13) | 18% (3/17) | 0% (0/7) | C001, C001-M3 | 19.9s |
| 22-25-33 | dev, frozen config | 100% (16/16) | 100% (13/13) | 11% (2/19) | 14% (1/7) | C001, C001-M3 | 17.4s |
| 22-28-28 | **internal held-out** | 100% (21/21) | 83% (15/18) | 28% (5/18) | 13% (1/8) | - | 22.0s |
| 22-34-04 | post-hoc, dev | 94% (15/16) | 77% (10/13) | 7% (1/15) | 14% (1/7) | C001, C001-M3 | 37.9s |
| 22-38-59 | post-hoc, held-out cases | 95% (20/21) | 72% (13/18) | 0% (0/11) | 0% (0/8) | - | 18.1s |
| 22-48-40 | post-hoc, all 37 | 89% (33/37) | 84% (26/31) | 9% (3/34) | 13% (2/15) | C001, C001-M3 | 22.9s |
| 23-08-37 | post-tuning diagnostics, dev | 94% (15/16) | 85% (11/13) | 10% (2/20) | 14% (1/7) | C001, C001-M3, C003-M3 | 20.4s |

**Re-adjudicated internal held-out (reported separately):** the v1 C037-M3 label is doubtful, because the v1 input still contained the smuggler sentence that implied the manner of entry. If that one planted issue is excluded, strict recall is 88% (15/17). The headline stays 83%.

**What the internal held-out run supports:**
- Below the deck's 90% detection target.
- Above its 10% incorrect-flag target.
- Meets the 100% routing target for multi-charge and planted-ambiguity cases.
- Meets the under-60-second target in every review.
- Every flag's evidence matched the source text.

The post-hoc runs show improvement, but they were informed by the held-out errors. A new held-out claim needs a fresh set of base cases.

## M2: 1 vs 2 review samples (dev split, production build of commit `bcac131`, one case at a time)

These are post-tuning diagnostic runs. Each configuration ran twice, and every flag is adjudicated (`eval/adjudications.json`).

| Run | Samples | Requests | Completion | Strict recall | Incorrect flags | Valid observations | p50 / max |
|---|---|---|---|---|---|---|---|
| 2026-10-30T00-19-52 | 2 | 48 | 100% | 100% (13/13) | 18% (5/28) | 11 | 16.8s / 55.0s |
| 2026-10-30T00-25-17 | 1 | 32 | 100% | 100% (13/13) | 12% (3/25) | 10 | 16.0s / 55.0s |
| 2026-10-30T00-30-49 | 2 | 48 | 100% | 85% (11/13) | 12% (3/26) | 12 | 16.2s / 55.0s |
| 2026-10-30T00-36-49 | 1 | 32 | 88% | 77% (10/13) | 13% (3/24) | 11 | 17.9s / 55.0s |
| **Both rounds, 2 samples** | | 96 | 32/32 | 92% (24/26) | 15% (8/54) | | |
| **Both rounds, 1 sample** | | 64 | 30/32 | 88% (23/26) | 12% (6/49) | | |

**Decision:** keep 2 samples (no configuration change).
- **Against:** one sample used a third fewer requests and gave slightly fewer false flags.
- **For:** two samples were the only measured protection against a single request timing out. The single-sample setup lost 2 reviews to timeouts; the two-sample setup lost none, and it found one more planted issue.
- **Caveat:** all differences are within run-to-run variation, so this is weak evidence either way. Revisit with more runs if request cost matters.

**Recurring false flags seen here:**
- PWA or EWI treated as conflicting with a described illegal crossing.
- Entries into Mexico still cited by model issues.
- A citation "mismatch" whose own explanation supports the charge.
- One missed prior-removal extraction.

These are inputs for the next reliability step. They are not fixed in these runs.

## fresh-v1 (independent internal evaluation)

| Run | Label | Code | Result |
|---|---|---|---|
| **2026-10-30T02-48-46** | **fresh-v1 internal evaluation (untouched)** | tag `fresh-eval-v1-frozen` = `ab6feb6` | recall 71% (12/17), incorrect flags 30% (11/37), routing 2/2, checklist 95%, should-not-flag violations 2, evidence 100%, p50 19.8s. See `eval/fresh/RESULT.md` |

## dev-synthetic-v1 (development)

| Run | Label | Code | Result |
|---|---|---|---|
| 2026-10-30T02-40-21 | development | `a5ba61b` | recall 4/6, incorrect flags 25% (2/8), checklist 50/50, should-not-flag violations 1 |

## Post-tuning runs at commit `e5a47a7` (scoring policy v2.2)

All three are **post-tuning**: their code includes fixes informed by the fresh-v1 and earlier errors. fresh-v1's only untouched result stays `2026-10-30T02-48-46`.

| Run | Dataset | Completion | Strict recall | Incorrect flags | Other |
|---|---|---|---|---|---|
| 2026-10-30T03-03-23 | dev-synthetic-v1 | 100% (12/12) | 100% (6/6) | 20% (2/10) | checklist 50/50, should-not-flag 1, p50 11.8s |
| 2026-10-30T03-05-54 | fresh-v1 (post-tuning) | 100% (28/28) | 82% (14/17) | 18% (5/28) | checklist 97%, should-not-flag 1, p50 19.3s |
| 2026-10-30T03-16-09 | legacy benchmark (37) | 100% (37/37) | 90% (28/31) | 27% (17/62) | 9 of the 17 false flags are the new checklist-v2 item N5 (precise section and explanation), which this run applied to the legacy cases for the first time; p50 19.3s |

Every flag in these runs was adjudicated by hand. Standards used:
- **N5 with no INA section stated in the narrative:** valid observation (sponsor item S4 not covered).
- **N5 where the precise section is cited and the facts that meet it are stated elsewhere in the narrative:** false flag.
- **A lawful B2 admission vs a NEGATIVE immigration record:** false flag.
- **Current expedited-removal processing read as a prior removal (DS10):** false flag.

## Rescoring under policy v2.3 (reported separately; original results unchanged)

| Run | Label | v2.2 strict recall | v2.2 incorrect | v2.3 completion | v2.3 strict recall | v2.3 incorrect |
|---|---|---|---|---|---|---|
| 2026-10-29T22-28-28 | internal held-out (untouched) | 83% (15/18) | 28% (5/18) | 90% (19/21) | 78% (14/18) | 28% (5/18) |
| 2026-10-29T23-32-42 | post-tuning, shipped v1 code | 94% (29/31) | 12% (5/41) | 97% (36/37) | 94% (29/31) | 12% (5/41) |
| 2026-10-30T02-40-21 | dev-synthetic development | 67% (4/6) | 25% (2/8) | 100% (12/12) | 67% (4/6) | 25% (2/8) |
| 2026-10-30T02-48-46 | **fresh-v1 untouched** | **71% (12/17)** | **30% (11/37)** | 89% (25/28) | 65% (11/17) | 30% (11/37) |
| 2026-10-30T03-03-23 | post-tuning dev-synthetic | 100% (6/6) | 20% (2/10) | 100% (12/12) | 100% (6/6) | 20% (2/10) |
| 2026-10-30T03-05-54 | post-tuning fresh-v1 | 82% (14/17) | 18% (5/28) | 82% (23/28) | 71% (12/17) | 18% (5/28) |
| 2026-10-30T03-16-09 | post-tuning legacy | 90% (28/31) | 27% (17/62) | 92% (34/37) | 87% (27/31) | 27% (17/62) |

**Where the differences come from.**
- **Almost entirely the completion rule.** Reviews whose fact-extraction call timed out are now partial. In a partial review, only rule-made findings earn credit.
- **The stricter matching rule changed no historical detection.** Every credited inconsistency in these runs already named the planted value or cited the planted sentence.
- **The audited "font is unreadable" example does not occur in any recorded run.** It is reproduced as a negative-control test.

**Headlines are unchanged and stay labelled as before.** The internal held-out result is 83% / 28% under v2.2. fresh-v1's untouched result is 71% / 30% under v2.2, and the independent audit reproduced those figures. Fixes informed by fresh-v1 are post-tuning, so fresh-v1 cannot support another untouched claim.

## Post-audit runs at commit `324c393` (scoring policy v2.3; post-tuning)

The code includes all eight independent-audit fixes. Every flag was adjudicated by hand. These runs exposed two problems: a wrong team reference for INA 212(a)(7) and a large recall drop. The drop is diagnosed per planted issue in `eval/fresh/POST-AUDIT-DIAGNOSIS.md`.

| Run | Dataset | Completion | Strict recall | Incorrect flags | Unnecessary routing | Other |
|---|---|---|---|---|---|---|
| 2026-10-30T03-48-20 | dev-synthetic-v1 | 100% (12/12) | 100% (6/6) | 0% (0/9) | 40% (4/10) | checklist 50/50, should-not-flag 0, p50 18.0s |
| 2026-10-30T03-52-17 | fresh-v1 (post-tuning) | 89% (25/28) | 47% (8/17) | 21% (4/19) | 61% (11/18) | checklist 97%, should-not-flag 0, p50 28.9s |
| 2026-10-30T04-06-35 | legacy benchmark (37) | 86% (32/37) | 68% (21/31) | 19% (11/57) | 33% (5/15) | should-not-flag 0, p50 27.9s; 5 partial (fact call timed out) |

**Why recall fell.**
- **Attribution rule (audit item 3).** Almost every adapted source record describes several people with redacted names. Planted conflicts in unattributed statements were routed to a person with the sentence named, not flagged. Fresh lost 4 plants this way; legacy lost 7.
- **Completion rule (audit item 1).** A failed fact call now makes the review partial. Fresh lost 2 plants; legacy lost 1.

**Why routing rose.**
- The INA 212(a)(7)(A)(i)(I) reference wrongly required a prior admission.
- Form fields did not count as support for a "consistent" verdict.

Both were fixed in `0ab6dfa`. The diagnosis fixes are in `8864d7b`; they are listed in `eval/fresh/POST-AUDIT-DIAGNOSIS.md`, and `8864d7b` is measured below. Scoring and labels are unchanged.

## Same-policy comparison across builds (scoring policy v2.3, every flag adjudicated by hand)

**Evaluated build vs recorded HEAD.** The "Evaluated build" column is the commit whose production build served the run. The run folder's `run-info.json` records the git HEAD at the moment the run started. These differ only for the two `8864d7b` runs: a docs-only commit (`0fd47be`) was made while the dev-synthetic run was in progress, so fresh and legacy recorded `0fd47be`, while the server kept serving the `8864d7b` build. No server-used file (`lib`, `app`, `components`, `config`) differs between `8864d7b` and `0fd47be`. From `d0ec8c3` on, HEAD was held at the built commit for the whole batch.

Figures are as recorded when each run was scored. Earlier runs keep their original v2.2 files, with the v2.3 rescoring beside them. Nothing was relabelled. fresh-v1's only untouched result remains `2026-10-30T02-48-46` (71% recall, 30% incorrect under v2.2); every row below is post-tuning.

| Dataset | Evaluated build | Run (recorded HEAD) | Change | Completion | Strict recall | Incorrect flags | False flags | Unnecessary routing |
|---|---|---|---|---|---|---|---|---|
| dev-synthetic | `e5a47a7` | 2026-10-30T03-03-23 (`e5a47a7`) | post-tuning, before audit | 100% (12/12) | 100% (6/6) | 20% (2/10) | 2 | 20% (2/10) |
| dev-synthetic | `324c393` | 2026-10-30T03-48-20 (`324c393`) | audit items 1-8 | 100% (12/12) | 100% (6/6) | 0% (0/9) | 0 | 40% (4/10) |
| dev-synthetic | `8864d7b` | 2026-10-30T04-35-38 (`8864d7b`) | diagnosis fixes | 100% (12/12) | 100% (6/6) | 9% (1/11) | 1 | 0% (0/10) |
| dev-synthetic | `d0ec8c3` | 2026-10-30T05-12-29 (`d0ec8c3`) | refinements | 100% (12/12) | 100% (6/6) | 0% (0/11) | 0 | 0% (0/10) |
| fresh-v1 | `e5a47a7` | 2026-10-30T03-05-54 (`e5a47a7`) | post-tuning, before audit | 82% (23/28) | 71% (12/17) | 18% (5/28) | 5 | 28% (5/18) |
| fresh-v1 | `324c393` | 2026-10-30T03-52-17 (`324c393`) | audit items 1-8 | 89% (25/28) | 47% (8/17) | 21% (4/19) | 4 | 61% (11/18) |
| fresh-v1 | `8864d7b` | 2026-10-30T04-38-25 (`0fd47be`) | diagnosis fixes | 96% (27/28) | 71% (12/17) | 4% (1/27) | 1 | 22% (4/18) |
| fresh-v1 | `d0ec8c3` | 2026-10-30T05-15-26 (`d0ec8c3`) | refinements | 96% (27/28) | 53% (9/17) | 0% (0/24) | 0 | 17% (3/18) |
| legacy | `e5a47a7` | 2026-10-30T03-16-09 (`e5a47a7`) | post-tuning, before audit | 92% (34/37) | 87% (27/31) | 27% (17/62) | 17 | 0% (0/15) |
| legacy | `324c393` | 2026-10-30T04-06-35 (`324c393`) | audit items 1-8 | 86% (32/37) | 68% (21/31) | 19% (11/57) | 11 | 33% (5/15) |
| legacy | `8864d7b` | 2026-10-30T04-48-10 (`0fd47be`) | diagnosis fixes | 97% (36/37) | 65% (20/31) | 6% (4/63) | 4 | 7% (1/15) |
| legacy | `d0ec8c3` | 2026-10-30T05-26-47 (`d0ec8c3`) | refinements | 81% (30/37) | 68% (21/31) | 6% (4/63) | 4 | 7% (1/15) |

**Reading the table.**
- **Incorrect-flag proportions since `8864d7b` are partly lower because the denominator grew.** The status-document change for N1 added about 20 valid "identifying documents not stated" observations per dataset. The raw false-flag counts are shown beside the proportions for that reason.
- **Recall moved with the attribution rules, not with the model.**
  - `324c393` routed every unattributed conflict in multi-person narratives.
  - `8864d7b` re-linked statements on a single matching fact (month and day).
  - `d0ec8c3` requires at least two matching facts and unique support. Statements whose companions are described entering with them stay routed: F010-X ("with eight other individuals"), F075-X (another account "with about five other individuals"), C045-X1 (another account gives the form's own date).
  - The negative controls (shared date, shared manner, travelled together, DS06) pass.
- **fresh `d0ec8c3` vs `8864d7b`: 9/17 vs 12/17.**
  - F010-X and F075-X are lost by design (identity not uniquely supported; routed with the sentence named).
  - F051-C changed with the model: the model called the reentry charge "consistent" this time, and the safety net routed it.
  - The year-schema fix removed every invalid-output failure. F039-X and F039-G now complete.
- **legacy `d0ec8c3` completion fell to 81%** because of 7 fact-call timeouts at the full 55 s budget, up from 0 timeouts on `8864d7b`.
  - The fact-extraction prompt is unchanged between the two builds; only output parsing changed.
  - Review-call latency rose too (p50 11.4 s to 13.3 s; fact calls 16.9 s to 24.3 s). That points to load on the shared endpoint during the run, but this is not proven and the batch was not rerun.
  - In partial reviews, only rule findings earn credit, so 3 plants show as "not completed".

### Diagnostic repeat of legacy on the same `d0ec8c3` build

- **Runs:** `2026-10-30T05-26-47` (original) and `2026-10-30T05-52-49` (repeat). Same build and configuration; the repeat recorded HEAD `4c32391`, with no server-file changes since `d0ec8c3`. Both are kept.
- **Repeat result:** completion 100% (37/37), strict recall 68% (21/31), incorrect 4/61 (4 false flags), unnecessary routing 7% (1/15).
- **Original result:** completion 81% (30/37), strict recall 68% (21/31), incorrect 4/63 (4 false flags), unnecessary routing 7% (1/15).
- **The 7 fact-call timeouts did not recur, and the same 21 plants were detected.** The variability is in endpoint latency. One repeat cannot prove load as the cause.
- **Details:** per-call timings, the case-by-case missed-plant table, the inherited-adjudication recheck and the flags by category are in `eval/MISSED-PLANTS-d0ec8c3.md`.

## Planned evaluation on the `e4dd17b` build (fixes 1-6, accounts as routing items)

See `eval/EVALUATION-e4dd17b.md`. It covers both adjudication layers, flags by category, the remaining missed plants, the item-7 measurement, and an adjudication error found and corrected in the claim layer (C003-M3 and C037-M3 U-N5).

| Dataset | Completion | Strict recall | Incorrect (default / claim layer) | Unnecessary routing |
|---|---|---|---|---|
| dev-synthetic | 100% | 100% (6/6) | 0/10 / 0/10 | 0% |
| fresh-v1 | 96% | 53% (9/17) | 0/25 / 0/25 | 22% (4/18) |
| legacy | 97% | 71% (22/31) | 3/62 / 1/62 | 7% (1/15) |

## Planned evaluation of the final build `4b10d72`

See `eval/EVALUATION-4b10d72.md`. The default layer gives 0/11, 0/26 and 4/63 incorrect flags; the claim layer gives 0/11, 0/26 and 2/63. Completion is 100%, 96% and 95%; strict recall 6/6, 9/17 and 21/31; unnecessary routing 0%, 22% and 7%; no should-not-flag violations. Five known limitations are listed there as candidates for the next change.

## Checkpoint: 4b10d72 (not a target-met release)
- Production build `4b10d72` and its evaluation (dev `2026-10-30T07-18-04`, fresh `07-21-02`, legacy `07-32-13`; report `eval/EVALUATION-4b10d72.md`) are preserved as a **checkpoint**.
- They are not a release that meets targets, and no target is claimed as met.
- The local tag `checkpoint-4b10d72-eval` marks the commit.
- Later commits (negation scope, request vs encounter time, documentation-gap routing) are post-tuning source changes. They are **not** the evaluated build until a planned run on their own production build is recorded here.
- Miss classification: `eval/MISS-CLASSIFICATION-4b10d72.md`. Label questions, kept separate: `eval/LABEL-REVIEW-2026-10-30.md`.

## Targeted post-tuning verification: d95d075 (16 cases; not overall target achievement)
- **Production build `d95d075`.** Runs: dev `2026-10-30T14-57-41`, fresh `2026-10-30T14-58-11`, legacy `2026-10-30T15-00-15`. Each run was performed once; v2.3 scoring; both layers identical.
- **Paired with checkpoint `4b10d72` on the same 16 cases:**
  - completion 15/16 → 14/16;
  - strict recall 4/9 → 4/9;
  - incorrect flags 1/20 → 0/18;
  - unnecessary routing 2/8 → 2/8.
- **Regressions:**
  - C003 and C013 were partial (fact-call timeouts);
  - C012 was routed by the model's own reasons for a claim the code withheld.
- **Full report:** `eval/TARGETED-VERIFICATION-d95d075.md`.

## Final planned evaluation: rc-closeout (`7efb231`; source `f5d952b`), post-tuning, not held-out
- **Runs:** dev `2026-10-30T15-57-53`, fresh `2026-10-30T16-00-38`, legacy `2026-10-30T16-10-34`. Each case ran once.
- **Scoring:** policy v2.4 frozen before the run; claim v2 layer.
- **Results:**
  - strict detection 78% (42/54); 74% (40/54) with the C003-AMB caveat;
  - incorrect flags 2/100 (claim layer) and 4/100 (original-record layer);
  - completion 75/77; unnecessary routing 3/43; 0 should-not-flag violations.
- **Same policy (v2.4, original-record layer) against checkpoint `4b10d72`:** detection 36/54 → 42/54; incorrect 5/101 → 4/100.
- **Report:** `eval/EVALUATION-closeout-7efb231.md`. Historical v2.3 results are unchanged; their v2.4 rescoring is in `summary-v2.4.json` beside each run.

## Round 2 candidate `rc-round2` (`1b5f59b`): planned evaluation, post-tuning, NOT promoted
- **Runs:** dev `2026-10-30T18-29-08`, fresh `18-32-38`, legacy `18-43-05`, gen-v1 `18-58-39`.
- **Results (77 cases, v2.4 claim layer):**
  - detection 41/54 (baseline 42/54);
  - incorrect flags 2/104 (baseline 2/100);
  - completion 73/77 (baseline 75/77);
  - unnecessary routing 5/43 (baseline 3/43).
- **gen-v1** (team-authored, locked, not held-out): 5/7 detected, 0/7 incorrect.
- **Bounded diagnostic** of `facts-v2.1` (`18-17-17`, `18-19-47`, `18-20-57`): not adopted.
- **Post-run patch** P1/P2 is unevaluated.
- **Report:** `eval/EVALUATION-round2-1b5f59b.md`.
