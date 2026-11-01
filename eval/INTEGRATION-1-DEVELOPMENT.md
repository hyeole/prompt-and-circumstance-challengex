# Integration candidate `improve/integration-1` (from `2f54880`): what changed, what was rejected, offline validation

Post-tuning development on cases that have all been seen before. Nothing here is a measured rate.

## Changes (server code vs `2f54880`)
1. **Source-text entry statements when the fact extraction does not complete** (`sourceEntryStatements` in `lib/review/facts.ts`, used in `lib/review/review.ts`).
   - **Before:** a fact-call timeout meant no entry comparison at all. In rc-full-1, C037-X1 lost its planted entry-date detection this way.
   - **Now:** the comparison runs on U.S. entry statements read from the source text by the person–event analysis. The attribution rules are unchanged, and every resulting finding is `rule`.
   - **What is read:** affirmed last or unspecified entries in a clause that names the United States or the U.S. side of the border. The year is taken only when the clause states exactly one. The person is `subject` only through a designation or a pronoun chain to one.
   - **Not touched:** successful extractions; the citation check; the history checks.
   - **Wording:** the partial-review note now says that the comparisons used only statements read from the source by rules, instead of "did not run".
2. **Person–event module** (`lib/review/person-event.ts`, from round 6, with fixes): speaker vs experiencer; subject, officer, companion or third party, unidentified member, group or unresolved; event types; polarity; scope; dates; pronoun links that cite their text. Identity never comes from matching markers, values or form fields. Section membership is not used.
3. **Visa-chronology clarification** (from `f77863c`, unchanged apart from ids): `F-ACCOUNT-VISA` (category `unclear`) is a clarification concern, not a contradiction and not proof of the planted date error. Each entry/expiry pair now gets its own id (`F-ACCOUNT-VISA`, `F-ACCOUNT-VISA-2`, …); the account-item exemption covers all of them.

## Rejected approaches (not in the candidate)
- **F051-C rule (round 6):** "a removal stated only for an unidentified group member does not establish the subject's removal → likely mismatch". Rejected: the member may be the subject, and the rule trusted the NEGATIVE form value more for an anonymous member than for a redacted named person, with no independent evidence. F051-C stays routed (tested).
- **Fix A (round 4):** the subject's form record over unattributed statements. Re-creates the C013-X1 false citation flag.
- **Supplementing successful extractions with source statements:** no finding changed in any of the 89 replayed cases. No evidence of benefit, so not added.
- **Section-level protagonist links (F039-X, F010-X …):** section membership alone must not establish identity. Not implemented.
- **Hedged fact extraction:** kept separate on `improve/round4-detection`.

## Scoring gaps (documented, labels and scores unchanged)
- **C013-X1:** `F-HISTORY` (rule, S38 "Subject … being a reinstate case" vs NEGATIVE) is a correct finding. v2.4 does not credit it because S38 contains no anchor word.
- **F055-H:** the label has `anchors: []`; no finding can match under v2.4.

## Offline validation (no model calls)
- **Tests and type-check:** 300/300 tests (new: `tests/source-entry-fallback.test.ts`, `tests/person-event.test.ts`, `tests/visa-chronology.test.ts`); type-check passes.
- **Saved-extraction replay, 89 rc-full-1 cases, recorded extractions:** 2 cases change.
  - C037-X1: + `F-ENTRY-DATE` (rule, S21 + `entry.date`). Its fact call had timed out.
  - C045-X1: + `F-ACCOUNT-VISA` (clarification). Account items and citation are kept.
- **The same replay with every fact call failing:** 12 cases change. Each now matches what the complete-extraction path gives for that case:
  - `F-ENTRY-DATE` (DS05, C021-X1, C037-X1, G03);
  - entry-date routing items (DS06, F039-X, F075-X, C001-X1, C045-X1, G06);
  - routing-reason sentence lists (F055-A, C012-X1).
- **Reproductions** (`replay-round3` and the eight `repro-*`/`rules-smoke` scripts): identical to `2f54880`. Visa control probe: 0 not as expected.
