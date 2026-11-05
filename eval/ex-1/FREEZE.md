# ex-1 freeze (recorded before any model call on the ex-1 cases)

| Engine | Commit | Server worktree state | BUILD_ID |
|---|---|---|---|
| Baseline (measured checkpoint) | `74e15fb` | detached, clean | `P9gsRs-e9wO6Ec4z2QH0G` |
| Candidate (event-attribution extraction) | `6c49e14` | detached, clean | `5Y3vmROtKL5M6rWM76H-h` |

- **The only code difference:** the extraction prompt (`facts-v2.0` → `facts-v3.0-events`) and its parsing through
  the validated adapter (`lib/review/events.ts`, `parseExtraction`), plus adapter notes stored with the extraction
  record. Same model, settings, stages, quote verification, deterministic safeguards, timeout fallback and human review.
- **Settings (both):** `gpt-oss-20b`, low reasoning, `json_object`, 2 review samples (12 s grace), 55 s timeout, 1 retry,
  `review-v1.4`, references `team-provisional-2026-10-31.1`. The key is used server-side only through a temporary link,
  never printed or logged, and removed after the run.
- **Order:** `driver.py`; cases in ID order; per case, odd positions baseline first, even positions candidate first.
- **Budget:** 40 reviews; normally 120 model requests; hard maximum 240 attempts; stop rules as in `PLAN.md`.
  No reruns, no edits after live outputs are seen.

## Offline checks on 6c49e14 (before any call)
- Tests: 457/457 (445 at 74e15fb + 12 new in `tests/event-extraction.test.ts`); `tsc --noEmit` clean; `next build` clean.
- Saved-output replays: all 280 saved runs (1,550 records) in the four standard modes are **byte-identical** to the same
  replays on the clean 74e15fb tree, as are both remap logs (`offline/replays.txt`). Limitation: saved outputs are in the
  facts-v2.0 shape, so the replays exercise the legacy parsing path and all unchanged code, not the new prompt.
- Recorded pre-existing defect (unchanged, present on 74e15fb): the source-text account check `F-ACCOUNT` reads a
  denied crossing with a year ("he never crossed … in 2015") as an entry. Not fixed here; it would confound the comparison.
