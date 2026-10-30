# Attribution-limited misses at checkpoint 4b10d72: evidence packet for independent review

**Purpose.** For each of the 14 planted issues that the checkpoint routed for attribution instead of detecting, this packet gives:
- the planted sentence;
- the form values;
- the competing context;
- exactly what the system output;
- the reasoning behind the decision.

A reviewer can decide whether attribution was genuinely unresolvable from the record. **Labels, adjudications and scores are unchanged.** Nothing here changes code.

**Sources:**
- fresh run `2026-10-30T07-21-02`;
- legacy run `2026-10-30T07-32-13`;
- case files in `eval/fresh/cases` and `eval/cases`;
- labels in `*/expected`.

Regenerate the raw listing with `npx tsx scripts/diag-attribution-packet.ts`.

## The rule being applied (code: `lib/review/facts.ts`, `attribution` and `linkedToSubject`)
A statement counts as about this record's subject when either:
- it names the subject explicitly ("Subject …", or scoped wording such as "both subjects" that includes the subject); or
- the narrative describes only one person.

Otherwise, in a narrative about several people with redacted names, a statement is linked only when all of these hold:
- it matches **at least two** non-disputed facts on the subject's own form;
- no sentence describes people entering together;
- no other entry account shares a matched fact;
- no other unattributed account fully agrees with the form.

Linked statements are compared and can be detected. Unlinked ones are routed to a person, with the sentence named. **A routing item is never counted as detection.**

Every case below is a multi-person narrative. In every one, the planted sentence begins with a redacted name or a pronoun, so the code reads its subject as `unclear`.

## Per planted issue

| # | Case (label) | Planted sentence | Form values | What blocks attribution | System output | Reviewer question |
|---|---|---|---|---|---|---|
| 1 | F010-X (inconsistency, entry.date) | S34: "[REDACTED] claims to have crossed the border illegally at night **with eight other individuals** on or about May 5, 2014, by walking through the desert." | 05/05/2011; 2 mi E of MCI; EWI AFOOT | Matches the day and month (05/05) and the manner. But S34 itself says others crossed with this person, so the shared date can't single out the subject | Routed: account `entry.date` S34 ("gives 2014; the form records 2011"). Citation qualified (needs human review) | S34 sits under the "ENTRY:" heading. Does an I-213 section heading establish the subject? |
| 2 | F039-X (inconsistency, entry.date) | S3: "[REDACTED] claims to have last entered … in **February of 2004** near Nogales, AZ." | 02/15/2009; place unknown; PWA (AFOOT) | Matches only the month and manner category. S6, "he and a group of two other subjects walked across … outside of Nogales", describes a group entry | Routed: account `entry.date` S3. The model's conflict claim was withheld for attribution | S3 is under "ENTRY:", and S4 says the person has no proof of that date. Section heading again |
| 3–4 | F055-A (inconsistency, entry.manner; ambiguity routing) | S4: "During a later interview, **he** stated that he entered … through the Hidalgo port of entry with a border crossing card." | Date and place unknown; PWA (AFOOT) | The only cited form field (manner) is the one in conflict, and nothing else on the form is known. "He" refers back to S3's redacted person. The narrative describes three subjects (S24, S28) | Routed: account `entry.manner` S4. The ambiguity plant needs a review-marked *finding*; the routing reason alone is "routed only" | Does pronoun continuity from S3 (under "ENTRY:") establish the subject? |
| 5 | F075-H (inconsistency, history.immigration_record) | S16: "fingerprint analysis revealed [REDACTED] was **previously arrested** by U.S. Border Patrol on two separate occasions"; S19: Notice to Appear; S21: Voluntary Return; S22: Voluntary Return on 06/08/2011 | NEGATIVE; entry 06/09/2011, 1 mi W of ELP, EWI AFOOT | Two subjects (S7–S9, "both subjects", both Mexican). S22's entry, the day after 06/08/2011, matches the form's 06/09/2011 and the El Paso area. But S24, "[REDACTED] stated that he crossed … with about five other individuals … into El Paso", shares the place, and S24 itself describes a group entry | Routed: one account `history.immigration_record` (S16, S19, S22). Citation shown as consistent | Is S22 linked strongly enough by date plus area? Are fingerprint record checks presumptively about the record's subject? |
| 6 | F075-X (inconsistency, entry.date) | S22: "[REDACTED] claimed to have crossed the Rio Grande … the day after returning to Mexico as a Voluntary Return on **06/08/2011**." | 06/09/2013; 1 mi W of ELP; EWI AFOOT | Matches the month and day (06/09, as "the day after 06/08") and the area. But S24, a group entry into El Paso, shares the place. Two Mexican subjects | Routed: account `entry.date` S22. Citation qualified | Same as #5 |
| 7 | C001-X1 (inconsistency, entry.date) | S23: "[REDACTED] stated that he crossed the Rio Grande River from Matamoros … on or about **June 2, 2016**, into Texas **with three other individuals**." | 05/15/2014; 5 mi S of LAR; EWI AFOOT | Group entry stated in the sentence itself. Only the manner matches; Matamoros is not opposite Laredo | Routed: account `entry.date` S23 | Little supports attribution beyond the narrative's order |
| 8–9 | C003-AMB (inconsistency, entry.manner; ambiguity routing) | S42: "**He** later told agents that he entered at the Nogales port of entry using a border crossing card." | Date and place unknown; EWI AFOOT | "He" refers back to S41, whose redacted person crossed at age five and does not recall the entry. That agrees with the form's unknown date, but an unknown matches nothing. Three subjects (S7–S8) | Routed: account `entry.manner` S42 | Pronoun continuity to S41 |
| 10 | C012-X1 (inconsistency, entry.manner) | S17: "[REDACTED] (DOB: [REDACTED] COC: Nicaragua) claims to have entered … in August 2013 by flying into Chicago O'Hare … on a **tourist visa**." | Date unknown; 0 mi of LAR; PWA (AFOOT) | Citizenship doesn't single anyone out: S5 says **the other two individuals are also Nicaraguan**. Nothing else on the form is known. Three individuals | Routed: reason naming S17. The model claims were withheld | Under "ENTRY:"; S18 ("He stated that he did not cross through a designated Port of Entry") contradicts S17 within the narrative |
| 11 | C013-X1 (inconsistency, history.immigration_record) | S26: Expedited Removal 06/08/2005; S28: deported 07/07/2010; S31: deported 04/08/2015; S36: Reinstatement | NEGATIVE; PWA (AFOOT); citizenship Nicaragua | Three people travelling together (S13, S19), and the companions are also Nicaraguan (same event as C012). Removal sentences name only a redacted person | Routed: one account `history.immigration_record` (S26, S28, S29, S30, S31, S36). At the checkpoint the model's C-1 was shown as a mismatch. The negation fix makes it unresolved and routed | Under "IMMIGRATION HISTORY:". Section heading |
| 12 | C045-X1 (inconsistency, entry.date) | S35: "[REDACTED] last entered … on **February 21, 2015** through the Port … in Laredo, Texas as a H2B visa holder." | 02/21/2012; 0 mi A of LAR; H2B | S30 gives the same day, place and visa class with 2012, so it **fully agrees with the form**. S35 could be another person's account, or the same person's second account. Several workers | Routed: account `entry.date` S35, plus "S30 and S35 may be about different people". Citation qualified | If S30 and S35 are the same person, this is an internal contradiction, a planted conflict a person must resolve |
| 13–14 | C119-AMB (inconsistency, entry.manner; ambiguity routing) | S15: "**He** also stated that he **first** entered the United States by walking across the border near El Paso, Texas." | 08/11/2004; 0 mi A of LOS; AIR; citizen of India | "He" is unattributed in a group narrative (S14 "both subjects", S21 "all three subjects"). S26, "8/11/2004 Arrived … as a B1 Visitor", matches the form | Routed: account `entry.manner` S15 | The sentence says **first** entry; the form records the **last** entry. Is it a contradiction at all? This is a label question, recorded in `LABEL-REVIEW-2026-10-30.md` |

## Signals the code does not use (for the reviewer to judge; not implemented)
1. **Section headings** ("ENTRY:", "TRAVEL:", "IMMIGRATION HISTORY:"). In many I-213s these sections describe the record's subject: cases 1, 2, 10 and 11.
   - Risk: in group apprehensions the narrative is often shared across the subjects' records.
   - The should-not-flag controls DS06 and FS10 would need to be checked under any such rule.
2. **Pronoun continuity** ("he" continuing from the previous sentence's person): cases 3–4, 8–9 and 13–14.
   - It moves the question to that earlier sentence, which is itself unattributed.
3. **Citizenship.** It does **not** disambiguate where checked. In C012-X1 and C013-X1 all three people are Nicaraguan; in F075 both are Mexican.

## Reading of the evidence
- **Eight plants have no independent link** (cases 3–4, 7, 8–9, 10, 13–14). Nothing on the form ties the planted sentence to the subject beyond its position or a pronoun. Routing is the honest result from the record alone.
- **Five plants have a partial link that the code's uniqueness rule rejects:**
  - case 1: shared-entry wording;
  - case 2: group entry;
  - cases 5 and 6: another account shares the place;
  - case 11: companions share the citizenship.

  A reviewer may judge that a section heading resolves cases 1, 2 and 11.
- **One plant (case 12)** turns on whether S30 and S35 are the same person.

Total: 8 + 5 + 1 = 14.

Separately, cases 13–14 also raise a label question: a *first* entry versus the form's *last* entry. It is added to the label review.
