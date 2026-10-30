# Label review, 2026-10-30 (questions only; no label or score changed)

This note records expected labels that a careful reviewer might question. It is kept apart from the scoring.
- Every label file, `eval/adjudications.json` and every historical score are unchanged.
- Any future label change would need its own versioned label set and a separate rescoring. The original results remain the record of reference.

| Case | Expected label | What the record shows | Question |
|---|---|---|---|
| F051-C | Citation plant; only a verified mismatch is detected | The narrative says one of the group "had been ordered removed" without saying who. The label's own note says a careful reviewer could route it | Should routing be an accepted outcome for this plant? It is reported as routed-only |
| C119-CIT | Citation plant (8 U.S.C. 1326 with no removal documented) | The form's record says "POSITIVE - See Narrative". With a positive record the tool can't establish that no removal happened | Is "needs human review" the expected outcome rather than "likely mismatch"? |
| F055-H | Inconsistency plant with no anchor text, field `history.immigration_record`. The label note says "a finding citing the field counts" | The review issues `F-HISTORY-2`, a clarity finding citing the field, routed to a person and adjudicated a valid observation | The note and scoring policy v2.3 disagree: v2.3 requires a field-only finding to name the planted value. Which governs? The category also differs (unclear vs inconsistency) |

**Attribution plants (the 14 in `MISS-CLASSIFICATION-4b10d72.md`), a general observation.** Each label assumes the edited sentence is about the record's subject, because the planter edited that subject's sentence. A reviewer reading only the record cannot confirm that. This is not proposed as a label change, since the planted conflict is real. It explains why routing, not detection, is the system's honest outcome for these cases.
