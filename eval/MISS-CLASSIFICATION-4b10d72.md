# Remaining misses at checkpoint 4b10d72: classification

**Source runs:**
- fresh `2026-10-30T07-21-02`
- legacy `2026-10-30T07-32-13`

**Policy:** scoring v2.3, claim layer. Labels and scores are unchanged. Questions about expected labels are recorded separately in `eval/LABEL-REVIEW-2026-10-30.md`.

`4b10d72` is a **checkpoint, not a target-met release** (see `eval/RUNS.md`).

**Summary of the 18 misses:**
- **Fixable in code, 1:** C021-X1.
- **Genuinely unresolved attribution, 14.**
- **Questionable expected label or scorer specification, 3:** F051-C, C119-CIT, F055-H.

## Fixable in code (1)
| Case | Planted issue | Why missed | Fix |
|---|---|---|---|
| C021-X1 | Entry date conflict about the subject | The fact call timed out (55 s). The review is partial, so the entry comparison did not run | Fact-call reliability (limitation 4): cap or shorten the fact output. This needs a fixed-case timing measurement first. **Not in this change** |

## Genuinely unresolved attribution (14)
In each case:
- the narrative describes several people with redacted names;
- the planted statement is not attributed to this subject by the record itself;
- the review routes it to a person and names the planted sentence;
- a routing item is not counted as detection, by design.

These are not model misses. They stay routed unless the record itself links the statement to the subject.

| Case | Planted sentence | What prevents attribution |
|---|---|---|
| F010-X | S34 "with eight other individuals on or about May 5, 2014" | Companions entered together, so the shared date can't single out the subject |
| F075-X | S22 | Another account (S24) could be the subject's |
| F039-X | S3 "February of 2004" | S6 describes a group entry |
| F055-A ×2 | S4 "entered through the Hidalgo port with a border crossing card" | The form's date and place are unknown, so nothing links S4 to the subject |
| F075-H | S16 and S21 (prior arrests, voluntary return) | S16 is unattributed; routed as one history account |
| C001-X1 | S23 "from Matamoros … with three other individuals" | Group entry |
| C003-AMB ×2 | S42 "He later told agents…" | The form's date and place are unknown |
| C012-X1 | S17 (tourist visa) | The form's date is unknown; group |
| C013-X1 | S26, S28, S30, S31, S36 (removals) | Several people; the history sentences are unattributed |
| C045-X1 | S30 (2012) vs S35 (2015) | Another account agrees with the form |
| C119-AMB ×2 | S15 "He also stated…" | Unattributed in a group narrative |

**The C013-X1 citation.** The negation-scope fix changes only how the model's C-1 citation output is presented: it is now unresolved and routed, no longer a mismatch whose own explanation says the narrative documents the removal. The planted history conflict stays an unresolved attribution.

## Questionable expected label or scorer specification (3)
These are documented in `eval/LABEL-REVIEW-2026-10-30.md`. They are not changed.
- **F051-C:** routed. The label's own note says routing is defensible.
- **C119-CIT:** routed. The record is "POSITIVE - See Narrative".
- **F055-H:** a clarity finding about the field was issued. The label note and v2.3 disagree on whether it counts.

## Fixes made since the checkpoint (post-tuning; not yet evaluated)
None of these is expected to change strict recall: none of the 18 is a model miss these fixes would recover. They target incorrect flags and unnecessary routing.

1. **Fix-4 negation scope** (C013-X1 C-1). Negation now counts only inside the clause that states the narrative's support.
   - Positive test: the exact final-run wording.
   - Negative controls: "the narrative states … never removed" and "the narrative documents no prior removal".
2. **Request vs encounter time** (C012-M2 I-2).
   - A model encounter-time conflict is withheld when the narrative gives that time only for a call, request or dispatch.
   - The time rule's encounter matcher is shared, unchanged.
   - Negative controls: an encounter time, and a different arrest time beside a request time.
3. **Documentation gaps** (F055 base). An unattributed model account is routed only when at least one cited form value is known.
   - Negative control: the same account against a known date is still routed.
   - F036's gap observation (one-person path) is unaffected.

**Tests:** 168 pass. The 3 positive tests fail on the checkpoint code; the 3 negative controls pass on both.

## Packet for independent review
The evidence and reasoning for each of the 14 attribution-limited misses are in `eval/ATTRIBUTION-REVIEW-PACKET-4b10d72.md`.
