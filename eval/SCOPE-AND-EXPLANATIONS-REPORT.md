# Event scope for model claims; explanations, routing and qualification that follow accepted evidence

**Status:** one offline correction checkpoint on `improve/scope-explanations-1`, from `452dcb8`. **No model calls. Not evaluated.**
- **Preserved:**
  - `452dcb8`;
  - the live-452dcb8 freeze, results and raw outputs (`experiment/live-452dcb8`: `a536978`, `84b471e`).
- **Count correction:** recorded additively on that branch (`a0a88f0`, `RESULTS-CORRECTION.md`). The live adjudication contains **17 correct, 17 valid observations, 1 incorrect and 1 debatable**, not the "19 / 15" printed in `RESULTS.md`.
- **Unchanged:** labels, scorers, references and historical files.
- **Labelling:** the diag-1, diag-2 and live rebuilds are **post-observation development verification**, separate from the historical 54-issue benchmark.

## Reproduced first (`tests/scope-explanations.test.ts`, run on `452dcb8`)
On `452dcb8` the 6 live reproductions fail, together with the mixed-claim scope control. The 4 preservation controls pass. Output: `pipeline-tests-before.txt`.

| Defect | On `452dcb8` |
|---|---|
| EG09: model claim comparing the explicitly **first** 2005 entry with the form's last-entry date, place and manner | issued as `I-1` |
| UN01: the model's "The narrative confirms a prior removal" kept as the charge-check explanation | kept (same verdict as the requirement check, model evidence present) |
| C021-X1: the explanation and the reason "Conflicting entry dates and entry manner" kept after the manner claim was withheld | kept; charge "needs human review" |
| C037-X1: "conflicting information about the manner and date of entry"; reason "dates, places, and manners" | kept; charge "needs human review" |
| EG06: a date-only model concern qualifying a manner-based charge | "needs human review" |
| UN04: an unattributed two-person account about entry **years** qualifying a manner-based charge | "needs human review" (an account with no field was treated as being about the manner) |

## What changed (all in `lib/review/review.ts`, plus one scope helper in `facts.ts`)
**1. Event scope for model claims (step 1h).**
- **The rule:** the form's entry fields record the **last** entry. A cited sentence whose entries are all explicitly first or previous cannot contradict them. This uses the deterministic comparison's own scope rule: `priorEntryOnly` from `entryScope`, with `firstEntryIsOnly` so that a "first and only" entry still counts as the last.
- **What happens to such a claim:**
  - those sentences are removed from it;
  - a part the remaining last-entry evidence supports on its own is kept and restated from the record (a differing year or place, or an incompatible manner);
  - with nothing left, the claim is withheld as invalid.
- **Unchanged:** person and event safeguards (other-country entries, attribution) still apply first.

**2. The deciding requirement explains the verdict.**
- **The rule:** when the requirement check reaches the same unresolved verdict as the model, its explanation and evidence replace the **model's own prose**.
- **Never replaced:**
  - explanations the code itself wrote, such as "Unresolved: the model's verdict is 'likely mismatch' …";
  - the extraction-failure disclosure.

**3. Withheld claims take their dependent assertions with them.**
- **Unsupported facts:** record facts that only claims **withheld as invalid** asserted, and that no kept finding or routed account supports. A claim withheld only because its quote could not be verified is not counted, so its reason stays (existing control).
- **Routing reasons:** model reasons asserting a conflict about such a fact are removed. A remainder that only qualifies the reason is removed too.
- **Charge-check concerns:** these facts are set aside.
- **Kept:** the supported fact's own routing reason ("Entry date differs from the form: …").
- **Not covered:** encounter-time reasons keep their own dedicated handling.

**4. Charge qualification follows the configured requirement.**
- **How a concern is read:** concern clauses are linked to record facts (`concernFacts`). Restatements of what the charge requires are skipped, and inspection or admission wording, including "port of entry", counts as the manner.
- **When the concern stops qualifying the charge:** a model "needs human review" becomes "consistent" only when all of the following hold:
  - the charge has a configured requirement;
  - the fact extraction completed;
  - the requirement is verified;
  - no requirement-check result contradicts it or leaves it unresolved;
  - every remaining concern fact is one the requirement does not depend on.
- **The requirement map:**
  - a manner-based charge depends on the manner only;
  - 8 U.S.C. 1326 depends on the entry and the immigration history, so entry concerns still qualify it.
- **Unattributed accounts:** an unattributed account comparing two narrative statements now gets the field they actually differ on (years → date, stated manners → manner, named U.S. states → place). With no single difference it has no field, and is treated as before.
- **Never forced to "consistent":** an unverified requirement, a manner concern, a failed extraction (timeout fallback), or an unresolved requirement result.

## Tests
- **Results:** 445/445 (434 at `452dcb8`).
  - **New:** `tests/scope-explanations.test.ts`, 11 tests: the 6 live reproductions plus paired controls.
  - **Controls:**
    - a genuine last-entry conflict is kept;
    - a mixed claim keeps only its last-entry part;
    - a "first and only" entry is compared;
    - an executed order stays consistent;
    - a contradicted requirement keeps its mismatch;
    - a genuine manner conflict keeps its reason and the qualified check;
    - a manner concern still qualifies;
    - an unverified requirement stays unresolved;
    - an unattributed account about the manner still qualifies.
- **No existing assertion changed.** Two first attempts were corrected after the full suite flagged them:
  - **Replacing explanations:** the first version also replaced code-written "Unresolved …" explanations and the extraction-failure disclosure.
  - **Reclassifying concerns:** the first version reclassified a concern even with a failed extraction (F075-X).
- **Other checks:** `tsc --noEmit` is clean. `next build` succeeds; it was run on this commit in the worktree with a real `node_modules`.

## Replays (post-observation; no model calls)
All **280 saved runs (1,550 records)** were replayed, compared with `452dcb8` in every mode. That is the 242 runs covered before plus the 38 live-452dcb8 records. The inventory is `replay-coverage-inventory.json`: every run in every checkout, nothing excluded, no duplicates.

| Mode | Records changed |
|---|---|
| stub | 0 |
| stub-mismatch | 0 |
| stub-failall | 0 |
| recon | 69 |

**Remap logs:** identical. **Baseline:** the `452dcb8` baseline equals the earlier 1,512-record replay on every shared record.

**Recon changes (69 records), every one inspected (`replay-diffs/diff-recon.txt`):**
- **Finding removed: EG09 `I-1`** (live-452dcb8, first-entry comparison).
- **30 charge checks "needs human review" → "consistent"**, all manner-based charges whose requirement is verified and whose remaining concern was only an entry date or place. That conflict is still reported and routed by its own finding or account in every record except CAP-B1N (below).
  - **Cases:** C037-X1, C119-X1, CAP-A1P, CAP-A2P, CAP-B1P, CAP-B2P, DG01, DG09, DG10, DS05, DS06, EG06, F036, F055, F055-H and G03.
  - **Reconstruction note:** in 13 of these records the replayed "model" text is the older code's own qualification ("unresolved conflict about the entry … ('Entry date differs from the form')"), because recon replays the saved final explanation. The behaviour on a real model output is shown by the pipeline tests.
- **Routing lost: CAP-B1N (2 records).**
  - **Why:** its only routing reason was that replayed older qualification text. Under the current code, CAP-B1N has no date finding: the earlier `F-ENTRY-DATE` was a false flag on this negative control, fixed earlier.
  - **Effect:** it is now "consistent" and not routed, which matches its expected "no flag".
  - **Caveat:** this is a reconstruction effect, not live behaviour.
- **Explanations now from the deciding requirement:**
  - **UN01:** "records a removal order … does not state that the order was executed" replaces "confirms a prior removal";
  - **UN07, UN08, CAP-E3U** (the model's "the narrative supports a prior removal …" is gone), **CAP-E4U, F051-C, F051-E, C119-CIT and DU03**.
  - Evidence moves to the requirement check's own (6 records).
- **Reasons asserting withheld conflicts removed:**
  - C012-M2, C013, C013-CIT, C013-X1 and F055 (manner, date or place claims withheld as invalid);
  - C021-X1 (immigration-history and manner reasons, while its date reason stays);
  - C037-X1 and F055-H.
  - Independent parts of mixed reasons are kept, for example "prior removal history inconsistent with positive immigration record; charge may not fit facts" in C013-CIT.
- **Accounts:**
  - **DS06:** an unattributed date account gains its field and merges with the date group. The case stays routed.
  - **C045-X1:** an account merged into an existing date group loses its model detail text. Routing and sentences are unchanged.

**Reconstruction limits:**
- Withheld model claims are not rebuilt, so the C021-X1 and UN04 charge-check corrections, which depend on a withheld or routed claim, show only in the pipeline tests.
- Recon replays the saved final verdict and explanation as the "model" output.

**Locked scorers on the offline rebuilds:** pass counts are unchanged.
- diag-1: 20/20.
- diag-2: 30/30.
- live-452dcb8 diag-2 outputs: 30/30.
- **The four recoveries hold:** EG02, EG05, EG07 and EG08.
- **The only changes in those rebuilds:**
  - DG01, DG09, DG10 and live EG06 become "consistent" and stay routed;
  - live EG09 loses its false `I-1`.

## Limitations
- **Fact links come from wording patterns.** The concern-to-fact mapping (`concernFacts`, `factsOf`) recognises entry date, place, manner, encounter time and immigration history wording. A concern naming none of these is left unchanged.
- **Event scope** relies on explicit scope words ("first", "previous", "prior", "earlier"). An earlier entry described without one is not recognised.
- **The two-person account field** is set only when exactly one attribute differs.
