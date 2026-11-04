# diag-2 fixes: one consolidated correction checkpoint

**Status:** development fixes, offline only. **No model calls. Not evaluated. Not a new measured accuracy result.**
- **Branch:** `improve/diag2-fixes-1`, from `44a1dae`.
- **Locked diag-2 set:** the lock commit (`81e3c1e`) is cherry-picked here as `0444f1e`, so the tests can read the locked cases. Its files are byte-identical to the original, and the LOCK hashes verify.
- **Preserved, unchanged:**
  - checkpoint `44a1dae`;
  - the diag-2 lock, raw outputs, scores and adjudications (`experiment/diag-2`, `81e3c1e` and `d1457c3`);
  - all cases, labels, scorers, references and historical adjudications.
- **No adjudication corrections were needed.**
- **Labelling:** every diag-2 and diag-1 rebuild below is **post-observation development verification**, written after seeing those results. It is separate from the historical 54-issue benchmark and is not an accuracy claim.

## Fixes (general rules; no case IDs; identity is never taken from matching values)
**1. Partial form dates** (`formYear`).
- **What is read:** the form's year at whatever precision the form states it: full date, MM/YYYY or YYYY. "Unknown Date, Unknown Time" gives nothing, and a clock time is not a year.
- **What is compared:** only the year, so a month or day is never invented.
- **Unchanged:** the existing attribution and multi-person routing rules apply.

**2. Crossing mode** (`crossingClauses`, `crossingMode`, `F-ENTRY-MODE`).
- **Where the crossing is read from:** the source text's own crossing clauses. A crossing the extraction did not quote is still covered: EG02's extraction quoted only the warehouse-release sentence.
- **What is kept apart:** approach travel, smuggler help, transport after the crossing ("…, and a second smuggler drove the group…", "after crossing, he was taken by car…") and infinitives ("allowing him to enter") are separate from the crossing.
- **What counts as a conflict:** the form code states a mode (AFOOT, vehicle, boat), and the subject's last crossing states exactly one other, incompatible mode.
  - A raft and on foot are not distinguished.
  - A form code with no mode (EWI) is not compared.
- **Charge check:** a mode-only conflict is reported and routed, but it does not qualify a manner-based charge, because the inspection category agrees.
- **Several people described:** an unattributable vehicle crossing is routed as an account, never a finding.

**3. Entry place** (`namedStates`, `F-ENTRY-PLACE`).
- **What is compared:** U.S. states named explicitly, as full names or as postal abbreviations after a comma (upper case only), in the form's place and in the subject's crossing clause.
- **What counts as a conflict:** each names exactly one state, and they differ.
- **Not compared:**
  - nearby places;
  - the same state in other words;
  - a form place without a state ("5 mile(s) S of LAR");
  - an unknown form place;
  - a state named for travel after the crossing;
  - two states in the crossing;
  - sectors.
- **Several people described:** unattributable statements are routed.

**4. Removal requirement (8 U.S.C. 1326)** (`orderExplicitlyUnexecuted`, `checkChargeRequirement`).
- **A different kind of order:** an order whose non-execution the record states explicitly is no longer treated like an order whose execution is unknown.
- **What decides it:** an unexecuted order alone proves nothing. The requirement is decided by the existing subject-specific checks: an explicit no-history record check, the subject's own denial, or a NEGATIVE record.
- **With none of those:** it stays unresolved, with an explanation that says the order was not executed.
- **Unchanged:** unknown execution stays unresolved, and an executed order still supports the charge.
- **Found while tracing EG08:** the agency title "Deportation Officer [X]" was read as a prior removal.
  - That made the requirement look supported, and blocked the denial check.
  - Agency titles and units ("Deportation Officer", "Enforcement and Removal Operations") are now not events. They are removed, preserving length, before the prior-removal readers run.

**5. Event chronology** (`accountConflicts`).
- **The change:** two entries in one account are not "two accounts of the last entry" when the earlier one ended (a return, departure, removal or voluntary return stated after it), or when the later statement marks itself as another entry ("again", "re-entered", "came back").
- **Unchanged:** genuine conflicting accounts of one entry are still reported.

**6. Narrative-to-narrative claims about orders** (review step 1g).
- **The rule:** a model inconsistency between narrative statements about removal that rests on an order, with no cited completed removal, is withheld. An order is compatible with "never deported", "no removal" or "the order was not executed".
- **Unchanged:** claims citing a completed removal are kept.

**Explanations:**
- **UN01/UN02:** the "manner unknown" note says "The selected charge depends on this fact" only when the selected charge records a manner requirement. For 8 U.S.C. 1326 it now says only "A person should confirm it."
- **EG09 `M-E6` (examined, not changed; uncertain):**
  - **What the narrative says:** the subject was admitted until 01/08/2020 and "has not left the United States since". The encounter was in 2024.
  - **What it does not say:** that he lacks status, overstayed, or has no documents. The status reader finds no such wording, so E6 is reported missing.
  - **The open question:** an overstay follows from the dates, but deriving lack of status from date arithmetic would be a new inference. The record could contain an extension or change of status that the narrative omits.
  - **Decision:** the team cannot say with confidence whether "missing" or "established" is right, so the behaviour is left unchanged and recorded as uncertain.

## Reproduction first, then controls
- **Reproductions:** `tests/diag2-fixes.test.ts` (18 tests) was run against `44a1dae` before the fix. Output: `f2-repro-44a1dae.txt` in the bundle.
  - **Every reproduction failed at `44a1dae`:** EG02, EG04, EG05, EG07, EG08 (charge check and order claims), UN01/UN02 wording, the agency title, and the partial-date helper.
  - **The preservation controls passed at both:** approach and transport travel, same-precision dates, nearby places, completed removal vs "never deported", and genuine chronology conflicts.
- **Controls per defect:**
  - **Positive:** the reproduction plus a varied wording, such as the trunk of a car, or a year-only form date.
  - **Negative:** same year at a different precision; raft vs AFOOT; nearby places; a form place with no state; executed and unknown orders; a genuine conflicting account; a genuine completed-removal conflict.
  - **Ambiguous:** two redacted men with different years; an unattributable vehicle crossing; two states named in one crossing.
- **Helper tests:** `tests/diag2-helpers.test.ts` (4 tests).
- **Two existing assertions updated, with comments:**
  - `scope-attribution.test.ts`: an unattributable statement naming Arizona against the base form's "near Hidalgo, TX" is now routed for place as well as date. Still no finding.
  - `contradiction-compat.test.ts`: "crossed … hidden in a truck …, then walked to the road" now reads as a vehicle crossing, because the walk afterwards is its own clause. A crossing that is genuinely two modes is still undetermined.

## Validation
- **Tests:** 417/417 (395 at `44a1dae`).
- **`tsc --noEmit`:** clean.
- **`next build`:** succeeds. It was run on this commit in the worktree with a real `node_modules`; the new worktree's symlinked `node_modules` cannot be resolved by Turbopack, an environment limitation.

**Replays (no model calls):** every saved result is replayed, comparing `44a1dae` with this checkpoint.
- **Coverage:** 220 runs, 1,496 records per mode:
  - the 142 historical runs;
  - the 20 diag-1 runs;
  - the 28 live-1 runs;
  - the 30 diag-2 runs.
- **Sentence-ID remap logs:** identical.

| Mode | Records changed | Findings added | Findings removed | Charge check | Routing |
|---|---|---|---|---|---|
| stub | 13 | F-ENTRY-PLACE (EG07, DG10), F-ENTRY-MODE (EG02), F-ENTRY-DATE (EG05, EG06), C-1 (EG08) | F-ACCOUNT (EG04) | EG08 → likely mismatch | none |
| stub-mismatch | 13 | same | same | EG08 | none |
| stub-failall | 9 | same, except EG05 (its year needs the extraction) | same | EG08 | none |
| recon | 18 | same | F-ACCOUNT (EG04); I-1, I-2 (EG08); I-1 (DG10, EG06; superseded by the deterministic finding citing the same sentence) | EG08 → likely mismatch | EG02, EG05, EG07 now routed |

Every changed record was inspected.
- **Recovered issues (diag-2):**
  - **EG02:** `F-ENTRY-MODE` (S7, the truck crossing); the charge stays "consistent".
  - **EG05:** `F-ENTRY-DATE` (S7, 2021 vs 04/2018).
  - **EG07:** `F-ENTRY-PLACE` (S5, New Mexico vs near Nogales, AZ).
  - **EG08:** "likely mismatch" (`C-1`). The basis is S7, the record check showing no removal of the subject, with a note that S5's order was not executed.
  - **EG06:** now also detected deterministically (2016 vs 10/2013). Before, only the model raised it.
- **Removed false findings:** EG04 `F-ACCOUNT`; EG08 `I-1` and `I-2`.
- **diag-1:**
  - **DG10:** its model finding is replaced by the deterministic `F-ENTRY-PLACE` (Texas vs "near Calexico, CA"), still citing S6 and the field.
  - **DU01:** S7 (2010 vs form 2018) is now routed as an unattributed account, which meets the locked diag-1 routing check (it failed in the rebuild before).
- **Historical cases:**
  - **No finding, charge check or routing outcome changed in any historical benchmark case.**
  - **FS10 (2 records):** a new routed account for S8, "[X] stated that she entered with her cousin in 2022", against the form's year-only "2021". The statement is unattributable (several redacted people), so it is routed, not asserted. The case was already routed.
  - **G09 (3 records):** wording only ("The selected charge depends on this fact").
- **Regression found during the replay, and fixed before this checkpoint:**
  - **The regression:** C001's "after crossing, he was taken by car to San Antonio, Texas" was read as a vehicle crossing, creating a routed account in about 110 C001-family records.
  - **The fix:** clauses introduced by "after crossing", "once across" or "having crossed" are now treated as what followed the crossing, with a helper test. The final replay shows no C001 change.
- **Locked scorers on the offline rebuilds (post-observation):**
  - diag-1: 20/20 (19/20 at `44a1dae`).
  - diag-2: 30/30 (25/30 for the `44a1dae` rebuild; 26/30 live, because UN04 passed live but fails in the `44a1dae` rebuild due to a known limit of the reconstruction).
- **Lost detections:** none. **New findings in negative controls:** none.

## Remaining limitations
- **Dates:** only the year is compared. A month conflict within the same year (form 04/2021, narrative "June 2021") is not reported. The date check needs the extraction's year: with a failed extraction, EG05 is not detected (stub-failall).
- **Place:** only explicit, different U.S. states. A wrong city in the same state, or a sector, is not compared, and a form place without a state is never compared.
- **Mode:** the clause reader is pattern-based. Unusual sentence shapes may hide a crossing clause or merge it with travel.
- **Agency titles:** only "Deportation Officer", "Enforcement and Removal Operations" and "Removal Operations" are covered.
- **EG09 `M-E6`:** uncertain, see above.
- **Other open items, unchanged:** DG10's mixed model concern, and the identity-document observations in negative controls.

## Not done
No model calls, new diagnostic set, full evaluation, merge, push, deployment or presentation change.
