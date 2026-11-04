# Contradiction compatibility: one focused implementation round

**Status:** development fixes, offline only. **No model calls. Not evaluated. Not a new measured accuracy result.**
- **Branch:** `improve/contradiction-compat-1`, from checkpoint `286d42d`.
- **Preserved:** `286d42d` (branch `improve/diag-fixes-1`) and the live-run evidence (`experiment/diag-fixes-live-1`, `76ab8a1` and `23c19e7`) are unchanged.
- **Origin of the targets:** the two incorrect model findings and the DU03 explanation note come from the live verification of `286d42d` on reused development cases. The fixes are therefore **post-observation**.
- **Unchanged:** labels, expected answers, scorers, adjudications, historical results and the presentation. Nothing merged, pushed or deployed.

## How the two live findings passed verification (traced in `lib/review/review.ts`)
**C037-X1 `I-2`:** "smuggler-assisted crossing, whereas form lists EWI AFOOT" (S19 and `entry.manner`).
- The existing manner check withheld a claim only when every cited sentence had an **extracted** category equal to the form's.
- S19's extracted quote did not pass the manner-wording test. `MANNER_RE` contains `smuggl` followed by a word boundary, which never matches "smuggler".
- So S19 had no category, the check did not apply, and the claim was issued.

**C021-X1 `I-3`:** "NEGATIVE but narrative documents prior admission and overstay" (S33 and `history.immigration_record`).
- No step asked whether the cited statement is history that a NEGATIVE record covers.
- Exact quotes, a single-person narrative and two sources were all the claim needed.

## What changed
**1. Manner of entry: attributes compared independently.**
- **Inspection category:** without inspection vs admitted.
- **Mode of travel:** foot, vehicle, boat or air, only when the form code states one (`AFOOT`).
- **Assistance is neither:** help from a smuggler, guide or "coyote" is compatible with every form code. A sentence whose only manner wording is assistance states no category (`conflictManner`).
- **When a manner claim survives:** only when a cited statement asserts an **incompatible** category, or an incompatible mode for a crossing (`crossingMode`, which needs a crossing or entry verb and exactly one mode).
- **Otherwise:** the manner part is withheld. Any date or place part the cited text supports is kept, as before.
- **Without a fact extraction:** the check now also runs, using the source's own wording.
- **Unchanged:** the attribution checks that follow (several people: routed, not asserted).

**2. NEGATIVE immigration record: the field's scope.**
- **Documented scope:** the review instructions (prompt B) and the deterministic history rules use the field for:
  - prior removals or deportations;
  - removal orders;
  - prior immigration arrests, apprehensions or returns.
- **The check:** a model conflict with a NEGATIVE record is kept only if a cited statement describes such history (`describesRecordHistory`).
  - This is deliberately inclusive: any removal wording, or explicitly prior immigration history, also counts.
  - A lawful admission, a visa, an overstay or current charge wording ("is removable under Section 237…") does not count.
  - The claim is withheld and recorded as invalid, so model routing reasons that only repeat it are not kept.
- **Unchanged:** history conflicts that rest on in-scope statements go through the existing attribution and subject checks. The deterministic `F-HISTORY`, `F-HISTORY-3` and `F-HISTORY-ORDER` are untouched.

**3. DU03 explanation.**
- **The cause:** when a model "consistent" verdict was downgraded for lack of verified support, the generic text ("no verified statement … was found") was kept whenever the model supplied evidence. That happened even when the requirement check had reached the same verdict with a specific reason.
- **The change:** that specific reason and its evidence are now used, with a note that the model's "consistent" was not adopted.
- **DU03 now reads:** "S7 records a removal order, but the record does not state that the order was executed or that anyone departed under it". The verdict is still "needs human review" and the case is still routed.
- **Disclosure kept:** the extraction-failure text ("the fact extraction did not complete") is never replaced.

**4. DG10 is not changed.** Its mixed concern (manner and place in one model sentence) is left unresolved: no general correction is supported by the evidence.

## Tests
- **Results:** 395/395 (383 at `286d42d`). The new file is `tests/contradiction-compat.test.ts`, with 12 tests.
- **Reproductions:** the actual live claims for C037-X1 and C021-X1 (both withheld; the planted C037-X1 date conflict kept), and DU03's live path (a model "consistent" citing S7). The DU03 test also checks the extraction-failure disclosure.
- **Paired manner controls:**
  - **Compatible:** smuggler or guide assistance, the same category plus assistance, an exact quote with no manner ("travelled by bus to Reynosa"), and smuggler involvement against an admitted (B2) code.
  - **Genuine (kept):** admitted with a B2 visa vs EWI AFOOT; a crossing hidden in a car vs AFOOT; an illegal river crossing with a smuggler vs B2.
  - **Unresolved attribution:** a redacted person's admission is routed, not asserted.
- **Paired record controls:**
  - **Compatible:** admission, overstay, and current charge wording (exact quote).
  - **Genuine (kept):** a prior removal; a prior Border Patrol apprehension and voluntary return.
  - **Unresolved attribution:** a redacted person's deportation is routed, not asserted.
- **Helper tests:** mode and record-scope helpers.
- **One existing assertion widened** (`review.test.ts`, C037-CIT charge-fit claim): the claim is now withheld one step earlier ("same manner of entry") because the manner check also runs without an extraction. Either reason withholds it, and the finding is still not issued.
- **Other checks:** `tsc --noEmit` is clean and `next build` succeeds.

## Replays (no model calls): 1,432 saved results, compared with `286d42d`
| Mode | Records changed | Findings | Charge check | Routing |
|---|---|---|---|---|
| stub | 11 (text only) | none | none | none |
| stub-mismatch | 0 | none | none | none |
| stub-failall | 0 | none | none | none |
| recon | 32 | −12 C021-X1 `I-*` (S33 vs NEGATIVE record) | C013 (1 record): needs review → consistent | none |

Every change was inspected.
- **C021-X1 (12 recon records):**
  - The removed `I-*` findings are the admission/overstay claim, already adjudicated as a false flag in `eval/adjudications.json` ("A lawful B2 admission does not contradict a NEGATIVE immigration record").
  - The planted `F-ENTRY-DATE` is kept in every record.
- **Model "accounts" no longer routed (recon; cases C001, C001-CIT, C012-M2, C013, C013-CIT, C013-X1, F051-C, F055):**
  - **Same-manner claims:** "illegal entry by swimming and walking" vs PWA (AFOOT), and "entered illegally" vs PWA.
  - **Claims about entry into Mexico.**
  - **Claims against form values that are unknown** ("0 mile(s) of UNK", "Unknown Date"; F051-C, F055, C012-M2).
  - **C001/C001-CIT:** the place account (Matamoros/Rio Grande vs "5 mile(s) S of LAR") is **kept**, reworded without the manner part. The "travelling by car" claim is withheld: the cited sentence states no car.
  - **Routing:** every one of these cases is still routed, for its other reasons. No routing outcome changed in any record.
- **C013 (1 recon record):** the charge check is "consistent". It had been qualified only by a same-manner account that is not a conflict. The charge's support is verified evidence, as the code requires.
- **Text only (stub; DU03, CAP-E3U, CAP-E4U, F051-C, F051-E, C119-CIT):**
  - the requirement's own reason now carries the note "(The model reported the charge as consistent; that is not adopted without verified support.)";
  - F051-E now names its unattributed statement (S25) instead of the generic text.

**Also checked:**
- **Sentence-ID remap logs:** identical.
- **diag-1 rebuild (locked scorer):** the same checks pass. Only DU03's charge-check explanation text changed. DG02 and DG07 are recovered as before, and DU02 and DU03 are unresolved and routed as before.
- **The 28 live outputs of `286d42d`, replayed:** only the C037-X1 `I-2` and C021-X1 `I-3` findings (and the routing reasons resting on them) are removed.

**Lost detections:** none. No planted label depends on a removed finding, and no case lost routing.

## Limitations and not changed
- **`MANNER_RE`** (`smuggl` followed by a word boundary) is unchanged here, to avoid widening the manner wording other checks rely on. The conflict check no longer depends on it.
- **The mode test is narrow by design:** it acts only when exactly one mode is stated together with a crossing or entry verb. Sentences with several modes (crossed on foot, then drove) are undetermined and do not create a conflict.
- **Still open:**
  - other model `I-` claims outside these two attributes;
  - DG10's mixed concern;
  - the C037-X1 charge-check qualification, which also rests on the model's own citation concern and is unchanged.

## Proposed fresh, locked evaluation (outline only; not run; needs authorization)
**Purpose:** an unbiased check of the engine on cases none of the fixes were written against.

**Independent authorship:**
- **Who writes the cases:** someone who has not worked on the engine and has not seen its outputs. Possible authors are a teammate outside development or a sponsor point of contact.
- **What they work from:** only the case template and `config/references.json`.
- **None are available today:** the repository has no independently authored cases. The legacy and fresh cases are team adaptations, and diag-1 and capability-1 are team-authored and have now been used for development.
- **If no independent author is available:** the set must be labelled "team-authored fresh (diag-2)", not independent validation.

**Cases (30), written and locked before any engine output is seen:**
- **12 established issues**, each stated in the source about the subject:
  - 2 manner conflicts (one category, one mode);
  - 2 NEGATIVE-record conflicts (a completed removal; a prior apprehension and return);
  - 2 entry-date conflicts (pronoun-linked; designated subject among several);
  - 1 entry-place conflict;
  - 3 citation mismatches (8 U.S.C. 1326 with an explicit no-removal check; a B2 admission under 212(a)(6)(A)(i); never admitted under 237(a)(1)(B));
  - 2 missing elements (manner; disposition).
- **10 matched negative controls:**
  - smuggler or guide assistance with EWI AFOOT;
  - a B2 admission or overstay with a NEGATIVE record;
  - an executed removal order under 1326;
  - an identity-document paraphrase;
  - a statute citation inside a sentence;
  - a corrected entry year;
  - current removal proceedings;
  - an entry into Mexico before the U.S. entry;
  - a same-manner paraphrase;
  - a complete case.
- **8 genuinely unresolved:**
  - a removal order with execution unknown;
  - an unrelated warrant executed;
  - a relayed "he was deported" with two referents;
  - two redacted people with different entry years;
  - two unexplained accounts of one entry;
  - a redacted person's admission against EWI;
  - "one of the group had been ordered removed";
  - a NEGATIVE record with "See Narrative" history.

**Locked before the run** (SHA-256 `LOCK.json`, committed before any call):
- the cases, expected answers and checks;
- the scorer (the `score-diag.ts` pattern: detection, no-finding, citation, routing and no-contradiction checks);
- the plan and the driver.

**Engine:** one frozen commit, freshly built. The BUILD_ID is checked by the driver. Settings are unchanged.

**Run:**
- 30 reviews, each once, sequentially, concurrency 1, no reruns.
- **Normal budget:** 90 model requests (30 × 3).
- **Hard maximum:** 180 attempts (30 × 3 × 2). A review is not started if it could exceed this.
- **Stop:** after 2 consecutive HTTP/server errors, or 3 consecutive reviews in which every model call failed.

**Report:**
- **Locked-check outcomes:** detections, negative controls and unresolved routing, reported separately.
- **Every finding adjudicated against the source:** by the case author where possible, otherwise by the team, recorded separately.
- **Completion and latency.**
- **No combined percentage** with the 54-issue benchmark, and no target claim.
- **No tuning** between locking and reporting.
