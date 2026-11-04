# diag-1 fixes: one consolidated implementation iteration

**Status:** development fixes, offline only. **No model calls, not evaluated, not a new measured accuracy result.**
- **Branch:** `improve/diag-fixes-1`, from `df11086`.
- **Commits:**
  - `6ab57f0`: the locked diag-1 data, unchanged; LOCK hashes verified.
  - `4f56870`: the fixes.
  - `d924152`: removal orders against a NEGATIVE record.
  - This report.
- **Unchanged:** diag-1 cases, expected answers, scorer, raw outputs and adjudications; all historical labels, scores and results; the presentation. Nothing merged or pushed.

## What was fixed (the five demonstrated defects, plus the qualification scope)
1. **Sentence segmentation and charge wording.**
   - **Splitter:** "U.S.C.", "C.F.R.", "Sec.", "Stat." and "Pub." are no longer sentence ends (`lib/text.ts`), so "8 U.S.C. 1326" stays in one sentence.
   - **Charge wording, independently:** a clause that is a charge, allegation or statutory requirement is never read as a past removal (`CHARGE_LANGUAGE_RE`). Examples: "charged under 8 U.S.C. 1326 as an alien found … after removal", "inadmissible under Section 212(a)(9)…, in that he was previously removed", "the charge requires a prior removal".
   - **Mixed sentences:** the decision is per clause, so factual clauses are kept ("He was removed to Mexico in 2014; he is now charged under 8 U.S.C. 1326").
2. **Removal event semantics.**
   - **Orders:** an order with no stated execution or departure ("ordered … removed in absentia", "a final order of removal") is not a completed removal (`statesRemovalOrderOnly`).
   - **Completed removals:** "was executed", "physically removed", "removed/deported to …", "departed", or an execution in another clause still count.
   - **Unchanged non-removals:** proceedings, processing, voluntary departure and negation are not removals, as before.
   - **Under a removal-based charge (8 U.S.C. 1326):** an order leaves the requirement **unresolved**. That means "needs human review", routed, never "consistent", and never a mismatch from a NEGATIVE record or a denial, because the order could be the subject's and its execution is unknown.
   - **Against a NEGATIVE record:**
     - the subject's own order is an "unclear" history item (`F-HISTORY-ORDER`);
     - an order whose subject cannot be attributed is routed as an unattributed account.
     - This was added in `d924152` after the replay showed F051 had lost its routing.
3. **Reported speech and attribution.**
   - **The rule:** a third party's reported statement ("The subject's cousin … told Agent [X] that he was deported") whose removal clause has only a pronoun for the person removed does not establish the subject's history. It is routed as an unattributed account, in any narrative.
   - **Kept:** explicit attribution still works ("… told agents that **the subject** was deported"; "The subject stated that he was deported"). The person-event analysis already separated speaker and experiencer; the history rule now respects it.
4. **Last-entry comparisons.**
   - **Unverifiable quotes:** where an extracted quote does not match the text (DG02: "with a guide" omitted), the source's own reading of that sentence is used (`withSourceEntries`), under the same attribution rules.
   - **Scope:** only last or unscoped entries support or contradict an entry-manner requirement. An explicitly first or earlier entry is excluded.
   - **Disagreement:** when the form and the last-entry statement disagree, that disagreement is reported (`F-ENTRY-MANNER`), and the charge check is qualified ("needs human review"), without treating either as authoritative or asserting a mismatch.
5. **Identity-document wording.**
   - **Now recognised:** "identity card", bare "identification" ("Neither man carried identification"), "papers" ("carried no papers of any kind"), and "documents of any kind".
   - **Still not identity documents:** immigration papers, and papers or documents "allowing" someone to enter or remain.
6. **Charge qualification scope.**
   - **Manner-based charges:** for INA 212(a)(6)(A)(i), 237(a)(1)(B) and 8 U.S.C. 1325, only a manner conflict, or an unattributed account about the manner, qualifies the charge check.
   - **Date and place:** entry-date or entry-place conflicts and accounts remain their own findings, still routed.
   - **Model concerns:** a model "mismatch" whose only stated concern is the entry place or date leaves a charge supported by verified evidence "consistent".

## Replay safeguard: explicit sentence-ID mapping (`scripts/remap-saved.ts`)
**How it works:**
- Saved results store their sentences, with IDs and offsets. Results that predate that field are rebuilt with a copy of the `df11086` splitter (`scripts/legacy-split-df11086.ts`).
- Each old sentence is mapped by offsets to the one new sentence that contains it, and every quoted item is verified in the new sentence.
- Items that cannot be mapped are **dropped and logged**, never re-pointed.
- Saved records are not modified.

**Logged results (`remap-final.jsonl`):**
- **Changed IDs in 12 records**, all from merged "U.S.C." sentences, except C037-M3: DG07, DU03, and capability-1 CAP-E2N, CAP-E2P, CAP-E3U and CAP-E4U (two records each).
- **C037-M3, two runs of 2026-10-29:** those results were saved by an even older splitter. **13 element sentence references** span several current sentences and were dropped.
  - Those two records were already replayed with misaligned IDs before this change. That is a pre-existing replay limitation, now disclosed rather than hidden.
  - The one resulting difference, `+U-E3` in one C037-M3 record ("reported present, but no valid sentence reference"), is a replay artefact of the dropped references, not a code effect.

## Validation
- **Tests:** 381/381 (366 at `df11086`), including 15 in `tests/diag-fixes.test.ts`.
  - **Post-observation reproductions:** DG02, DG07, DU02, DU03, DN06/DU01/DU02 and DG10.
  - **Varied controls:** for every fix, both directions.
- **Five existing assertions changed**, each commented:
  - an order "had been ordered removed" was a removal (`round2.test.ts`);
  - a date conflict qualified a manner-based charge (`review.test.ts`);
  - a date-only account qualified a manner charge (F010-X);
  - a model date concern qualified an admission charge (C021-X1);
  - C037 without a form manner: the narrative's verified S21 now supports the charge, and a narrative with no manner is still routed.
- **Other checks:** `tsc --noEmit` is clean. `next build` succeeds.

**Replays:** all 1,432 saved results (142 historical runs plus the 20 diag-1 runs), with no model calls.
- **Modes:**
  - **stub:** the saved extraction, with a fixed model stub that answers "consistent".
  - **stub-mismatch:** the same, with the stub's charge verdict set to "likely mismatch".
  - **stub-failall:** every fact extraction fails.
  - **recon:** the model's own claims and reasons rebuilt from each saved result.
- **Comparison:** the `df11086` code (baseline) against the final code.
- **Every changed finding, charge check and routing outcome was inspected.**

| Mode | Records changed | Findings | Charge check | Routing |
|---|---|---|---|---|
| stub | 212 | −M-N5 ×10 (CAP-E2N, E2P, E3U, E4U, DG07, DU03); −F-HISTORY ×2 (DG07, DU02); −C-1 DG02; +C-1 DG07; +F-ENTRY-MANNER DG02; +U-N5 ×2 (CAP-E3U) | 160 needs-review → consistent (scope, below); DG02 mismatch → review; DG07 review → mismatch; DU03 consistent → review | none |
| stub-mismatch | 52 | same findings | DG02, DG07 as above | none |
| stub-failall | 203 | same, except the DG02 items (no extraction) | 151 → consistent (scope); DG07, DU03 as above | none |
| recon | 83 | as stub, plus −U-N1 ×3 (DN06, DU01, DU02) and the C037-M3 artefact | 30 → consistent (scope); DG02, DG07, DU03 as above | DU03 not routed → routed |

**The charge-check changes to "consistent"** (stub 160 records; recon 30) all come from fix 6, and none from new support:
- **100 records (10 cases):** an unattributed account about the entry **date**: F010-X, F039-X, F075-X, C001-X1, C045-X1, C119-X1, G06, DS06, CAP-A2N, C021.
- **60 records (10 cases):** an entry-date conflict: DG01, DG09, DS05, C037-X1, C021-X1, CAP-A1P, CAP-A2P, CAP-B1P, CAP-B2P, G03.

In every one, the date conflict or account is still reported and **routed**; stub routing is unchanged in all records.

**Text-only changes (40 records):**
- **Removal-order explanation:** 13 + 2 records (the F051-C family and CAP-E3U under 8 U.S.C. 1326) now explain the removal order instead of "extraction did not complete" or "no verified statement". The status is the same.
- **Partial-review lists:** three diag-1 records no longer list N1 among model answers that did not arrive, because it is now decided from the wording.

## Results by category (offline; replays of saved inputs, not a measurement)
**DG02 recovered (stub and recon, and the reproduction test):**
- `F-ENTRY-MANNER` cites S7 ("most recently re-entered … by walking through the desert near Sasabe … did not present himself for inspection") and the form's `entry.manner` "B2". S5, the 2009 first entry, is not used.
- The incorrect `C-1` is gone, and the charge check is "needs human review", not a mismatch.
- The locked check passes.

**DG07 recovered:**
- The citation is `likely_mismatch` (`C-1`), on the subject's explicit no-removal record check and denial.
- The false `M-N5` and `F-HISTORY` (the split charge clause) are gone.
- The locked check passes.

**False flags removed:**
- DG02 `C-1`; DG07 `M-N5` and `F-HISTORY`; DU02 `F-HISTORY`; DU03 `M-N5`.
- `U-N1` in DN06, DU01 and DU02.
- `M-N5` in CAP-E2N, CAP-E2P, CAP-E3U and CAP-E4U (two records each). Their narratives cite "8 U.S.C. 1326/1325", their locked labels expect no N5 flag, and their charge-check outcomes are unchanged.

**False flags introduced:** none found.
- **CAP-E3U** now has `U-N5` ("cites the section but does not state the facts that satisfy it") instead of `M-N5`. The source says only "presented for prosecution under 8 U.S.C. 1326", so this is accurate.
- **`F-HISTORY-ORDER`** occurs in no saved record.

**DU03 (unresolved handling, reported separately from detection):** the charge check is now "needs human review" with a removal-order explanation, and the case is routed (previously "consistent", not routed). The locked check passes.

**DU02:** no history contradiction. S5 is routed as an unattributed account ("may be the speaker's or the subject's"). The locked check passes.

**Lost detections:** none. No planted label in any dataset depends on a changed finding. The charge checks of the planted citation cases (DG03, DG08, CAP-E2P, F036-C, FS05 and others) are unchanged, and no record lost routing.

**Still unresolved, and limitations:**
- **DU01:** fails its locked routing check in the rebuild, both before and after this change. Its routing item came from a model claim that the code withheld in the live run, and the reconstruction cannot rebuild withheld claims, whose evidence is not saved. Live, it passed.
- **DG01, DG09 and DG10 in recon:** still "needs human review", because the reconstruction replays the **saved** charge-check status, which already included the old qualification. The stub replay shows the narrowed behaviour.
- **What the replays can and cannot show:**
  - Stub replays use a fixed model answer.
  - Recon replays rebuild model output from what each result kept.
  - Neither shows how the live model responds to the new sentence boundaries or explanations.
- **The splitter still treats "U.S." as never ending a sentence** ("entered the U.S. He was …"). That is pre-existing behaviour, unchanged here.
- **Remaining third-party gaps:** the third-party speaker test recognises relations and roles (cousin, brother, wife, friend, employer, driver …). A third party named only by a redacted name, with no relation word, is still handled by the existing person-event and attribution rules.

## Bounded live-validation proposal (not run; needs authorization)
- **Purpose:** check the fixes against the live model.
- **Labelling:** reused, post-observation development verification, not an evaluation. The diag-1 cases are no longer fresh.
- **Candidate:** `d924152`, built once and frozen. Unchanged settings and retry limits.
- **Cases (28, each once, concurrency 1):**
  - all 20 diag-1 cases (with the locked checks);
  - 8 historical cases touched by the changes: CAP-E2N, CAP-E2P, CAP-E3U and CAP-E4U (capability-1 runner), and F051, F051-C, C021-X1 and C037-X1.
- **Budget:** normally 84 model requests (28 × 3); **hard maximum 168 attempts** (28 × 3 × 2).
- **Stop rules:** 2 consecutive HTTP/server errors, or 3 consecutive reviews in which every model call failed. No reruns.
- **Report:** locked-check outcomes, every finding adjudicated against the source, routing, completion, and differences from the diag-1 run separated into code and model variance.
- **What a fair test still needs:** a new, independently written fresh set (a "diag-2") would be needed for an unbiased check of these fixes.
