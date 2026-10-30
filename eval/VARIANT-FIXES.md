# Variant fixes on `b66a8cc`

**Status:** an incremental, uncommitted change.
- Offline only: no model calls, not evaluated, not promoted, not pushed.
- Labels, prompts, scoring, historical outputs and every earlier fix are unchanged.
- Only `lib/review/facts.ts` changes, plus a new test file and a new reproduction script.

## Fixes
1. **Present-tense processing.**
   - **Cause:** `CURRENT_REMOVAL_RE` matched "is/being processed" before the longer phrase, which left "removal" behind as a removal word. "The subject is (being) processed for expedited removal" therefore produced `F-HISTORY`.
   - **Fix:** the processing phrase now takes its auxiliaries (`is`, `are`, `was`, `were`, `be`, `been`, `being`) and is matched first.
   - **Kept:** a removal stated beside the processing still counts.
2. **"The other subject" in a reported clause.**
   - **Specific phrases first:** `eventParticipant` resolves them before the generic "subject". "The other subject" is someone else. "Another subject", "the second subject" and "one of the subjects" are unknown, since they could be anyone.
   - **Reported clauses:** inside a clause like "He stated that …" or a quotation, only a self participant counts as the speaker's own event. This applies to `accountConflicts` and `exactEntryLink`.
   - **Stripped words:** auxiliaries such as "did", "could" and "claims" are stripped before the participant is read, so "he did not cross" and "he claims to have crossed" stay the speaker's.
   - **Kept:** "he", "the subject" and distributive "both subjects".
3. **Numeric counts and encountered companions.**
   - **Counts:** "2 subjects" and "3 individuals" count like "two subjects".
   - **Companions:** the subject, or a redacted person, joined with a possessed companion or relative ("encountered the subject and his companion", "[REDACTED] and her brother") makes a multi-person narrative.
   - **Kept apart:** a relative merely mentioned, an officer ("the subject and Agent [REDACTED]"), "1 subject" and unrelated numbers.
4. **Coordinated clauses.**
   - **Split:** a coordinated verb phrase with its own auxiliary ("… was not removed to Mexico **and was** removed to Honduras in 2012") is now its own clause, so its affirmative removal is kept.
   - **No new positives:** one negation still covers participles joined by "or"/"nor". "Has never been arrested or removed" was previously read as a removal; it is now a denial. Coordinated denials stay denials.

## Validation
| Check | Result |
|---|---|
| `scripts/repro-variants.ts` (33 checks) | `b66a8cc`: **14 not as expected**. After the change: **0** |
| `tests/variants.test.ts` | `b66a8cc`: 4 defect tests fail and 4 controls pass. After the change: 8/8 |
| Earlier reproductions | `repro-round3` 0, `repro-multiperson` 0; `repro-round2` output identical to `b66a8cc` |
| Full offline suite | 263/263 |
| Type-check, production build | Pass. The evaluated build's `.next` was restored, with its BUILD_ID unchanged |
| 89-case replay and multi-person flags | **Identical to `b66a8cc`**: no behaviour change on any saved case |
| Historical scores | 7 saved runs rescored: both layers identical (14/14). Provenance-only partial credit: 0 in all 7 |

**Caught while validating.** In the first version, C012-X1 lost its within-account finding. The cause was S18, "He stated that he did not cross …": "did" was not stripped, so "he" was not recognised as the participant. "Did" and the modal auxiliaries were added, and the replay is now identical to `b66a8cc`.
