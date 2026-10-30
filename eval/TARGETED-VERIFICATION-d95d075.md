# Targeted post-tuning verification of d95d075 (not overall target achievement)

This is a **targeted, post-tuning verification** of three fixes, on 16 chosen cases. It measures whether the fixes behave as intended on the cases they touch, and whether anything regressed.
- **It is not a measure of overall performance.** No target is claimed as met.
- The checkpoint `4b10d72` and its full evaluation are unchanged (`eval/EVALUATION-4b10d72.md`).
- The cases were chosen because the fixes touch them, and most were inspected earlier, so the run is post-tuning by definition.

## Build and configuration (preserved)
- **Commit `d95d075`.** The production build (`npm run build`, `next start`) was made from a clean tree; `uncommittedServerChanges: none` in each `run-info.json`.
- **Model settings:** unchanged from the checkpoint (2 review samples plus fact extraction, 55 s fact budget). They are recorded per review in the raw results.
- **Concurrency 1**, the same as the checkpoint runs.
- **Runs** (one each, not repeated):
  - dev `2026-10-30T14-57-41`;
  - fresh `2026-10-30T14-58-11`;
  - legacy `2026-10-30T15-00-15`.
- **Scoring policy v2.3, unchanged.** Default layer and claim layer. Labels and adjudications are unchanged. Every flag in these runs was already covered by existing adjudication records: 0 unadjudicated in either layer.

**Paired against the same cases in the checkpoint runs:** dev `07-18-04`, fresh `07-21-02`, legacy `07-32-13`.

## Totals on the 16 cases (both layers identical)
| | Completion | Strict recall | Incorrect flags | Unnecessary routing |
|---|---|---|---|---|
| Checkpoint `4b10d72` | 15/16 | 4/9 | 1/20 | 2/8 |
| `d95d075` | 14/16 | 4/9 | 0/18 | 2/8 |

## Paired per-case outcomes (claim layer)
| Case | Plants | Flags checkpoint → new | Citation | Routed (expected) | Routing accounts checkpoint → new | Complete | Outcome |
|---|---|---|---|---|---|---|---|
| DS06 | — | U-N1 valid → same | needs review → same | yes → yes (no) | entry.date S6 → S6+S7 | yes → yes | same |
| DS12 | detected → detected | M-N5 valid, C-1 plant → same | mismatch → same | yes → yes (yes) | none → none | yes → yes | same |
| F036 | — | none → none | needs review → **consistent** | yes → yes (no) | entry.date S3 → **none** | yes → yes | Gap account removed (fix 3). "Consistent" rests on verified S19. Still routed by the model's own reasons |
| F055 | — | none → none | needs review → same | yes → yes (no) | entry.date S3, entry.place S3 → **none** | yes → yes | Gap accounts removed (fix 3). **Still unnecessarily routed** by the model's own reasons |
| F055-A | routed_only + missed → same | none → none | needs review → same | yes → yes (yes) | entry.manner S4 → same | yes → yes | same. A known form value is still routed (fix-3 negative control holds) |
| F055-H | missed → missed | F-HISTORY-2 valid → same | consistent → same | yes → yes (yes) | none → none | yes → yes | same |
| FS10 | — | U-N1 valid → same | consistent → same | yes → yes (no) | history S6 → same | yes → yes | same (should-not-flag control holds) |
| C001 | — | R-TIME-MISMATCH valid, M-N5 valid → same | consistent → same | yes → yes (no) | history S41 → same | yes → yes | same. Time-rule control: a real encounter-time difference is still reported |
| C003 | — | R-TIME-MISMATCH valid → same | consistent → same | yes → yes (no) | none → none | **yes → no** | **Regression: partial** (fact call timed out at 55 s; checkpoint 15.4 s). Time-rule control still holds |
| C012 | — | U-N1 valid → same | consistent → same | **no → yes** (no) | none → none | yes → yes | **Regression: routed.** See below |
| C012-M2 | detected → detected | M-E2 plant, U-N1 valid, **I-2 false** → M-E2 plant, U-N1 valid | needs review → consistent | yes → yes (no) | entry.date S17 → none | yes → yes | **False flag removed** (fix 2). The S17 account against an unknown form date is no longer routed (fix 3) |
| C012-MC | detected → detected | same | needs review → same | yes → yes (yes) | none → none | yes → yes | same |
| C012-X1 | missed → missed | U-N1 valid → same | needs review → same | yes → yes (yes) | none → none | yes → yes | same (attribution) |
| C013 | — | U-N1 valid → same | needs review → same | yes → yes (no) | entry.place S8 → none | **yes → no** | **Regression: partial** (fact call timed out at 55 s; checkpoint 28.7 s) |
| C013-CIT | detected → detected | U-N1 valid, C-1 plant → same | mismatch → same | yes → yes (yes) | entry.place, entry.manner S8; entry.date S5 → none | no → **yes** | Now complete |
| C013-X1 | missed → missed | U-N1 valid, **C-1 valid** → U-N1 valid | **mismatch → needs review** | yes → yes (yes) | history S26… → same | yes → yes | Fix 1. The self-contradicting "mismatch" is now unresolved and routed. The planted history conflict stays routed for attribution |

## Regressions, and why
1. **C003 and C013: partial reviews.**
   - The fact call timed out at the 55 s budget, where the checkpoint took 15.4 s and 28.7 s.
   - **Not caused by the changes.** All three fixes are filters applied after the model calls return; the fact call's prompt, schema and budget did not change.
   - This is the documented fact-call timeout limitation (limitation 4). It occurs at a similar rate in the checkpoint runs (C021-X1, and C037-X1 earlier).
2. **C012: new unnecessary routing.**
   - In this run, one of the two review samples raised an "entry manner conflict". The existing PWA-manner guard (unchanged) correctly withheld it.
   - But the model's own top-level routing reasons ("Entry manner conflict between form and narrative") still sent the case to a person. In the checkpoint run, neither sample raised it.
   - **Not caused by the changes:** this is model variation exposing a pre-existing gap. The same mechanism keeps F036 and F055 routed after their gap accounts were removed.

## What the fixes did
1. **Negation scope (C013-X1):** works as intended. The "mismatch" is unresolved and routed, and the valid-observation C-1 flag is no longer issued.
2. **Request vs encounter time (C012-M2):** the false flag I-2 is gone. The time-rule controls are unchanged:
   - C001 still reports a real encounter-time difference;
   - C003 still reports its rule finding, although its review was partial.
3. **Documentation gaps (F055, F036, C012-M2, C013-CIT, C013):**
   - 7 routing accounts against unknown form values are gone.
   - A known form value is still routed (F055-A, FS10, DS06).
   - **Unnecessary routing did not fall (2/8 → 2/8).** The model's own routing reasons still route F036 and F055.

## Not changed by this verification
- Strict recall is the same (4/9).
- The 14 attribution-limited misses: evidence and reasoning are in `ATTRIBUTION-REVIEW-PACKET-4b10d72.md`, for independent review.

## Next candidates (proposed; not started)
- Model routing reasons that only repeat a claim the code withheld should not route on their own (C012, F036, F055).
- Fact-call timeouts (limitation 4).

No further full evaluation batch has been started.
