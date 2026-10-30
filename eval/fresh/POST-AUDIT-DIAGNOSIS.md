# fresh-v1 post-audit recall drop: diagnosis

Run `2026-10-30T03-52-17` (commit `324c393`, post-tuning, post-audit, scoring policy v2.3). The untouched fresh-v1 result (`2026-10-30T02-48-46`: 71% recall, 30% incorrect) is unchanged and remains the only untouched claim. Nothing here changes scoring or labels.

Strict recall fell from **82% (14/17)** in the post-tuning run `03-05-54` to **47% (8/17)**. Nine planted issues were not detected. Six were detected in `03-05-54`; their loss accounts for the whole drop.

## Per planted issue

| Case | Planted issue | Outcome | Earlier (untouched / post-tuning) | Cause | Class |
|---|---|---|---|---|---|
| F010-X | Narrative year 2014 vs form 05/05/2011 | missed | detected / detected | Fact comparison found the conflict. It was withheld because the narrative describes two subjects and S34 names a redacted person. It was routed with S34 named. S34 matches this subject's form on the entry **day (May 5 = 05/05) and manner (illegal crossing on foot = EWI AFOOT)**; only the year differs | **Attribution uncertainty, evidence supports a contradiction** (valid contradiction lost) |
| F075-X | Narrative "day after 06/08/2011" vs form 06/09/2013 | missed | missed / detected | Same as F010-X. S22 gives 06/09 (the day after 06/08), the form's month and day, and a Rio Grande crossing near the form's ELP. Withheld and routed with S22 named | **Attribution uncertainty, evidence supports a contradiction** (valid contradiction lost) |
| F055-A | Added "he entered through the Hidalgo port with a border crossing card" vs PWA (AFOOT) | missed | detected / detected | Model and fact conflicts citing S4 were **suppressed** by the multi-person rule. Routed with S4 named. The form has no other known entry detail (date and place unknown), so nothing independent ties S4 to this subject | **Attribution uncertainty, routing correct** (no independent evidence) |
| F055-A | Same statement, ambiguity routing | routed only | detected / detected | Routed to a person with S4 named in the reason. The scorer requires a *finding* marked for review that cites the statement, so a reason alone is "routed only" | **Attribution uncertainty, routing correct** |
| F039-X | Form 02/15/2009 vs narrative "February of 2004" | not completed | detected / detected | Fact extraction returned **invalid output**, so the entry comparison did not run and the review is partial (audit item 1). Neither model review sample raised the conflict | **Incomplete check** (plus a model miss) |
| F039-G | Stated ground (N5) removed | not completed | detected / detected | Review partial (fact extraction invalid output). The deterministic N5 detector **did** report the element missing, but its finding is labelled `source: "model"`, so a partial review gives it no credit | **Incomplete check** + **provenance labelling bug** (a deterministic detector's finding is labelled model) |
| F051-C | 8 U.S.C. 1326 on a NEGATIVE record | routed only | routed only / routed only | S8 ("one had been ordered removed, …, and the last subject was in status") was taken as about *this* subject, because the attribution pattern matches "the last subject". That produced a false F-HISTORY flag and also counted as support for the reentry charge, which downgraded the citation "mismatch" to routing | **False attribution** (attribution bug suppressed the citation flag) |
| F055-H | Form "POSITIVE - prior removal 2012" with no removal in the narrative | missed | missed / missed | No check compares a form record that claims a removal against a narrative that describes none (only the reverse is checked). The model missed it in all three runs | **Model miss + coverage gap** |
| F075-H | Form NEGATIVE vs narrative "previously arrested … Notice to Appear … Voluntary Return" | missed | missed / missed | The history check covers prior *removals* only; prior apprehensions are not compared with a NEGATIVE record. The model missed it in all three runs. S21 (voluntary return) was also routed as unattributable | **Model miss + coverage gap** (and attribution uncertainty for S21) |

**Summary of the nine:**
- **Attribution uncertainty, 4** (F010-X, F075-X, F055-A ×2). In 2 of these the evidence supports the contradiction. In 2, routing is the correct outcome.
- **False attribution, 1** (F051-C).
- **Incomplete checks, 2** (F039-X, F039-G), one with a labelling bug.
- **Model misses / coverage gaps, 2** (F055-H, F075-H). These were already missed before the audit.

## What changed recall
- **Attribution rule (audit item 3): −4** (F010-X, F075-X, F055-A ×2). Every fresh-v1 adapted-record case describes several people, so the rule applies to all of them.
- **Completion rule (audit item 1): −2** (F039-X, F039-G). The fact call returned invalid output on both. F039-G's fact call has failed in all three fresh runs (a 64-sentence narrative), so this is systematic, not chance. The run log records no validation detail for `invalid_output`.

## Proposed fixes (post-tuning; to be made only after the legacy run finishes; scoring and labels unchanged)
1. **Corroborated attribution.** An unattributed statement in a multi-person narrative counts as about this subject when it matches the subject's own form record on an independent fact other than the one in conflict:
   - the same entry month and day (±1 day for "the day after");
   - the same entry place token;
   - the same manner category.
   The finding says which facts tie it to the subject. Without corroboration, the current routing stays. This would restore F010-X and F075-X as evidence-backed contradictions. It would not restore F055-A, which has no corroborating field.
2. **Attribution pattern.** "the last subject", "one subject", "each subject", "another subject" refer to a group member, not this record's subject (F051-C).
3. **Provenance.** Findings produced by the deterministic checklist detectors (N1, N3, N5, N7, N8, E6) are labelled `source: "rule"`. This is a labelling correction: those checks run without the model, so they did run even when the fact call failed.
4. **Fact-call reliability.** Record the validation error for `invalid_output`, and retry once on invalid output within the time budget.
5. **Coverage (history).** Compare a form record that states a removal with a narrative that describes none (route, since the narrative may simply omit it). Also compare documented prior apprehensions with a NEGATIVE record.

Each fix needs regression tests on the cases above and a negative control. One example: a group member's statement that matches nothing on the subject's form must stay routed.
