# Evaluation run registry

Every run is listed with its code version, so results can be traced and compared fairly.
**Only one run is an untouched held-out result.** Every later run on held-out cases is **post-tuning**: the errors it found informed later changes.

| Run | Label | Code | Split | Concurrency | Notes |
|---|---|---|---|---|---|
| 2026-10-29T21-58-11 | dev baseline | commit `08debef` + v1.0 prompt (uncommitted UI/test edits only) | dev | 2 | `reasoning_effort` default; 1 sample |
| 2026-10-29T22-03-32 | dev tuning | working tree, review-v1.1 (committed in `5ca9946`) | dev | 2 | default effort; 6 timeouts |
| 2026-10-29T22-13-53 | dev tuning | working tree: effort=low, 2 samples | dev | 2 | |
| 2026-10-29T22-17-19 | dev tuning | working tree: + facts-v1.0 | dev | 2 | |
| 2026-10-29T22-21-33 | dev tuning | working tree: facts-v1.1, sample grace, citation mapping | dev | 2 | |
| 2026-10-29T22-25-33 | dev tuning (final) | identical to commit `ae55a38` | dev | 2 | configuration frozen after this run |
| **2026-10-29T22-28-28** | **official held-out** | **commit `ae55a38`, no changes** | **held-out** | 2 | **The only untouched held-out evaluation.** `REPORT-official-heldout.md` |
| 2026-10-29T22-34-04 | post-tuning (dev regression) | working tree after held-out error analysis (partial fixes) | dev | 2 | informed by held-out errors |
| 2026-10-29T22-38-59 | post-tuning | same working tree as above | held-out | 1 | NOT a held-out claim |
| 2026-10-29T22-48-40 | post-tuning | commit `2c9e2d4` | all 37 | 1 | NOT a held-out claim |

From now on `run-info.json` in each run folder records the commit, any uncommitted server changes, the label, and the concurrency.
New held-out claims need a **fresh independent set** of base cases that were never used for tuning.
