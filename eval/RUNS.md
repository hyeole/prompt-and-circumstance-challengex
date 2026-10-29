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
