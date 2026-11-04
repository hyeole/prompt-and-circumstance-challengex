# Accuracy iteration 1: event-bound times, evidence audit, and the missed-issue inventory (corrected)

**Status:** offline development checkpoint. **No model calls, not evaluated, and not a measured accuracy result.**
- **Branch:** `improve/accuracy-iter-1`, from `9bfb5ea`. That branch already contains the measured build `ed42763` plus the citation-stability, scope/attribution and encounter-time work.
- **Commits:**
  - `5b6f7fc`: event-bound times;
  - `d717d32`: evidence audit;
  - this report: the corrected version of `cb80230`.
- **Unchanged:** cases, labels, scorers, references, adjudications, historical outputs and saved scores. No other branch was modified.

## Corrections to the earlier version of this report (`cb80230`)
1. **"Arrest before encounter is impossible" was too broad.**
   - The earlier version asserted it for any arrest time before the form's hour, without establishing the person, the occurrence, the date or the agency.
   - The form field was also described as an "encounter" time. In fact it is the I-213's **At/Near Date/Hour**, and the materials do not confirm whether it records the first contact or the apprehension.
   - Section 2 replaces that rule. As a result, C001's and C119's time findings are now questions for a person, not findings.
2. **C119-X1's credited detection was left in place** on the grounds that a benchmark had credited it. That was wrong: the same evidence standard now applies to old and new code (section 1).
3. **The missed-issue inventory was wrong.**
   - The earlier version said "ten remaining issues" but listed six entry-date issues, two citation issues and three scorer disagreements.
   - Its "six entry-date issues" included C045-X1, which was credited (a clarification-only credit, not a miss), and C119-AMB, whose planted inconsistency is about entry **manner**, not date.
   - It also included G06, which belongs to a separate 12-case set outside the 54.
   - Section 3 lists each labelled issue separately.

## 1. Audit of C119-X1's attribution (and of all identity-from-values links)

**Source context (C119-X1, a team variant of an adapted public record):**
- **People:** three subjects. S5–S7 introduce "First/Second/Third subject … identified as [REDACTED]". S9 and S11 describe a man and then a woman encountered; S16 describes a third man encountered later at the home; S20 says "All three subjects were then transported".
- **The planted statement:** S21 "Once at the … Station, [REDACTED] fingerprints and photograph were obtained"; S22 "Additional records checks"; S23 "The following was discovered:"; S24 "IMMIGRATION HISTORY:"; **S25 "8/11/2009 Arrived into the United States as a B1 Visitor Visa 10/20/2007 Changed status to an F1 Student."**
- **The form:** entry 08/11/2004, AIR. The planted conflict is S25's 2009 against the form's 2004.

**Attribution chain at `ed42763`:**
- **The pronoun chain:** S25 names no one, and no pronoun or designation chain leads to it (person-event analysis: "a redacted name; nothing in the text says whose").
- **What attributed it:** `linkedToSubject` in `lib/review/facts.ts`. It matched "the entry month and day (08/11) and the manner of entry (AIR)" to the subject's form, found no other entry account sharing them, and treated S25 as the subject's.
- **The finding said so:** "…it matches this subject's form on the entry month and day (08/11) and the manner of entry (AIR), and nothing in the narrative suggests another person shares those facts, so it is treated as about this subject."
- **What else ties it:** nothing but value matching and its position in a section.

**What was removed:**
- **`linkedToSubject`:** the entry month and day plus a place or manner match. It was used by the entry-date and manner comparisons and by the model-claim attribution check.
- **`exactEntryLink`** (`attributeStatement` rule 4): the subject's full recorded entry date plus the same manner. It had the same defect, and it fed the history and charge-requirement checks too.
- **Identity now comes only from the text:** the subject named in the clause, a narrative about one person, or a pronoun chain that resolves to the subject's designation. Everything else stays unattributed and goes to a person, with the statement named.

**Lost credited detections** (each was the case's only finding in the saved rc-int-1 result):

| Case | Saved rc-int-1 finding (credited) | How it was attributed | Now (replay of the same saved extraction) |
|---|---|---|---|
| C119-X1 | `F-ENTRY-DATE` S25 + entry.date | `linkedToSubject` (08/11, AIR) | No finding; S25 is routed to a person as an `entry.date` item ("S25 gives 2009 for the entry; the form records the last entry in 2004") |
| F075-H | `F-HISTORY-3` S22 + immigration record | `exactEntryLink` (S22's "the day after … 06/08/2011" = the form's 06/09/2011, EWI) | No finding; S16, S19 and S22 are routed to a person as a history item |

- **What this means for rc-int-1:** if those saved records were scored again with this code, the 44/54 (43/54 without the clarification credit) would read **42/54 (41/54 without it)**.
- **Why it isn't a measurement:** it is the arithmetic consequence of the replay on the same saved data, under the unchanged v2.4 scorer and labels. No historical score or report was changed.

**Controls** (`tests/evidence-audit.test.ts`, plus changed assertions):
- **Negative:** matching full date and manner; matching place; a repeated redaction marker; C119-X1 S25 (post-observation). Each is "ambiguous", produces no finding, and is routed with its statement named.
- **Positive, still attributed:** the subject named (the year conflict is kept); a narrative about one person; a pronoun chain to the subject's designation ("The subject stated … He stated that he entered … in 2015"; basis "account").

## 2. Audit of the arrest-before-encounter rule (and encounter times)
**The form field:** every case manifest maps "Encounter date and hour" to the I-213's **"At/Near Date/Hour"**. Nothing in the materials says whether it records the first contact or the apprehension, so neither meaning is assumed.

**Rule (`times.eventContext`):** a stated encounter or arrest time is compared with that field only when the source establishes all of the following.
- **Agency:**
  - **An arrest:** made by the agents ("Agent … placed all subjects under arrest"). Not another agency, and not an unstated one, since other agencies often arrest first.
  - **An encounter:** not another agency's. A trooper's or police stop or arrest is read as a different event ("other_agency").
- **Occurrence:** this apprehension, not an earlier one ("previously arrested", "on a prior occasion").
- **Date:** the event's own date, or else the date the narrative last states before it, is the form's date.
- **Person:** the event includes the subject: the subject named, "all/both subjects", or a narrative about one person.

**When all four are established:**
- **An encounter time differing by 30 minutes or more:** a finding (tolerance unchanged).
- **An arrest before the form's hour by 30 minutes or more:** a finding. Whichever meaning the field has, the arrest cannot come before it.
- **An arrest after it:** if the narrative states an encounter time that agrees with the form, nothing; otherwise a question, because "if that field records the first contact, the arrest followed it; if it records the apprehension, the two differ".

**When any is not established:** a differing encounter time, or an earlier arrest, is a **question for a person**, which names what is missing. Another agency's event is neither a finding nor a question.

**Effect on the saved outputs:**

| Case | Source | Before the audit (`5b6f7fc`) | Now |
|---|---|---|---|
| C001 (all 5 variants) | S17 "Agent [R] and Agent [R] placed all subjects under arrest at 1330 hours"; form 03/22/2017 1435. The narrative's date is unreadable (S4 "[UNREADABLE]7") | Finding (adjudicated `valid_observation` earlier) | Question: "…but the narrative does not state the date of the arrest". Still routed |
| C119 (all 4 variants) | S9 "At approximately 8:45p.m., both Agents observed [R] leaving that grocery store"; form 2337; three subjects; S9's person not tied to the subject | Finding (added in `5b6f7fc`, unadjudicated) | Question: "…several people are described and it does not say this subject was among those encountered" |
| C003 (all 4 variants) | S27 "At approximately 1030 hours, [R] was placed under arrest" (passive, no agency); form 03/27/2017 0950; the last date stated before it is 03/26 | No finding (removed in `5b6f7fc`) | No finding and no question: later than the form's hour, and not established (agency, date, person) |
| Your two examples | Arrival 0900 / encounter 1000; encounter 0900 / arrest 1100 | No conflict | No conflict (unchanged) |

**Controls:**
- **Negative:**
  - another agency's earlier arrest ("An Ohio State Trooper arrested the subject at 1300 hours");
  - a passive arrest "by the Rocky River Police Department";
  - a police stop followed by the agents' later encounter;
  - an earlier arrest ("previously arrested");
  - an arrest dated June 3 against a form dated June 4;
  - a passive arrest with no agency;
  - a redacted person among several.
- **Positive, a finding kept:**
  - the agents arresting the subject (one person, the form's date) before the hour;
  - "Agents arrested both subjects" before the hour;
  - the encounter's own time.
- **A later established arrest:** the field-meaning question, or nothing when an agreeing encounter time is stated.

## 3. Missed-issue inventory (rc-int-1, 77 existing cases, 54 labelled issues)
**Saved v2.4 claims-layer scores:** 44 detected, 7 missed, 3 routed only (54).
- **Overlap:** C119-AMB carries **two** labelled issues (an ambiguity-routing plant and a manner inconsistency), so the 10 non-detected issues come from 9 cases.
- **Clarification-only credit:** C045-X1 is counted among the 44 detected. That is why 44/54 becomes 43/54 without it.

| # | Case | Labelled issue | Saved outcome | Class | Source evidence (current code) |
|---|---|---|---|---|---|
| 1 | F010-X | inconsistency, entry.date | missed | **Substantive miss:** no explicit tie | Two subjects (S6, S13); S34 "[R] claims to have crossed … with eight other individuals on or about May 5, 2014". Routed: `entry.date` item S34 |
| 2 | F039-X | inconsistency, entry.date | missed | **Substantive miss:** no explicit tie | Four people in the van (S44); S3 "[R] claims to have last entered … February of 2004". Routed: item S3 |
| 3 | F075-X | inconsistency, entry.date | missed | **Substantive miss:** tie only through value matching (excluded) | S20 ties a person to this record ("this Alien Registration Number was used for this event"). S22 reaches it only by repeating the Voluntary Return event and date. Routed: item S22 (relative date read correctly: 2011 vs 2013) |
| 4 | C001-X1 | inconsistency, entry.date | missed | **Substantive miss:** no explicit tie | Three travellers (S4, S12–S13); S23 "with three other individuals". Routed: item S23 |
| 5 | C119-AMB | inconsistency, entry.manner | missed | **Substantive miss; label doubt** | S15 "He also stated that he **first** entered … by walking". The form records the **last** entry (AIR); "He" has no single compatible antecedent (S11–S14: a woman, then "both subjects") |
| 6 | C119-AMB | human_review: ambiguity | routed only | **Routing** (not credited) | Routed for other reasons; no item names S15, because a first-entry statement is not compared with the last-entry form |
| 7 | F051-C | citation (8 U.S.C. 1326) | routed only | **Routing; source unresolved** | The subject's record is NEGATIVE ("No immigration history", S20), but S8 says one of six occupants "had been ordered removed", without saying who. The label note accepts routing |
| 8 | C119-CIT | citation (8 U.S.C. 1326) | routed only | **Routing; source unresolved** | Record "POSITIVE - See Narrative"; a dated history list does not establish that no removal happened (`447ace2`) |
| 9 | C013-X1 | inconsistency, history.immigration_record | missed | **Scorer disagreement** | `F-HISTORY` present and correct; v2.4 does not credit it (S38 has no anchor word) |
| 10 | F055-H | inconsistency, history.immigration_record | missed | **Scorer disagreement** | `F-HISTORY-2` present; the label has no anchors, so nothing can match |
| — | C045-X1 | inconsistency, entry.date | **detected** | **Clarification-only credit** | Credited by `F-ACCOUNT-VISA` (S35 entry after S36's visa expiry). The planted conflict (S35's 2015 vs the form and S30's 2012) is only routed (item S35): six individuals, S35 names only a redaction marker |

**Summary:**
- **Substantive misses:** 5 labelled issues (#1–#5), plus C045-X1's planted conflict, which sits behind a clarification-only credit.
- **Routing:** 3 (#6–#8).
- **Scorer disagreements:** 2 (#9–#10).
- **Lost in this checkpoint's replay** (not in the table, which shows saved scores): C119-X1 and F075-H, from credited to routed (section 1).
- **Outside the 54:**
  - **G06** (gen-v1, 12-case set): a scorer disagreement. v2.4 credits an ambiguity plant only through a review-marked finding, and G06 is routed with an item naming S8 and S9.
  - **The capability-1 cases** are a separate diagnostic set.

**Detection recovery:** none.
- Every substantive miss could be recovered only by identity from section headings, matching values or redaction markers, all excluded.
- Person-event analysis resolves each planted statement to "unresolved".
- No extraction omission or comparison gap was found: each entry-date conflict is computed and routed with its statement named.

## 4. Validation

**Checks:**
- **Tests:** 353/353 (337 at `9bfb5ea`; +9 event-binding, +7 evidence-audit). `tsc --noEmit` is clean. `next build` succeeds.

**Changed assertions** (each commented in its test):
- **Value-matching links:**
  - `round3` (exact-entry link controls);
  - `round2` (F075-H, the "lone date" control);
  - `closeout` (F010-X form link);
  - `g06-g09` and `g06-g09-followup` (month-and-day and C119-X1 links);
  - `review` (unique support; two synthetic cases now name the subject; the C012-M2 encounter and arrest controls now include "all three").
- **Arrest rule:**
  - `text` (C001 is now a question, and a finding when dated; C003);
  - `review` (the C001 banner test, now with its date stated);
  - `event-binding` (explanation wording).

**Replays:** all 1,412 saved results in 142 runs, with no model calls.
- **stub:** the saved extraction, with a fixed model stub.
- **stub-mismatch:** the same, with the stub's citation verdict set to "likely mismatch".
- **stub-failall:** every fact extraction fails (tests the timeout fallback).
- **recon:** the model's own claims and reasons rebuilt from each saved result.

Net change from `9bfb5ea` to `d717d32`:

| Mode | Records changed | Findings removed | Findings added | Routing changed | Citation verdicts changed |
|---|---|---|---|---|---|
| stub / stub-mismatch | 329 | `R-TIME-MISMATCH` C001 family 134, C003 family 112; `F-ENTRY-DATE` C119-X1 3; `F-HISTORY-3` F075-H 14 | 0 | 0 | 0 |
| stub-failall | 329 | Same, except C119-X1 (it has no extraction in this mode) | 0 | 0 | 0 |
| recon | 342 | Same as stub, plus 8 model time claims in the C003 family | 0 | C003 3 records routed → not routed; C119 2 records not routed → routed (the time question) | 0 |

- **No routing changes beyond the five above.** Every other changed record changed only its reasons, questions or withheld-claim wording; all were examined.
- **The C001 and C119 findings now go to a person as questions**, so their routing is unchanged.
- **Safeguards unaffected:** the timeout fallback (stub-failall) and the citation safeguards (no citation verdict changed in any mode).

## 5. Results by category (whole iteration, offline)
- **Genuine detections recovered:** none.
- **False or unsupported findings removed:**
  - your two examples;
  - the C003-family later-arrest finding and 8 model time claims (adjudicated `valid_observation` earlier; that record is kept);
  - the C001-family arrest finding, now a question (also adjudicated `valid_observation` earlier);
  - the C119 time finding introduced and then withdrawn within this iteration;
  - C119-X1 `F-ENTRY-DATE` and F075-H `F-HISTORY-3`, whose identity rested on matching values.
- **Explanation or routing improvements:**
  - time explanations name each time's own event;
  - questions name exactly what the source leaves unestablished, including the field-meaning question;
  - C003 base is no longer routed;
  - C119 base is routed with a question about the 2045 / 2337 difference.
- **Lost credited detections:** C119-X1 and F075-H (section 1). No other plant outcome is affected; no label in any dataset concerns time.
- **Unresolved cases and scorer disagreements:** section 3.

## 6. What this checkpoint does not show
- **Not a measured result:** an offline replay is not a new accuracy measurement, and the 42/54 in section 1 is a replay implication, not a result.
- **Not covered:** the live model's time and attribution claims, which are verified only through reconstruction of saved outputs.

## 7. Bounded live comparison (proposal only; not run, not authorized)
- **Candidate:** `d717d32`, built once and frozen. Unchanged settings: `gpt-oss-20b`, low reasoning, 2 samples, 55 s timeout, 1 retry, `facts-v2.0` / `review-v1.4`.
- **Cases (10, reused, each once, concurrency 1):**
  - C001 and C003 (arrest rule);
  - C119 and C119-X1 (time question; value link removed);
  - F075-H (value link removed);
  - C012-M2 and G08 (request time);
  - F010-X (unattributed entry, control);
  - CAP-B1N (arrival time; capability-1 runner).
- **Budget and stop rules:** at most 60 model requests, counted per attempt. Stop after 2 consecutive HTTP/server errors or 3 consecutive all-failed reviews. No reruns.
- **Label:** reused cases, post-tuning development verification, not an evaluation.
