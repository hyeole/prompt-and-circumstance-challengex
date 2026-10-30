# Multi-person detection threshold, plus a separate report of provenance-only credit

**Status:** an uncommitted working-tree change on top of `ccc60d7` (the round-3 review checkpoint), kept separate for review.
- Not evaluated; no model calls; not committed, promoted or pushed.
- Saved runs, labels and scores are unchanged.

## The defect
`runRules` decided a narrative described several people only when **two or more** sentences used group wording ("subjects", "both subjects" …). Narratives with clearly distinct people but group wording in one sentence or none were treated as single-person. Examples:
- "encountered two subjects …";
- "[REDACTED] and [REDACTED] were apprehended";
- "The other subject stated …".

**Consequence:** any unattributed statement then counted for the subject. An unattributed removal in a two-subject narrative produced `F-HISTORY` against a NEGATIVE record instead of being routed to a person.

## The change
**Where:** `lib/review/facts.ts` (`statesSeveralPeople`) and `lib/review/rules.ts` (section 3).

The bare-plural rule stays as it was: words like "subjects" or "passengers" must still recur, because they can be boilerplate. In addition, **one sentence is enough** when it itself states that several people are involved:
- **a number of people:** "two subjects", "four men", "both of them";
- **a reference that presupposes another person:** "the other subject", "the second subject", "one of the subjects", "a man and a woman";
- **two redacted people joined by "and" or a comma**, neither of them an official.

**What never establishes a second person:**
- **an official's name:** a redacted name after a title, or joined to one ("Agents [REDACTED] and [REDACTED]");
- **the same redaction marker repeated** in separate places: identical placeholders cannot be told apart;
- **a relative who is only mentioned:** relatives' events are handled by the round-3 participant rule;
- **the subject's own A#, DOB and COC details.**

Rule notes are shown in the output only and are not sent to the model, so the model's input does not change.

## Validation
| Check | Result |
|---|---|
| Reproduction (`scripts/repro-multiperson.ts`, 15 checks) | `ccc60d7`: **8 not as expected** (6 positives, plus the downstream `F-HISTORY` and routing). After the change: **0** |
| Tests (`tests/multiperson.test.ts`) | On `ccc60d7`: both defect tests fail and both controls pass (the export-only test is omitted there). After the change: 5/5 |
| Full offline suite | 255/255 |
| Type-check, production build | Pass. Both exclude `share/`; the evaluated build's `.next` was restored, with its BUILD_ID unchanged |
| 89-case replay vs `ccc60d7` | Multi-person cases: 54 → 55. The **one change is G02**: "encountered two men" plus "The other subject". The narrative clearly has two people, and its label says so ("Two subjects"). Its findings are unchanged, because the subject's own statements name the subject |
| Historical scores | 7 saved runs rescored with this code: both layers identical (14/14) |

## Provenance-only partial credit: reported separately in future comparisons
`scripts/diag-provenance-credit.ts <run>` lists plants that a partial review credits **only** through a finding whose provenance round 3 corrected (`F-HISTORY`, `F-HISTORY-2`, `F-HISTORY-3`). It changes no score and writes no file.

Any future comparison will report that count separately from genuinely new detections.
- **Saved runs:** 0 in all seven, because every history finding there was in a complete review and labelled `model`.
- **Check of the script:** on a synthetic partial copy of G05 it reports the credit; a model-provenance finding (G03) is not listed.

The round-3 provenance correction is kept as is: it applies only where the finding needs nothing but source text and form data.

## Limits
- **Unusual wording:** the rule reads wording, so a second person introduced in unusual terms ("an additional male") is not counted.
- **Uncoordinated names:** two redacted people named in separate sentences, never coordinated, are indistinguishable from one person named twice. They stay single-person unless other wording establishes several.
