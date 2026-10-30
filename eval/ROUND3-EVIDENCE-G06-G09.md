# Round 3: evidence for G06 and G09, and scorer/adjudication limitations

**Scope:** documentation only. No labels, scores, adjudication records or historical outputs change. The run is `rc-round3` (`4cf02c3`), gen-v1 run `2026-10-30T22-09-01`; the comparison run is `1b5f59b`, gen-v1 run `2026-10-30T18-58-39`.

## G06: credited under v2.4; the credit is questionable

**Label** (`eval/gen-v1/expected/G06.json`):
- one `human_review` / `ambiguity` plant, anchor "in 2011 by crossing";
- note: "one redacted person's 2011 entry conflicts with the form but nothing ties it to this subject. Expected: routed to a person with the statement named; **no contradiction asserted**."

**Source:**
- **Form:** `entry.date` 04/02/2019; `entry.place` "near Hidalgo, TX"; `entry.manner` "EWI AFOOT".
- **S2:** "… encountered three men near Monroe, Michigan …". The narrative is multi-person.
- **S8:** "[REDACTED] stated that he entered the United States in 2011 by crossing the river near Hidalgo, Texas."
- **S9:** "[REDACTED] stated that he entered in 2020 near Eagle Pass, Texas."
- **S10:** "[REDACTED] stated that he did not remember when he entered."

**Output in round 3:** `F-ENTRY-DATE` (inconsistency, source `model`, `needsHumanReview: true`). Its explanation:
> "The narrative gives 2011 for the entry, but the form records the last entry in 2019. The statement does not name the subject (several people are described), but it matches this subject's form on the entry place (Hidalgo) and the manner of entry (EWI AFOOT), and nothing in the narrative suggests another person shares those facts, so it is treated as about this subject. A person should confirm."

- **Evidence cited:** S8 (exact quote) and `entry.date`.
- **Also routed:** S9, as an account that may be about a different person.

**Output in `1b5f59b`:** no finding; S8 and S9 were routed as unattributed accounts.

**Why it is credited.**
- `matches()` for an ambiguity plant needs three things: `needsHumanReview`, a citation of the anchor (S8 contains "in 2011 by crossing"), and `aboutAmbiguity(f)`.
- `aboutAmbiguity` passes because the title contains "differs" (matched by `AMBIGUITY`) and the text is about entry (matched by `ENTRY_TOPIC`).
- The flag is therefore classified as **planted**: it is never adjudicated and is not in the incorrect-flag denominator.

**Why the credit is questionable.**
- The finding treats S8 as the subject's, through the two-fact link (`linkedToSubject`: place and manner both match the form, and no other account shares them).
- The label says the statement should be routed, with no contradiction asserted.
- Whether the two-fact link is enough evidence of identity is a judgement on which the label and the code disagree. Both are kept as they are.

**Two readings (both reported, neither applied):**
| Reading | gen-v1 detection | gen-v1 incorrect flags |
|---|---|---|
| v2.4 as scored | 6/7 | 0/8 |
| Label note applied strictly (G06 not detected; its `F-ENTRY-DATE` counted as an incorrect assertion) | 5/7 | 1/8 |

**Attribution to extraction variance.** `compareFacts` was run offline on G06 with identical synthetic extractions on both builds:
- **Builds:** `git archive 1b5f59b` and `4cf02c3`.
- **Script and outputs:** `diagnostics/g06-same-extraction-both-builds.*` in the results bundle.

| Extraction given | `1b5f59b` | `4cf02c3` |
|---|---|---|
| S8 (2011, without inspection) and S9 (2020, unknown manner) | `F-ENTRY-DATE` | `F-ENTRY-DATE` |
| S8 manner unknown | routed S8, S9 | routed S8, S9 |
| S8 labelled `other` | routed S9 | routed S9 |
| S9 year 2019 (the form's year) | routed S8 | routed S8 |

- Identical inputs give identical outputs on both builds.
- The finding appears when the extractor supplies S8's manner, which enables the two-fact link. The link rule predates round 2.
- The extracted facts are not stored in raw results, so the actual extraction in each run is **inferred, not observed**.

## G09: missed because a form value "UNK" counts as documented, not because of the model

**Correction to `EVALUATION-round3-4cf02c3.md`.** That report says the model judged the manner of entry present. **That is wrong.** The raw result shows:
- `E3` (Manner of last entry): `status: "present"`, `sentenceIds: []`, `fieldPaths: ["entry.manner"]`, `qualifier: "recorded_unknown"`;
- note: "The form records this as unknown. It is documented, but no usable value is recorded."

**Where this comes from.** It is the deterministic field-coverage rule (`lib/review/rules.ts`, section 1): a form field whose value is "unknown"-like is treated as covering the element, with the qualifier `recorded_unknown`. The model is not involved. The result is identical in `1b5f59b`.

**Source:**
- **Form:** `entry.manner` "UNK"; `entry.date` "Unknown"; `entry.place` "UNK".
- **Narrative:** the only entry sentence is "The subject stated that he came to the United States several years ago and has lived in Toledo, Ohio, since then." It says nothing about how he entered.

**Label:** a `missing_element` plant for E3. Note: "neither the narrative nor the form states how the subject entered."

**Scoring:** v2.4 credits a missing-element plant only when the element is `absent`, or when a matching finding exists. A `present`/`recorded_unknown` element is neither, so the plant is **missed**.

**Routing:** the case was routed because the deterministic charge-support check found no verified statement of the manner the charge depends on. That routing is reported as unnecessary, because the label expects no routing.

## Scorer and adjudication limitations (documented; scoring unchanged)
1. **Ambiguity credit by wording.**
   - `aboutAmbiguity` accepts any human-review finding that cites the anchor and uses conflict wording about entry.
   - It does not check whether the finding asserts attribution that the label says should not be asserted (G06).
   - Credited ambiguity plants are classified as planted and never adjudicated, so a wrong assertion of this kind cannot appear as an incorrect flag.
2. **Recorded-unknown elements.**
   - A form field recorded as unknown makes the element `present` with a qualifier.
   - A label that treats "UNK" as not stating the element can never be detected through the element status, only through a separate finding (G09).
   - This is a disagreement between a design choice and a label, not a model error.
3. **Extraction is not stored.** Raw results do not keep the extracted facts. Any attribution of an outcome to extraction variance is therefore an inference from offline replays with constructed extractions.

## Reliability and ceiling wording
- **Timeout cause: unconfirmed.** The clustering in time and the unchanged inputs are consistent with slower endpoint responses during the run, but there is no load data, and failed calls report no tokens.
- **The 43/54 (80%) ceiling is an estimate for the current approach, not a proven limit of the system.** It assumes:
  - the current attribution rules, labels and scoring (v2.4);
  - routing is not counted as detection;
  - every timed-out plant completes and is detected.

  A different attribution approach, more evidence in the narratives, or a revised label or scoring policy could change it.
