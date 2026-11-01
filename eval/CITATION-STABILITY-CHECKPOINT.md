# Citation and charge-verdict stability: offline checkpoint (`improve/citation-stability`, from `ed42763`)

**Offline only:** no model calls and no evaluation. Post-tuning: every case discussed has been seen before.
- **Unchanged:** labels, scoring (v2.4), references, adjudications, the verified engine `2f54880`, `ed42763`, and all saved evidence.
- **Kept:** the timeout fallback and the visa clarification. The visa clarification is not counted as a recovery anywhere here.

## 1. Why citation detections appeared and disappeared
Sources: the citation verdicts of the 12 citation plants in every saved run (up to 28 runs per case, from the earliest runs to rc-int-1).

| Plant | Verdict history | Decided by |
|---|---|---|
| C001-CIT, C003-CIT, C013-CIT, C021-CIT, C037-CIT, C045-CIT, F036-C, FS05, DS12, G11 | `likely_mismatch` in nearly every run since the requirement rule existed | the **rule** (form field or subject statements), stable |
| **C119-CIT** | `likely_mismatch` in 2 of 18 runs (rc-full-1, one early run), otherwise `needs_human_review` | the **model** alone: the rule said "the narrative does not document a removal" (undetermined), and the model's verdict decided the outcome |
| **F051-C** | `likely_mismatch` in 1 of 13 runs | the **model** alone, over a record the rule found unresolved (the removal belongs to an unidentified member of the group) |

**Mechanism.** `checkChargeRequirement` returned either a mismatch, a routing note, or nothing, and review.ts let the more cautious verdict win. So:
- where the rule found the record **unresolved** or **undetermined**, a model `likely_mismatch` outranked it and became a detection;
- where the model said `consistent`, the result was routing.

The same record therefore gave different verdicts from run to run. The model also produced `likely_mismatch` alone on 9 cases without a citation plant across the saved runs (C013 ×5, C013-X1 ×4, C119-AMB ×2, C003-AMB ×2, F051-E, F075-X, DS10, C021-X1, F055-H), which were false-flag exposure.

## 2. The change (`lib/review/facts.ts`, `lib/review/review.ts`; +90 −8 lines in `lib`)
**The requirement check now reports what the record establishes** (`outcome`):
- **contradicted:** subject-specific evidence states the opposite → `likely_mismatch` from the rule;
- **unresolved:** the deciding statements cannot be attributed to the subject (several people with redacted names, or an unidentified group member) → a person decides;
- **undetermined:** the record neither supports nor contradicts the requirement → a person confirms;
- **supported:** subject-specific support exists (`supportsRequirement`).

**Two new source-based contradictions, each narrow:**
1. **The subject's record defers to the narrative** ("POSITIVE - See Narrative", naming no removal). All of the following must hold:
   - the narrative's IMMIGRATION HISTORY lists dated events;
   - **no removal, removal order, deportation or reinstatement of anyone** is stated anywhere in the narrative.

   Then the subject's referenced record documents no removal, so a prior-removal charge is contradicted. Any removal wording anywhere, even an unidentified person's, leaves the case unresolved.
2. **"IMMIGRATION HISTORY: None"** (or "NONE FOUND", or "No immigration history") counts only when the record check it reports is attributable to the subject under the existing attribution rules (a designation, or a one-person narrative) and no removal is stated anywhere. In a multi-person narrative it stays unresolved.

**Entry-manner charges now also read the source's own entry statements** (the timeout fallback's person–event reader) for sentences the extraction did not list, under the same attribution rules.

**Precedence in review.ts:**
- A rule contradiction stands against a model "consistent", and is reported with the rule's evidence even when the model also says mismatch.
- A model "mismatch" is not adopted when the record is unresolved, when the source supports the requirement (now also without an extraction), or when no statement or form value attributable to the subject contradicts the requirement. These go to a person, with the model's explanation attached.
- Charges whose references record no requirement are unchanged: the model's verdict still decides there, because the code can establish nothing.

## 3. Before/after evidence (saved extractions; review samples stubbed)
Each of the 89 cases in rc-full-1 and in rc-int-1 was replayed under `ed42763` and this branch, in four scenarios:
- the recorded extraction;
- every fact call failed;
- a model that always says `likely_mismatch`;
- a model that always says `consistent`.

The last two bracket what the model can do to the citation.

| Scenario (rc-full-1 runs; rc-int-1 runs the same unless noted) | Changed cases (any citation, finding or routing difference) |
|---|---|
| Recorded extraction | **C119-CIT:** `needs_human_review` → `likely_mismatch` (rule; evidence `history.immigration_record`, S25, S26). **C037-CIT:** still a rule mismatch; evidence adds S21 (its own crossing statement). *(rc-int-1: C119-CIT only)* |
| Every fact call failed | C119-CIT as above. C021-CIT, C037-CIT, DS12: same rule mismatch, now also citing the subject's statement (S4, S21, S9) |
| Model always "consistent" | C119-CIT as above (C037-CIT evidence too) |
| Model always "mismatch" | **Citation plants:** the rule decides, with rule evidence. **F051-C:** → `needs_human_review` (unresolved). **Non-plants downgraded to a person:** C013-X1 and C037-X1 (the source supports the charge), C001-M3, C003-M3, C037-M3, C135-M3, DS11, F051-E, G09 (nothing attributable contradicts it) |

Two further checks:
- **The 24 other saved runs with recorded extractions** (rc-verify-1, rc-hedge-1): recorded scenario, only C037-CIT gains S21 as evidence. Under an always-"mismatch" model, G09 and C003-M3 are downgraded and the citation plants keep the rule's mismatch.
- **No finding other than C-1 and no routing changed** in any realistic scenario (recorded, failed, consistent).

**Model dependence** (cases whose final citation differs between the always-"mismatch" and always-"consistent" models):

| | rc-full-1 runs | rc-int-1 runs |
|---|---|---|
| `ed42763` | 51 cases, including citation plants C119-CIT and F051-C | 48, including the same two |
| This branch | **40, with no citation plant** | **39, with no citation plant** |

The 40 remaining are cases where:
- the model's concern turns a supported requirement into routing (21; cautious, not a flag);
- the charge has no reference entry (19). The code can establish nothing there, so the model still decides.

**Scorer reading (reporting only; v2.4 citation outcome):**

| | Citation plants detected |
|---|---|
| `ed42763` | **10/12** (recorded, failed, consistent) or **12/12** (always "mismatch") |
| This branch | **11/12 in every scenario** |

## 4. What is now supported consistently, what is new, and what was lost
- **Now consistent:** all 10 previously stable citation plants keep a rule `likely_mismatch` under both model verdicts. Their evidence comes from the rule (form field, plus the subject's own statement where the source has one).
- **New, source-supported: C119-CIT**, now detected by the rule in every scenario (before: model-only, 2 of 18 runs). The basis:
  - the subject's record defers to the narrative;
  - the narrative's immigration history (S25, S26) runs from a 2004 B1 arrival through status changes, an overstay and denied reinstatement and appeal, with no removal;
  - no removal of anyone appears anywhere;
  - the narrative's own stated ground (S28) is 237(a)(1)(B) overstay.

  **Interpretation dependency:** "See Narrative" is read as the subject's record being the narrative's history. In this three-person narrative, the history section's own redacted name is not attributed, but no removal exists for anyone, so the subject's referenced record documents none.
- **Lost credit (deliberate): F051-C.** It was credited once (an early run), by the model, over an unresolved record. It now stays routed under every model verdict, as required: an unidentified group member may be the subject.
- **False flags:** none new. Model-only mismatches on non-plant cases (C013-X1, C037-X1, F051-E, G09, the M3 variants, DS11) are now routed instead of flagged.
- **Unresolved (routed by design):** F051-C. Cases whose charge has no reference entry still depend on the model.

## 5. Tests and checks
- **New:** `tests/charge-requirement.test.ts`, 7 tests. All 7 fail on `ed42763` and pass here. They cover:
  - C119-CIT under both model verdicts and both extraction states;
  - the referenced-record controls: a removal anywhere, no "See Narrative", no dated history;
  - C013 and C013-X1 (supported; a model mismatch is downgraded);
  - F051-C (and a named variant): routed under every verdict;
  - "IMMIGRATION HISTORY: None": one person contradicts; three people do not;
  - C037-CIT's entry manner from the source when the extraction fails;
  - a silent record: routed.
- **Changed existing test** (`tests/review.test.ts`, "fix 4 positive"): its C037 fixture states an illegal crossing in a one-person account, which the rule now establishes as a contradiction of the admission charge. The test now expects the rule's verdict and keeps the original premise in a variant with no manner statement (still "Unresolved").
- **Suite and type-check:** 307/307 tests pass; type-check passes.
- **Production build:** passes, BUILD_ID `SkddoAYtPjuoURK-Tsft8`.
- **Reproduction scripts** (`replay-round3`, eight `repro-*`/`rules-smoke`): identical to `ed42763`; 0 not as expected. Visa probe: 0 not as expected. Timeout-fallback tests pass.

## 6. Is a live comparison justified?
- **Not needed to establish the citation behaviour.** The verdicts of the 12 citation plants no longer depend on the model's citation verdict, which the always-"mismatch" and always-"consistent" replays show by bracketing. The remaining live inputs are the extraction (entry statements) and timeouts, which the replays with recorded and failed extractions already cover.
- **What a live run would add:** whether the review samples return verdicts outside the two bracketed ones in ways that matter. `needs_human_review` and `insufficient_information` rank below a rule contradiction, so they cannot change these plants.
- **If you want confirmation anyway:** a bounded run of the 12 citation-plant cases plus C013, C013-X1, F051-E, G09 and C119-AMB, once each. I would not run another full evaluation for this change alone.
