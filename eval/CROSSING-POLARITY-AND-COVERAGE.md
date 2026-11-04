# Crossing polarity (event-scoped) and replay coverage reconciliation

**Status:** offline correction checkpoint on `improve/diag2-fixes-1`, on top of `df54805`. **No model calls. Not evaluated.**
- **Preserved:** `df54805`, `06278ed` and their evidence.
- **Unchanged:** cases, labels, scorers, references and historical evidence.
- **Labelling:** the replay and rebuild results are **post-observation development verification**, separate from the historical 54-issue benchmark.

## 1. Crossing polarity
### Helper (`crossingClauses`, `crossingMode`, `namedStates`)
Before is `df54805` (`helper-before.txt`); after is this checkpoint (`helper-after.txt`).

| Statement | Before | After |
|---|---|---|
| "The subject didn't cross the border in a truck." | crossing, **vehicle** (defect) | not a crossing |
| "The subject didn’t cross …" (curly apostrophe) | crossing, **vehicle** (defect) | not a crossing |
| "At no point did the subject cross the border in a truck." | crossing, **vehicle** (defect) | not a crossing |
| "At no time did he cross near Columbus, New Mexico." | crossing, **New Mexico** (defect) | not a crossing |
| "Never did he cross the border in a truck." | crossing, **vehicle** (defect) | not a crossing |
| "The subject did not, at any point, cross …" | (not tested before) | not a crossing |
| "He denied that he had ever crossed …" | (not tested before) | not a crossing |
| "never crossed …" / "denied crossing …" / "If he had crossed …" / "planned to cross …" | not a crossing | not a crossing |
| "has never been inspected but/and crossed … on foot …" | foot | foot (preserved) |
| "did not apply for a visa and crossed … in a truck …" | vehicle | vehicle (preserved) |
| "didn't have papers, so he crossed … in a truck …" | vehicle | vehicle (preserved) |
| "did not cross … in a truck but walked across near Sasabe, Arizona" | foot, Arizona | foot, Arizona (preserved) |
| "after crossing, he was taken by car …" / "allowing him to enter" | not a crossing | not a crossing (preserved) |

### Pipeline
Each wording is run through the full review on EG12 (form EWI AFOOT, near Sasabe, AZ). Before and after are in `pipeline-before.jsonl` and `pipeline-after.jsonl`.
- **Issued findings removed (10):**
  - `F-ENTRY-MODE` for "didn't", "didn’t", "hasn't", "At no point did", "At no time did", "Never did" and "Not once did" a truck crossing (7);
  - `F-ENTRY-PLACE` for "At no time did he cross near Columbus, New Mexico", "He didn't cross near Columbus, New Mexico" and "He didn’t cross the border near Columbus, New Mexico" (3).
- **Routing:** each of these cases was routed only because of the false finding, and is no longer routed.
- **Unchanged (preserved):**
  - affirmed truck crossings (`F-ENTRY-MODE`) and an affirmed New Mexico crossing (`F-ENTRY-PLACE`);
  - crossings after a negated unrelated action, which are still compared (`F-ENTRY-MODE` for "did not apply for a visa and crossed … in a truck", "didn't have papers, so he crossed … in a truck");
  - "never inspected but/and crossed on foot", with no finding;
  - "never crossed" and "denied crossing", with no finding.
- **Protected downstream already at `df54805`:** a denied truck crossing in one sentence followed by an affirmed crossing on foot ("The subject didn't cross … in a truck. He stated that he crossed … on foot …"). The mode comparison needs a single mode across the subject's crossings. The helper defect was there, but no false finding was issued.

### The correction
- **Before:** a word window that removed fixed negation patterns.
- **Now, scoped to the crossing event:** each crossing verb is judged only by what governs it, inside its own verb phrase. The phrase runs back to the nearest conjunction ("and", "but", "so", "then", "because", …) or ";".
- **What makes a crossing not affirmed:**
  - a negated auxiliary ("did not / didn't / didn’t / hasn't / never / no longer", optionally with "ever", "at any point" or "at any time");
  - a fronted negation with inversion ("At no point / At no time / Never / Not once / In no way … did he cross");
  - a denial or refusal governing it ("denied (that he had ever) crossed");
  - a hypothetical or modal ("if / unless / whether …", "would / could / might …");
  - an infinitive ("to cross");
  - a following-event time phrase ("after crossing").
- **Apostrophes:** straight and curly are treated alike.
- **Mode and place:** a non-affirmed crossing's verb phrase is set aside before mode and place are read.
- **Unchanged:** attribution, event scope (last or unscoped entry) and multi-person routing.

## 2. Replay coverage reconciliation
The machine-readable inventory is `replay-coverage-inventory.json`. For each of the 242 runs it gives the checkout, group, dataset, label, runner commit, cases, raw file count, whether the run was in the earlier coverage, and the records produced in each mode.

| Count | Meaning |
|---|---|
| 1,432 | Historical 142 runs (1,412 records) + diag-1 20 runs (20): the coverage reported for `286d42d` and `44a1dae`. Correct. |
| **1,496** | **Not a record count.** I took the line total of four mode outputs **plus the two remap logs** (12 lines each) and divided by 4: 5,984 = 4 × 1,490 + 24. The `06278ed` report's "1,496 per mode" was this miscount. There were never any duplicate records. |
| 1,490 | 1,432 + live-1 28 + diag-2 30 (220 runs): the actual coverage of `06278ed` and `df54805`, with 1,490 distinct records per mode, no duplicates and none skipped. |
| **1,512** | **1,490 + 22 restored records (242 runs): the coverage of this checkpoint.** |

**Restored records:**
- **What they are:** 22 runs of a capability-1 re-run from the encounter-time verification (runner `f192a43`, server `a465773`), saved in the capability-1 worktree.
- **Why they were missing:** they were unintentionally left out of the earlier replay lists.
- **Search:** every checkout (the main checkout and all worktrees) was searched for saved run directories with raw results. All 242 found are now replayed, in every mode, one record per raw file. Nothing is excluded.
- **Not counted:** copies of runs inside earlier evidence bundles, and scratch rebuild outputs, are duplicates or derived outputs.
- **Retroactive check:** the 22 restored records were also replayed under `44a1dae`. In all four modes they are **identical** from `44a1dae` through this checkpoint, so the omission hid no change from the `06278ed` or `df54805` corrections.

## Validation
- **Tests:** 434/434 (428 at `df54805`).
  - **New:** `tests/crossing-polarity.test.ts` (5 pipeline tests; the first two failed on `df54805`, and the 3 preservation tests passed there), and 1 event-scoped helper test in `tests/diag2-helpers.test.ts`.
  - **Unchanged and passing:** `tests/diag2-review-fixes.test.ts`, including the narrowed order-claim guard.
- **Other checks:** `tsc --noEmit` is clean. `next build` succeeds; it was run on this commit in the worktree with a real `node_modules`.
- **Replays (post-observation; no model calls):** all 242 runs (1,512 records), compared with `df54805`, in stub, stub-mismatch, stub-failall and recon.
  - **0 records changed in every mode.** Remap logs are identical.
  - **Consistency check:** the `df54805` baseline equals the earlier 1,490-record replay on every shared record.
  - **Why nothing changed:** no saved narrative contains a negated, fronted-negation or hypothetical crossing, so this correction shows only in the helper and pipeline tests.
- **Locked scorers on the offline rebuilds:** identical to `df54805`.
  - diag-1: 20/20.
  - diag-2: 30/30, with EG02, EG05, EG07 and EG08 still recovered.

## Limitations
- **Negation scope is pattern-based.** A negation that governs the crossing across a conjunction ("He did not walk and cross …") is read as negating only the first verb. Negations far from the verb, or uncommon idioms, may be missed.
- **Double negatives** ("did not deny crossing") are treated as not affirmed. This is conservative: no comparison is made.
