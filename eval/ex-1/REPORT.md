# ex-1: event-attribution extraction (6c49e14) against the measured baseline (74e15fb)

**Verdict: not accepted. Keep the measured baseline 74e15fb.** On the 20 locked cases, the candidate:
- lost one established detection (XE02);
- gained none;
- had the same number of incorrect findings (3 each);
- had the same completion (20/20 each).

The acceptance rule, fixed before the run, required additional detections and no lost detection. The experiment is
preserved on `improve/event-extraction-1`.

**What this is:**
- A single paired run on **20 team-authored development cases**. They are not independent and are not combined with any other set.
- It says nothing about the 54-label benchmark. 46/54 (85.2%) was not tested, and this change could not have reached it (see §6).

## 1. Run
| | Baseline | Candidate |
|---|---|---|
| Commit / BUILD_ID | `74e15fb` / `P9gsRs-e9wO6Ec4z2QH0G` | `6c49e14` / `5Y3vmROtKL5M6rWM76H-h` |
| Reviews / model requests | 20 / 60 | 20 / 60 |
| Completion | 20/20 | 20/20 |
| Latency p50 / p90 / max | 12.3 / 27.4 / 29.9 s | 15.1 / 19.9 / 21.3 s |

**Run conditions:**
- **Size:** 40 reviews and **120 model requests** (hard maximum 240).
- **Errors:** 0 HTTP errors and 0 failed model calls. No stop rule fired.
- **Order:** engine order alternated per case.
- **Discipline:** no reruns, and no edits after outputs were seen.
- **Records committed before any call:** the cases (`8c56d51`) and the freeze (`10af610`).
- **Key handling:** the key was used server-side only. It was linked for the run and removed afterwards, and was never printed or logged.

## 2. Results (locked checks, then hand adjudication)
| Category | Baseline | Candidate |
|---|---|---|
| Established issues detected | **6/8** | **5/8** |
| Negative controls passing all checks | 7/8 | 7/8 |
| Unresolved: routed, no contradiction | 4/4 | 4/4 |
| Incorrect findings | 3 | 3 |
| Unnecessary routing (negatives) | 1/8 (XN05) | 1/8 (XN05) |

**Adjudication of every finding and explanation** (`adjudication.json`):

| Verdict | Baseline | Candidate |
|---|---|---|
| Correct | 6 | 5 |
| Valid observation (identity-document items) | 5 | 6 |
| Incorrect | 3 | 3 |
| Debatable | 2 | 0 |
| Unsupported explanation or routing reason | 0 | 2 |

**Paired gains and losses:**
- **Lost: XE02.** The baseline detected the planted date conflict for the designated rear passenger (March 2020 against 03/2022). The candidate did not.
- **Gained: none.**
- **Unchanged:** every other plant had the same outcome on both engines.

## 3. Why XE02 was lost
**What happened:**
1. The candidate's extraction labelled both U.S. crossings in XE02 (S5 and S8) as `other_country_entry`, while giving the country as "United States".
2. The adapter passed the type through.
3. The existing comparison therefore treated them as entries into another country. It skipped them, and it withheld the review model's correct date claim as being about "another country".
4. The only remaining routing reason, "Potential impact on charge determination", has no accepted support.

**How often the extraction mis-typed a U.S. entry:**
- **Candidate:** 3 U.S. entries across its 20 outputs (XE02 S5 and S8; XE08 S7 as "travel", which had no effect).
- **Baseline:** none.

**Code or model:**
- **What the replays show:** each engine's 20 saved outputs give identical results under both codes. Every paired difference therefore comes from what each prompt returned, not from the downstream code.
- **What the replays do not test:** they start from the extraction as stored after the adapter, so they don't re-test the adapter.
- **Two contributing causes:**
  - the new prompt's output (the mis-typing);
  - an adapter that accepts an event type its own country field contradicts.
- **What one run can't tell:** whether the new prompt mis-types U.S. entries systematically or only occasionally.

## 4. Incorrect findings (the same three on both engines; pre-existing, not from this change)
**XE01, F-ENTRY-DATE:** compares an earlier crossing with the form's last entry.
- **Baseline:** cites "The first time was in 2008".
- **Candidate:** cites "The second time, in 2012".
- **Planted detection missed:** the planted most recent crossing (S8, "summer of 2017") was extracted by both engines but not reported.

**XE05, F-ENTRY-DATE:** compares "his first trip north was in 2015". The planted place conflict in the same case was detected.

**XN05, F-ENTRY-DATE:** compares "first visited … in 2012" (negative control).

**Common cause:** the existing scope rule (`entryScope`) only recognises scope words next to entry verbs. "The first time", "the second time", "first trip" and "first visited" carry no entry verb, so these earlier events are compared with the form. This is a deterministic gap present in 74e15fb, independent of the extraction.

**Also missed by both: XE06.** The crossing mode conflict was not found (carried in a pickup's cargo bed, against AFOOT).

**Recorded during offline testing, not triggered here:** the source-text account check `F-ACCOUNT` reads a denied crossing that has a year as an entry. It is the same on 74e15fb.

## 5. Explanations
**Candidate, unsupported:**
- **XE02:** the routing reason in §3.
- **XE07:** the citation explanation embeds model text claiming the charge "requires a last entry date of 11/14/2015". The verdict, "consistent", is correct.

**Baseline, debatable:**
- **XE07:** "needs human review" because a date conflict "may alter the factual basis". The date does not bear on this charge's requirement.
- **XU01:** a charge concern resting on an unattributed statement. Routing was justified by the account anyway.

These are differences in the review model's prose, not effects of the extraction.

## 6. Relation to the 84–85% target
- **Seven of the 12 benchmark misses can't be reached by any extraction change:**
  - they are F075-H, C119-X1, F010-X, F039-X, F075-X, C001-X1 and C119-AMB;
  - in each, the statement is tied to the person only by a repeated redacted name in a multi-person narrative;
  - the identity rule (no inference from redaction markers or matching values) correctly leaves them unattributed, and the candidate keeps that rule.
- **Three are scoring or label issues:** F055-H, C013-X1 and C045-X1's credit type.
- **Reaching 46/54** would need either new source evidence of identity in those records or a change to the identity rule. Neither is proposed here.

## 7. What I would try next (not done; your call)
- **The scope gap in §4.** It caused all 6 incorrect findings in this comparison (3 per engine). It could be fixed deterministically and would reduce false flags without touching identity.
- **If the event prompt is retried:**
  - the adapter should reject an event type that contradicts its own country field, or re-derive the type from the source;
  - it would need a fresh locked comparison.

## Files
- **Cases and checks:** `cases/`, `expected/`, `checks.json`, `LOCK.json` and `PLAN.md`.
- **Freeze:** `FREEZE.md`, `FREEZE-LOCK.json` and `driver.py`.
- **Run:** `driver-log.json`, `aggregate.py`, `scored/score-{baseline,candidate}.json` and `adjudication.json`.
- **Offline checks:** `offline/` (test output and replay hashes).
- **Raw outputs:** per-case run records under `eval/runs/2026-11-05T*`. They are git-ignored and included in the bundle.
