# diag-2 fixes: corrections after review of 06278ed

**Status:** offline correction checkpoint. **No model calls. Not evaluated.**
- **Branch:** `improve/diag2-fixes-1`, on top of `06278ed`. That commit and its evidence (`eval/DIAG2-FIXES-1-REPORT.md`, bundle `narrativecheck-diag2-fixes-1.zip`) are preserved unchanged.
- **Unchanged:** cases, labels, scorers, references and historical adjudications.
- **Labelling:** the diag-1 and diag-2 rebuilds are **post-observation development verification**, separate from the historical 54-issue benchmark.

## 1. Crossing polarity
**Helper behaviour at `06278ed`** (`crossingClauses`, `crossingMode`, `namedStates`; output in `helper-before.txt`):

| Statement | Crossing clause? | Mode / state read |
|---|---|---|
| "The subject never crossed the border in a truck." | **yes (defect)** | **vehicle** |
| "The subject denied crossing the border in a truck." | **yes (defect)** | **vehicle** |
| "If he crossed the border in a truck, he would have been caught." | **yes (defect)** | **vehicle** |
| "The subject denied crossing the border near Columbus, New Mexico." | **yes (defect)** | **New Mexico** |
| "He planned to cross …" / "He tried to cross …" | no: already excluded by the infinitive rule | none |
| "did not cross … in a truck but walked across near Sasabe, Arizona" | yes | mode undetermined (truck and walk in one clause); Arizona |

**Pipeline behaviour at `06278ed`** (`tests/diag2-review-fixes.test.ts`; output in `pipeline-before.txt`). The base is EG12: a single person, form EWI AFOOT, near Sasabe, AZ.
- **Issued findings (defect):**
  - a negated truck crossing ("never crossed") → `F-ENTRY-MODE`;
  - a hypothetical one ("If he had crossed …") → `F-ENTRY-MODE`;
  - a denied crossing near Columbus, New Mexico → `F-ENTRY-PLACE`.
- **Protected downstream, no finding issued:** a denied truck crossing followed by an affirmed crossing on foot.
  - The mode comparison already requires a single mode across the subject's crossings: {vehicle, foot} is ambiguous.
  - The place comparison is skipped when any affirmed crossing names the form's state.
  - The helper was still wrong here; the pipeline was not.
- **Found by a new positive control (vocabulary gap, not polarity):** "crossed … in the back of a truck" was not read as a vehicle crossing.

**Correction (helper):**
- **Negated, denied and hypothetical crossings are no longer crossings:** "never", "not", "n't", "denied", "denies", "refused", "would", "could", "might", "may", "will", "should", "if he …", "unless he …", governing the crossing verb within three words.
- **These are removed before testing for a crossing word, together with:** infinitives ("planned to cross"), and what followed a crossing ("after crossing").
- **"… did not cross in a truck but walked across …":** now splits at "but" before a new crossing verb, so the affirmed crossing is read alone.
- **The vehicle wording now includes:** "in the back of / in the bed of / under the seat of a truck, pickup, …".
- **A negation of something else does not cancel a crossing:** "has never been inspected and crossed the river on foot" is still a crossing.
- **Unchanged:** attribution, event scope (last or unscoped entry; corrected answers excluded) and multi-person routing.

**Pipeline after the correction:**
- **No finding:** denied, negated and hypothetical truck crossings, and denied or hypothetical crossings in another state.
- **Still no finding:** a denied truck crossing followed by an affirmed crossing on foot, and "did not cross in a truck but walked across".
- **Still a finding:**
  - affirmed truck crossings (including "in the back of a truck") → `F-ENTRY-MODE`;
  - an affirmed crossing in New Mexico → `F-ENTRY-PLACE`.
- **Still routed as an account, not a finding:** an unattributable affirmed truck crossing between two redacted men.

## 2. Order-claim suppression
**Pipeline behaviour at `06278ed`:** the narrative-to-narrative rule withheld every removal-related inconsistency that cited an order and no completed removal.
- **Two different dates for the same removal order** (06/20/2015 vs "this same removal order was entered on 03/11/2016"): **withheld (defect)**.
- **An explicitly identified different owner** ("… was entered against the subject's brother, not against the subject"): **withheld (defect)**.
- **Order executed vs order never executed:** already kept. The executed statement is a completed removal, so the rule's own condition excluded it (an existing safeguard, not a regression).
- **The false inference** (an order vs "no removal", "never deported" or "never executed"): withheld, correctly.

**Correction:** the rule now withholds a claim only when all of the following hold:
- every cited statement is either a removal order or a negative statement ("no removal", "never deported", "the order was never executed", "never departed");
- exactly one order statement and at least one negative statement are cited;
- no cited statement describes a completed removal (an executed order counts as one).

Claims citing two order statements (a date or owner conflict) or an executed order are kept. **After the correction:** the date and owner contradictions are issued as findings (routed). The execution-state contradiction is still kept. All three false inferences are still withheld, including EG08's two live claims (the existing `diag2-fixes` test).

## Validation
- **Tests:** 428/428 (417 at `06278ed`), with 10 pipeline tests in `tests/diag2-review-fixes.test.ts` and 1 helper test added to `tests/diag2-helpers.test.ts`.
  - **On `06278ed`:** 6 of the 10 pipeline tests fail (the reproductions and the vocabulary-gap control). The 4 that pass there are the preservation controls and the downstream-protected examples.
- **Other checks:** `tsc --noEmit` is clean. `next build` succeeds; it was run on this commit in the worktree with a real `node_modules` (this worktree's linked `node_modules` cannot be resolved by Turbopack).
- **Replays (post-observation; no model calls):** all 220 saved runs (1,490 distinct records per mode), compared with `06278ed`, in every mode (stub, stub-mismatch, stub-failall, recon).
  - **0 records changed in every mode.** Sentence-ID remap logs are identical.
  - **Why nothing changed:** no saved narrative contains a negated or hypothetical crossing, or a genuine contradiction about an order, so these corrections show only in the tests.
- **Locked scorers on the offline rebuilds:** identical to `06278ed`.
  - diag-1: 20/20.
  - diag-2: 30/30. EG02, EG05, EG07 and EG08 are still recovered.

## Limitations
- **Negation patterns:** negation is recognised only when it governs the crossing verb within three words. Distant or unusual phrasings ("at no point did he cross in a vehicle") may still be read as crossings.
- **The order rule** classifies statements by wording. A negative statement that is not phrased as a removal denial, non-execution or non-departure is not treated as negative, so such a claim is kept (and routed), not withheld.
