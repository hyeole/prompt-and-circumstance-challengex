# Citation and charge-verdict stability: corrected offline checkpoint (`improve/citation-stability`, from `ed42763`)

**Offline only:** no model calls and no evaluation. Post-tuning: every case discussed has been seen before.
- **Unchanged:** labels, scoring (v2.4), references, adjudications, `2f54880`, `ed42763`, and all saved evidence.
- **Kept:** the timeout fallback and the visa clarification. The visa clarification is not counted as a recovery.

**Correction:** this replaces the first checkpoint (`6699dbd`).

## 0. The review blocker and the correction
**The blocker.** The first checkpoint's `referencedHistory` treated three things together as proof that the subject had no prior removal:
- a form value that defers to the narrative ("POSITIVE - See Narrative");
- a dated list under "IMMIGRATION HISTORY";
- no removal wording anywhere.

The review showed that this list also passed under "Partial record only; older records were not available" and under "The following events concern his wife". **The underlying inference was unsound:**
- the pointer does not say whose the listed history is;
- a list does not say it is complete;
- the absence of removal wording is not an affirmative result.

**The correction** (`447ace2`): the inference is removed entirely (`referencedHistory` and its branch).
- **A contradiction now needs explicit evidence about the subject.** One of:
  - **its own record check reporting no immigration history.** All of these must hold:
    - there is exactly one IMMIGRATION HISTORY section;
    - its body is a bare negative result ("None", "NONE FOUND", "No immigration history", "Negative");
    - the check is reported within the three sentences before it and is attributable to the subject (a designation, or a one-person narrative);
    - no other person, group member or group is named from the check to the heading;
    - no removal is stated anywhere;
  - **a statement of no removal attributable to the subject** ("The subject stated that he has never been removed or deported"). It must name no other person, the form must not record a removal, and no removal may be stated anywhere.
- **Otherwise the requirement is undetermined (or unresolved), and the case goes to a person.**
- **Person mentions:** a relative noun anywhere ("[REDACTED] wife's fingerprints") now counts as another person.

**Result:** C119-CIT's new credit is gone. Its record has no subject-specific negative result, so it is undetermined and routed under every model verdict.

## 1. Why citation detections appeared and disappeared (unchanged finding)
In every saved run (up to 28 per case):
- **Stable:** 10 citation plants are decided by the rule in nearly every run.
- **Model-only:** C119-CIT (2 of 18 runs) and F051-C (1 of 13) were credited only when the model's `likely_mismatch` outranked a rule result of "undetermined" or "unresolved".
- **False-flag exposure:** the model also produced lone mismatches on 9 cases without a citation plant (C013 ×5, C013-X1 ×4, C119-AMB ×2, C003-AMB ×2, F051-E, F075-X, DS10, C021-X1, F055-H).

## 2. What the branch now does (`lib`: +82 −10 vs `ed42763`)
- **Three outcomes.** `checkChargeRequirement` reports one of:
  - *contradicted*: subject-specific evidence → rule `likely_mismatch`;
  - *unresolved*: the deciding statements cannot be attributed to the subject → a person decides;
  - *undetermined*: the record neither supports nor contradicts → a person confirms;
  - *supported* comes from `supportsRequirement`.
- **Precedence** (`review.ts`, kept from the first checkpoint, as accepted):
  - a rule contradiction stands against a model "consistent", and is reported with the rule's evidence;
  - a model "mismatch" is not adopted when the record is unresolved, when the source supports the requirement (now also without an extraction), or when nothing attributable to the subject contradicts the requirement. These go to a person, with the model's explanation attached.
- **Subject-specific contradictions recognised** (prior-removal charges):
  - the subject's NEGATIVE form record (existing);
  - the subject's own negative record check (new, as in section 0);
  - an attributable statement of no removal (new).
- **Entry-manner charges** also read the source's own entry statements, under the existing attribution rules (kept).

## 3. Before/after evidence (saved extractions; review samples stubbed)
Every case in rc-full-1 (89) and rc-int-1 (89) was replayed under `ed42763` and this branch, in four scenarios: recorded extraction; every fact call failed; a model that always says "mismatch"; one that always says "consistent". The 24 other saved runs with extractions (rc-verify-1, rc-hedge-1) were also replayed.

**Every change, realistic scenarios** (recorded, failed, "consistent"): only C-1 evidence on citation plants changes. No verdict, other finding or routing changes.
- **C037-CIT:** the same rule mismatch now also cites S21 ("crossed the US/MEXICO Border illegally"), its own crossing statement. This holds in the recorded scenario (rc-full-1 and the other runs) and when the extraction fails.
- **C021-CIT and DS12, when the extraction fails:** the same rule mismatch now also cites S4 and S9 (their own entry statements).
- **G11 (all realistic scenarios):** the same rule mismatch now also cites S9, "The subject stated that he has never been removed or deported" (an explicit subject-specific negative result), alongside the NEGATIVE record.

**Every change, always-"mismatch" model:**
- **Citation plants decided by the rule** keep `likely_mismatch` with the rule's evidence: C001-CIT, C003-CIT, C013-CIT, C021-CIT, C037-CIT, DS12, F036-C, FS05, G11.
- **To a person (`needs_human_review`):**
  - C119-CIT (undetermined) and F051-C (unresolved), both citation plants, lose their model-only credit;
  - non-plants: C013-X1 and C037-X1 (the source supports the charge); C001-M3, C003-M3, C037-M3, C135-M3, DS11, F051-E, G09 (nothing attributable contradicts it).
- **The 24 other runs:** G09 and C003-M3 go to a person; the plants keep the rule's verdict.

**Model dependence** (cases whose final citation differs between the always-"mismatch" and always-"consistent" models):

| | rc-full-1 runs | rc-int-1 runs |
|---|---|---|
| `ed42763` | 51 (citation plants C119-CIT, F051-C) | 48 (same) |
| This branch | **40, no citation plant** | **39, no citation plant** |

The rest are supported requirements a model concern routes (21) and charges with no reference entry (19).

**Scorer reading (reporting only; v2.4 citation outcome):**

| | Citation plants detected |
|---|---|
| `ed42763` | 10/12, or 12/12 when the model always says mismatch |
| This branch | **10/12 in every scenario** (C119-CIT and F051-C routed) |

## 4. Exact remaining gains, losses and unresolved cases
**Gains:**
1. **Stability.** No citation-plant verdict depends on the model's citation verdict. The 10 rule-decided plants give the same verdict and basis under both model extremes and with or without an extraction.
2. **False-flag protection.** A model-only mismatch no longer becomes a verdict on a charge with a recorded requirement unless the rule establishes a contradiction. That affects 9 non-plant cases under an always-"mismatch" model, and matches the historical exposure in section 1.
3. **Subject-specific evidence on existing detections:** C037-CIT S21, C021-CIT S4, DS12 S9 (when the extraction fails), G11 S9.

**No new detection.** C119-CIT's gain from the first checkpoint was removed with the unsound inference.

**Losses** (model-only credit, which the precedence rules now refuse):
- **C119-CIT:** undetermined; a person confirms the immigration history.
- **F051-C:** unresolved; an unidentified group member may be the subject.

Against the realistic replays the count is unchanged (10/12). Against a run where the model happened to say mismatch (rc-full-1's C119-CIT), it is one lower.

**Unresolved:**
- F051-C;
- C119-CIT, which needs a subject-specific negative result the record does not give;
- charges with no reference entry, which still depend on the model.

## 5. Tests and checks
- **`tests/charge-requirement.test.ts`:** 8 tests, all failing on `ed42763` and passing here.
  - **C119-CIT:** routed under every verdict and extraction state.
  - **The review's controls:**
    - **partial history:** "Partial record only; older records were not available";
    - **another person's history:** "The following events concern his wife";
    - **ambiguous section ownership:** "[REDACTED] wife's fingerprints …" before "None"; two immigration-history sections; "None available for review"; three people (F055).
  - **A removal anywhere:** unresolved.
  - **An explicit subject-specific negative result:** "Subject has never been removed or deported" → rule mismatch citing it. The same sentence about "His brother", or about a redacted name in a three-person narrative, is not a mismatch.
  - **The one-person "IMMIGRATION HISTORY: None"** (C037 with a reentry charge) → contradicted.
  - **Unchanged from the first checkpoint:** the C013 and C013-X1 controls; F051-C and a named variant; C037-CIT's manner from the source when extraction fails; a silent record.
- **Existing tests changed (`tests/review.test.ts`):**
  - **"fix 4 positive":** see the first checkpoint.
  - **"fix 4: a 'mismatch' that says the narrative does NOT document the requirement stays a mismatch" (C119-CIT):** its title is kept for traceability. It now expects `needs_human_review`, "Unresolved: the model's verdict is 'likely mismatch'…", because the record gives no subject-specific contradiction and a model mismatch cannot replace that.
- **Suite and type-check:** 308/308 tests; type-check passes.
- **Production build:** passes, BUILD_ID `ttHx9UikPQwfAwdnmfxbO`.
- **Reproduction scripts** (`replay-round3`, eight `repro-*`/`rules-smoke`): identical to `ed42763`; 0 not as expected. Visa probe: 0 not as expected. Timeout-fallback, person–event and visa tests: 27/27.

## 6. Is a live comparison justified?
**No.** The branch's effect on citation verdicts is bracketed by the two model extremes and the extraction states replayed above, and it adds no detection. A live run could only show what the model's citation verdict happens to be, which no longer decides any citation plant. This branch improves stability and guards against false flags; it does not raise the detection count.
