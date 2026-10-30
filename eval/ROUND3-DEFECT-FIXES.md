# Round 3: source-level defects in `033a102`, reproduced and fixed offline

**Status:** uncommitted working-tree change on `improve/round2`, based on `033a102`.
- Not evaluated, not promoted, not pushed. No model was called.
- The baseline `7efb231`, candidate `1b5f59b`, patch `033a102` (P1/P2), labels, scores and saved runs are unchanged.

**Scope of the change:** `lib/review/facts.ts`, plus the new files:
- `tests/round3.test.ts`;
- `scripts/repro-round3.ts` (reproduction);
- `scripts/replay-round3.ts` (protection replay).

Nothing in the review prompt, the model settings, the scoring, the labels or the UI changed.

## Validation
| Check | Result |
|---|---|
| Reproduction (`scripts/repro-round3.ts`, 47 checks) | `033a102`: **24 not as expected**. After the change: **0** |
| New tests (`tests/round3.test.ts`) | `033a102`: 12 defect tests fail; 10 controls and 4 extraction-scenario tests pass (1 test needs a new export and is omitted there). After the change: 27/27 |
| Full offline suite | 250/250, including the 223 existing tests, P1 and P2 |
| Type-check, production build | Pass. The build ran with the evaluated build's `.next` moved aside and then restored; its BUILD_ID is unchanged |
| Protection replay, 89 cases, no extraction (`scripts/replay-round3.ts`) | 712 fields compared. **8 change, all provenance labels**; no finding, routing item, attribution or account check changes |
| Historical scores | 7 saved runs rescored with the new code: both layers identical (14/14) |
| Not run | The e2e workflow, which makes live reviews (not authorized). There is no lint script |

**Rejected first attempt, found by the replay:**
- **The rule:** "the driver" and "one of the four men" were treated as definitely someone else.
- **Effect:** this dropped G07's routing item ("one of the four men had been deported"), and that person could be the subject.
- **Correction:** only possessed relatives and companions count as other people ("his wife", "Subject's brother").
  - "They" and "we" are a group, which is excluded only from same-person comparisons.
  - Indefinite people stay unknown, as before.
- The same replay caught C021-X1 ("arrived … and was admitted as a B2"), where the admission had been split off the entry event. The fix keeps "and was admitted/inspected/paroled" in the same event.

## Fixes
1. **Event-scoped dates and manner; real calendar dates.**
   - **Mechanism:** `exactEntryLink` now requires the full date and the manner to occur in the same entry event's clause (`eventSpan`). That clause runs from the last boundary before the verb (`;`, "but", "that", quotation marks, "and he/was…", "after/before/when" + subject) to the first boundary after it.
   - **Exclusions:** a third party's entry or a trip away from the U.S. never links.
   - **Dates:** `fullDates` and `monthDays` reject impossible dates (02/30, 13/01, June 31, 02/29/2011) instead of letting `Date` roll them into another day. "The day after" a valid date still rolls over.
2. **History polarity and chronology.** Polarity is decided per clause (split at `;`, "but", "however", "although" …).
   - **Negation:** a denial covers the removal word only through auxiliaries, adverbs, articles and history nouns ("has not at any time been deported", "no record of removal"). So "did not resist and was removed" and "did not receive a bond … reinstate case" are still not denials.
   - **Processing is not a removal:** processing phrases ("processed for expedited removal", "placed in removal proceedings", "served I-860") no longer count as completed removals, whether or not they are dated or marked "previously". Removal wording outside the phrase still counts ("… and removed to Mexico").
   - **Mixed clauses:** an affirmative clause in a mixed sentence is kept.
3. **The extractor's "other" is checked against the source.** One rule (`attribution` / `checkedPerson`) now covers removals, entries, citation support and status statements.
   - **Override:** an "other" label is overridden only when the clause carrying the fact names the subject and its event is not a third party's. So "Subject's wife entered …" stays "other".
   - **Extraction scenarios tested:** accurate, omitted, misattributed, invalid and failed extractions all give the same `F-HISTORY` for an explicitly-subject removal.
   - **Controls:** unattributed or uncertain statements are never made the subject's, whatever the extractor says.
4. **Reported speech and participants.**
   - **`eventParticipant`:** it reads the noun phrase governing the event verb after the last reporting boundary.
     - "His wife", "my brother", "his companion" and "Subject's brother" are someone else.
     - "They" and "we" are a group.
     - "He", "she", "I", "the subject" and "he and his wife" are the speaker.
     - Anything else is unknown.
   - **`accountConflicts`:** it compares only the account holder's own entry clauses, and reads years and manner from those clauses.
   - **Attribution:** a sentence that names the subject but reports only someone else's event ("Subject stated that his brother was deported") is `other`.
5. **Direction and destination.**
   - **Masked before entry wording is matched:** "United States" as an origin ("from the United States into France"), an agency (Border Patrol, CBP, Customs) or an institution (embassy, consulate, Army …).
   - **Country list:** it is extended for leaving or foreign-entry clauses.
   - **Extractor labels:** a correct foreign-entry, departure or travel label is no longer overridden. A U.S. entry wrongly labelled foreign still is (round-2 fix 1 kept). P1 behaviour is kept.
6. **Provenance follows the information the finding needs.**
   - **`F-HISTORY`** is `rule` when the narrative's text alone yields the same removal (checked by recomputing without extraction), otherwise `model`. In practice it is always `rule`: since round 2, every extracted removal must also pass the same source-text test.
   - **`F-HISTORY-2`** (form plus an omission in the text) and **`F-HISTORY-3`** (source-text encounters) are `rule`.
   - **Entry comparisons** that need the extracted year or manner stay `model`.
   - **Saved results:** raw results are untouched, and nothing historical is relabelled.
7. **Denial with a companion's removal.** `F-HISTORY-4` is now suppressed only by a removal attributed to the subject. A companion's or an unattributed person's removal elsewhere no longer hides the subject's own denial. A relative's denial is not the subject's.

## For the reviewer to decide before the next measured run
- **Scoring consequence of fix 6.** Under v2.4, a partial review credits only `rule` findings. In a future run, a planted history issue found by `F-HISTORY` or `F-HISTORY-3` in a partial review could therefore be credited where it would not have been before.
  - **Saved runs:** every history finding occurred in a complete review, so no saved score changes.
  - This is a consequence of correct provenance, not a scoring change. It should be accepted, or the scorer versioned, before any run that is compared with earlier ones.
- **Observation, not changed:** multi-person detection (`lib/review/rules.ts`) needs two sentences with group wording. A narrative naming two redacted people only once is treated as single-person, so its unattributed statements count for the subject. This is outside the reported defects.
- **Limits:** participant and clause detection are wording rules. Unusual syntax ("Entered illegally in 2011, his wife …") leaves the participant unknown, which keeps the earlier behaviour rather than guessing.
