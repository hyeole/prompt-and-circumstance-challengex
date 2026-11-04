# Accuracy iteration 1: event-bound times and a review of the remaining misses

**Status:** offline development checkpoint. **No model calls, not evaluated, not a measured accuracy result.**
- **Branch:** `improve/accuracy-iter-1`. It starts from `9bfb5ea`: the encounter-time branch, which already contains `ed42763`, the citation-stability work and the scope/attribution work.
- **Code commit:** `5b6f7fc`.
- **Unchanged:** cases, labels, scorers, references, adjudications and historical outputs. No other branch was modified.

## Summary
1. **The pending encounter-time correction was still outstanding at `a465773`, and is now done.**
   - Both of your examples produced a false time conflict at `a465773`. A third variant also did: the arrest in its own sentence made the deterministic rule fire too.
   - All three are now clean, and genuine same-event conflicts, explicit simultaneity and the 30-minute tolerance are kept.
2. **No defensible detection recovery emerged.**
   - Every remaining miss was re-examined against its source and the current code.
   - Each falls into one of four groups:
     - the statement has no explicit tie to the subject;
     - a tie exists only through excluded value matching;
     - the source leaves the fact unresolved;
     - a scorer disagreement.
   - So no detection change was implemented. Section 3 gives the source evidence for each case.
3. **One existing credited detection, C119-X1, rests on value matching**, which your current instruction excludes for new work. It is disclosed in section 4 and left unchanged pending your decision.

## 1. Encounter-time correction (`lib/review/times.ts`, `rules.ts`, `review.ts`)

**Reproduced first, on unchanged code (`a465773`):**

| Input | Form hour | Before | After |
|---|---|---|---|
| "Agents arrived at 0900 hours and encountered the subject at 1000 hours." | 1000 | 0900 read as the encounter; the model claim was kept as a finding | 0900 = arrival, 1000 = encounter; the claim is withheld |
| "The subject was encountered at 0900 hours and was arrested at 1100 hours." | 0900 | The 1100 arrest was treated as an encounter time; the claim was kept | Arrest after the recorded encounter: no conflict; the claim is withheld |
| The same with the arrest in its own sentence | 0900 | The rule `R-TIME-MISMATCH` **and** the model claim both fired | No finding |

**What changed:**
- **Each time is bound to its own event occurrence:** the nearest event word in its clause. An encounter that has its own time is never borrowed by another time.
- **An arrival time is the encounter time only with explicit simultaneity:** "Upon arrival at 0900 hours, agents encountered…", "arrived … and immediately encountered". "Arrived at 0900 hours and encountered the subject" is a sequence, so the encounter time is not stated.
- **An arrest time is the encounter time only when the verbs are coordinated directly:** "encountered and arrested the subject at 0900 hours". It is not when they are separate occurrences, as in "encountered the subject and placed him under arrest at 1100 hours" or "…, then arrested him at 1100 hours".
- **What the form's encounter hour is compared with:**
  - **The encounter's own time:** a conflict when it differs by 30 minutes or more (tolerance unchanged).
  - **An arrest stated before it** by 30 minutes or more: a conflict, because the subject cannot be arrested before being encountered. Times either side of midnight are compared within 12 hours.
  - **An arrest after it:** the normal sequence, not a conflict.
- **A time tied to no event** that differs from the form hour stays a question for a person, not a finding (unchanged).
- **The deterministic rule `R-TIME-MISMATCH`** now uses the same reader, so it also reads "8:45p.m."-style times. Its explanation states which event the time belongs to.
- **"observed an … officer conduct a traffic stop" is no longer an encounter cue.** This was found while validating the change: watching another agency's action is not the agents' encounter with the subject (F051 S3).

**Tests:**
- **Totals:** 337 before, 346 after; all pass.
- **New file `tests/event-binding.test.ts` (9 tests):**
  - **Reproductions:** your two examples and the split-sentence variant, labelled post-observation.
  - **Positive controls:** a stated encounter time; explicit simultaneity (arrival and arrest); an arrest before the recorded encounter; the 30- and 20-minute tolerance edges.
  - **Negative controls:** a later arrest; a midnight wrap; a missing encounter time; an untied time that is still routed; an observed officer.
- **Four existing assertions changed, each with a comment in the test:**
  - `encounter-time.test.ts`: arrival-then-encounter is now a sequence.
  - `encounter-time.test.ts`: the linked-arrival and arrest control now uses explicit simultaneity and an arrest before the form hour.
  - `review.test.ts`: the C012-M2 control now uses an arrest before the form hour; the later arrest is kept as a negative case.
  - `text.test.ts`: C003's later arrest is no longer flagged; the word order it guards is still read, and flagged when the arrest is before the form hour.

## 2. Validation
- **Suite and checks:** full suite 346/346. `tsc --noEmit` is clean. `next build` succeeds.
- **Baseline:** the replays of unchanged code matched the previous `a465773` replays exactly, in all four modes.
- **Replay scope:** all 1,412 saved results in 142 runs, with no model calls, in four modes:
  - **stub:** the saved extraction, with a fixed model stub;
  - **stub-mismatch:** the same, with the stub's citation verdict set to "likely mismatch";
  - **stub-failall:** every fact extraction fails (tests the timeout fallback);
  - **recon:** the model's own claims and reasons rebuilt from each saved result.

| Mode | Records changed | Findings | Routing | Citation verdicts |
|---|---|---|---|---|
| stub / stub-mismatch / stub-failall (identical) | 315 | `R-TIME-MISMATCH` −112 (C003 family), +69 (C119 family); C001 explanation only (134) | none | none |
| recon | 328 | as above, plus 8 model time claims (C003 family) withheld | C003 3 records routed → not routed; C119 2 records not routed → routed | none |

- **Wording-only changes:** 13 recon records (C012-X1, C021-X1, C037-AMB and 9 capability-1 cases). Only the parenthetical in the withheld-routing explanation changed; the claim explanations are unchanged.
- **Unaffected:** the timeout fallback (stub-failall), the citation safeguards (no citation verdict changed in any mode), and the scope/attribution behaviour (no other finding changed).

## 3. Results by category

### Genuine detections recovered offline
**None.**

### False findings removed

| Case | Before | Why it is not a conflict | Prior adjudication |
|---|---|---|---|
| Your examples 1 and 2 (constructed) | Time-conflict finding | Arrival and later arrest are separate events | — |
| C003, C003-AMB, C003-CIT, C003-M3 | `R-TIME-MISMATCH`: form 0950 vs "At approximately 1030 hours, [subject] was placed under arrest" | The arrest is 40 minutes after the recorded encounter, the normal sequence | **Adjudicated `valid_observation` earlier ("real discrepancy")**. That record is kept unchanged |
| C003 family, recon (8 model claims) | "Form lists encounter at 09:50, narrative states arrest at 10:30" | Same | Same (C003-M3 example) |

C003 is where your rule and the earlier adjudication disagree. Under the event rule the 1030 arrest does not contradict an 0950 encounter, so these are no longer raised. If you still want such cases raised, the alternative is a question for a person rather than a finding; that would need your decision.

### Explanation or routing improvements
- **C001** (all variants; finding kept): "The form records the encounter at 1435 hours, but the narrative gives 1330 hours for the arrest, before that. The subject cannot be arrested before being encountered…". Previously it said "the difference may be legitimate".
- **Withheld time claims now name the claimed time's own event:** for example, "0900 hours as the time of an agent's or officer's arrival, not the encounter … The narrative states the encounter at 1000 hours".
- **C003 base record:** no longer routed in 3 recon records (its only reason was the later arrest).
- **New source-supported finding: C119 family** (C119, C119-AMB, C119-CIT, C119-X1).
  - **The discrepancy:** S9 says "At approximately 8:45p.m., both Agents observed [subject] leaving that grocery store … Agents approached [subject]"; the form's encounter hour is 2337. That is about three hours apart in the source.
  - **Why it was missed:** the old rule did not read the "8:45p.m." format.
  - **Its status:** this is **not a planted issue**, and it is **unadjudicated**. I judge it valid against the source, but adding an adjudication is a separate step for you.
  - **Scoring effect:** until it is adjudicated, v2.4 scoring would count these 4 findings as unadjudicated flags. C119 base also becomes routed (2 recon records).

### Lost detections and regressions
- **No planted detection is lost.** No planted label in any dataset is about time (checked across dev-synthetic, fresh, legacy, gen-v1).
- **Lost observations:** the C003-family time findings above, previously adjudicated valid.
- **No other finding, citation verdict or routing outcome changed** in any replay mode.

### Unresolved cases and scoring disagreements (the remaining misses, rc-int-1 data, current code)

| Case | Planted | Current outcome | Source evidence | Class |
|---|---|---|---|---|
| F010-X | entry.date | Routed; account names S34 ("gives 2014; the form records 2011") | Two subjects (S6 driver, S13 occupant). S34 "[REDACTED] claims to have crossed … with eight other individuals on or about May 5, 2014" names only a redaction marker. "The subject" (S26–S53) appears only in other sections, with no pronoun or reference linking it to S31–S36 | No explicit tie |
| F039-X | entry.date | Routed; account S3 | Four people in the van (S44). S3 and S4 refer to one person ("this is when he actually entered"), but S3 reaches the charged person (S18) or the disposition (S56) only through identical markers | No explicit tie |
| F075-X | entry.date | Routed; account S22 ("gives 2011; the form records 2013"). The relative date ("the day after … 06/08/2011") is read correctly | S20 does tie a person to this record ("this Alien Registration Number was used for this event"), and S21 says that event "resulted in a Voluntary Return". S22 reaches it only by repeating the Voluntary Return event and its date | **Tie exists only through value matching (excluded)** |
| C001-X1 | entry.date | Routed; account S23 | Three travellers (S4, S12–S13); S23 says "with three other individuals" | No explicit tie |
| C045-X1 (planted conflict) | entry.date | Routed; account S35. The credit came from the visa clarification, which is not counted here | Six individuals (S15). S30 and S35 each name only a redaction marker | No explicit tie |
| C119-AMB | entry.manner + ambiguity | No account | S15 "He also stated that he **first** entered … walking". The form records the **last** entry (AIR 08/11/2004), so these are different events. "He" has no single compatible antecedent (S11–S14 describe a woman, then "both subjects") | No explicit tie; **label doubt** (first vs last entry) |
| F051-C | citation (8 U.S.C. 1326) | Routed (needs human review) | The subject's record is NEGATIVE, and the station check reads "No immigration history" (S20). But S8: "one had been ordered removed" among six occupants, without saying who. The label note accepts routing | Source unresolved |
| C119-CIT | citation (8 U.S.C. 1326) | Routed | Record "POSITIVE - See Narrative"; a dated history listing does not establish that no removal happened (fix `447ace2`) | Source unresolved |
| C013-X1 | history.immigration_record | `F-HISTORY` present and correct | The scorer does not credit it (S38 has no anchor word) | Scorer disagreement |
| F055-H | history.immigration_record | `F-HISTORY-2` present | The label has no anchors, so nothing can match | Scorer disagreement |
| G06 (gen-v1) | ambiguity | Routed; account names S8 and S9 | v2.4 requires a review-marked *finding* for an ambiguity plant; this routing is an account item | Scorer disagreement |

- **Person-event analysis** (`lib/review/person-event.ts`) resolves every planted statement above to "unresolved": "a redacted name; nothing in the text says whose", and for C119-AMB, "'He' has no single compatible antecedent".
- **Other categories:**
  - **Extraction omissions:** none in the replayed data.
  - **Comparison gaps:** none. Every entry-date conflict is computed and routed with its statement named.
- **Why no recovery was implemented:** the six entry-date misses could be recovered only by reading section headings as proof of identity, matching values, or redaction markers, and all three are excluded.

## 4. Disclosure: an existing detection that rests on value matching
- **The finding:** C119-X1's credited detection (`F-ENTRY-DATE`, S25) comes from the long-standing exact link (`linkedToSubject`, `lib/review/facts.ts`). Its explanation says the statement "matches this subject's form on the entry month and day (08/11) and the manner of entry (AIR), and nothing in the narrative suggests another person shares those facts".
- **Where it appears:** 3 of the replayed records.
- **The conflict:** this predates this iteration and is inside the 44/54 benchmark, but it is identity inferred from matching dates and manner, which your current instruction excludes.
- **What I did:** I did not remove it. Removing it would change a measured result and is your decision. Without it, C119-X1's statement would be handled like the other unattributed accounts, which are routed, not detected (not replayed).

## 5. What this checkpoint does not show
- **Not a measured result:** an offline replay is not a new accuracy measurement, and no detection rate is claimed or projected.
- **Not covered:** the live model's behaviour on arrest-time claims. That is verified only through reconstruction of saved outputs.

## 6. Proposed bounded live comparison (not run; needs your authorization)
- **Purpose:** to confirm that live model time claims are judged by the new event rule. The deterministic effects above are already fully verified offline.
- **Candidate:** `5b6f7fc`, built once and frozen (commit, `BUILD_ID` and the capability-1/LOCK hashes recorded before any call). Unchanged settings: `gpt-oss-20b`, low reasoning, 2 samples, 55 s timeout, 1 retry, `facts-v2.0` / `review-v1.4`.
- **Cases (8, reused, each once, concurrency 1, in this order):**
  - C001 (arrest before the form hour; finding expected to stay);
  - C003 and C003-M3 (later arrest; claims expected withheld);
  - C119 and C119-X1 (new encounter-time finding);
  - C012-M2 (request time);
  - G08 (request time; should-not-flag "0815 hours");
  - CAP-B1N (arrival time; capability-1 dataset, run as a separate invocation of the same runner).
- **Budget:** at most 48 model requests (8 reviews × 3 calls × 2 attempts), counted per attempt.
- **Stop rules:** stop after 2 consecutive HTTP/server errors or 3 consecutive reviews whose model calls all fail. No reruns or edits.
- **Report:**
  - every time-related finding, withheld claim and routing reason, checked against the source;
  - incorrect findings and unnecessary routing in all 8 cases;
  - labelled as **reused cases, post-tuning development verification, not an evaluation**.
