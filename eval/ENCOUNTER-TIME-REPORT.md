# Encounter-time validation: implementation, offline validation and one candidate-only live verification

**Branch:** `improve/encounter-time`, from `be71a16`. Code commit and frozen build: **`a465773`**, BUILD_ID `EvyNM9d7YTmfGolhqlxe2`.

**Scope:** one bounded task. The model's encounter-time false findings, and the routing reasons that depend on them.

**The live part is a post-tuning development verification on reused cases.**
- The 22 capability-1 cases were written by the team and were already observed.
- The fix was developed after seeing their outputs.
- This is not an evaluation or an accuracy measurement, and it is not combined with the 54-plant benchmark.

**Unchanged:** the cases, expected answers, scorer (v2, frozen), labels and historical results.

**Not done:** merge, push, promotion, deployment, or any further evaluation.

## 1. The defect (reproduced before editing)
**Where it was observed.** The capability-1 raw outputs (2026-11-01) show the model comparing the form's encounter hour (0910) with times the narrative gives for other events:
- the Trooper's **request** at 0815;
- the agent's **arrival** at 0900.

The narrative never states the encounter time.

| Engine | False findings | Routing |
|---|---|---|
| Verified | 5 kept as findings (B1N ×2, B1P, B2N, C1P) | — |
| Candidate | 1 kept as a finding (B1P) | The model's routing reasons alone sent A1N, C1N, C2N, D1N and D2N to a person, after the claims themselves were withheld or never verified |

**Cause.**
- **Findings:** the existing check (1e) excluded only call/request times. An arrival time, or a request time cited together with an arrival time, passed.
- **Routing reasons:** these were removed only when they repeated a claim *withheld as invalid*. A reason such as "Potential need to verify correct encounter time" or "Conflicting encounter times." was kept even when the narrative states no encounter time at all.

**Reproduction.**
- **Method:** `scripts/replay-reconstructed.ts` rebuilds each saved result's model output from what the result kept: model claims with their evidence, routing reasons, element answers and citation. It is replayed with the saved extraction.
- **Fidelity:** on the 44 capability-1 results, the rebuilt reviews route exactly as saved (44/44).
- **Result on the unchanged code:** the false findings and routing reasons above all reappear.
- **Limit:** claims the saved run discarded cannot be rebuilt, because their evidence is not saved.

## 2. What changed
### `lib/review/times.ts` (new): event-scoped clock times
Each stated time is read with the event its own clause states:
- encounter;
- arrest;
- call / request / dispatch;
- arrival;
- processing (transport, Miranda, booking, notification of rights);
- none stated.

How the event is chosen:
- **Nearest event word.** The time takes the event word nearest before it in its clause, or the nearest after it when there is none before. So "arrested and transported … at 2145 hours" is the transport's time, and "At 0815 hours, a Trooper requested …" is a request.
- **Arrival counts only when linked.** An arrival counts as the encounter only when the same clause also states the encounter or arrest: "arrived and encountered the subject at approximately 0900 hours", G08's wording. Otherwise a request or arrival time is never the encounter time.
- **Formats read:** 12-hour times, "0412 am" and "09:10". Addresses ("at 1234 Main Street") and heading words ("Facts of Arrest: …") are not read as times or events.

### `lib/review/review.ts`
**1. Model claims of a time conflict** (inconsistency, or a clarification asserting a conflict).

**Against the form's encounter hour**, a claim is kept only when a cited sentence states the **encounter or arrest** time and it differs from the form's by **30 minutes or more**, the threshold the existing time rule uses. Otherwise:

| Case | Result |
|---|---|
| Only request, arrival or processing times cited | Withheld as **invalid**, with the event named |
| An encounter time within 30 minutes | Withheld as **invalid** |
| A differing time the narrative ties to **no event** | Withheld as a finding but **not** invalid. The code routes it instead: "… A person should confirm the encounter time" |
| A claim that names a date other than the form's (a date claim) | Left to the existing date checks |
| An observation that the time is **not stated** | Kept as given |

**Between narrative times only**, the times must belong to the same event.

This replaces the request-only check (1e). Its wording is kept for request times, so the existing C012-M2 and C037-AMB tests are unchanged.

**2. Routing reasons.** A reason part whose **only** concern is an encounter-time conflict is removed when the source does not support one. "Supports one" means a stated encounter or arrest time, or a time tied to no event, differing by 30 minutes or more, or a kept finding about the encounter time.

| Kind of reason part | When it is removed |
|---|---|
| Asserts a conflict | When the source supports none, as above |
| Asks to verify or confirm the time | Only when, in addition, this review withheld a model time claim |
| Is about the encounter **date** | Never |
| Says "date/time" | Only when the narrative states the form's own encounter date |
| Is a missing-time observation | Never |
| Mixes the time with other facts | Never ("Conflicting entry dates and encounter times …") |
| Is about other facts | Never |

When removing a part leaves only follow-on words, the whole reason goes. Every removal is listed in `discarded`.

### Tests
**`tests/encounter-time.test.ts`, 11 tests.** Reproductions labelled post-observation, plus controls:
- a genuine encounter-time conflict and its reason kept;
- an arrival linked to an encounter;
- an arrest time, with the time rule's own finding unchanged;
- within 30 minutes;
- a time tied to no event, routed;
- a missing-time clarification;
- encounter-date reasons;
- "date/time" with differing dates;
- mixed and other reasons;
- narrative-only comparisons.

**One existing assertion changed** (`tests/review.test.ts`, "routing echo, negative controls"). A bare "Conflicting encounter time" for C013 was expected to be kept, because no claim was withheld. C013 states 2000 hours (the Troopers' request), 2030 (an agent's arrival) and 2145 (transport), and no encounter time. Under event-scoped validation, the conflict it asserts is unsupported. The assertion now expects removal, with the reason in a comment. The kept counterpart is in the new file.

## 3. Offline validation (`a465773`)
| Check | Result |
|---|---|
| Full suite | **337/337** (326 before; 11 new; one existing assertion changed, §2) |
| Type-check | clean |
| Production build | ok. Frozen BUILD_ID `EvyNM9d7YTmfGolhqlxe2`, rebuilt from the clean commit |
| Stub replay of all 1,412 saved results, three modes (recorded extraction, forced citation mismatch, all calls failed) | **0 changes.** Scope and attribution, citation safeguards, the timeout fallback and the time rule are untouched |
| Reconstructed-model replay of all 1,412 saved results | **17 results change, in 14 cases**; each one checked below |

**Every change in the reconstructed replay:**

| Case(s) | Change | Source check |
|---|---|---|
| CAP-B1N, B1P, B2N, C1P (both engines' saved outputs) | Model findings withheld:<br>- "agent arrived at 0900 vs 0910";<br>- "encounter began at 0815 and agent arrived at 0900";<br>- "narrative states 08:15";<br>- "encounter around 0815-0900".<br>Their reasons go with them | **Correct.** 0815 is the Trooper's request; 0900 is the agent's arrival; the narrative states no encounter time |
| CAP-A1P, C1P, C2N, D1N, D2N, E2P | Time-only reasons removed ("Conflicting encounter times", "Encounter date/time conflict …", "… requires verification …"). **C2N and D2N are no longer routed** | **Correct.** Same template; the narrative's date (March 12, 2024) matches the form |
| C012-X1 | "Conflicting encounter times between narrative and form fields." removed | **Correct.** 2000 hours: the Trooper's request; 2145: transport |
| C021-X1 (5 results) | The time part only removed ("encounter timing inconsistent"); the entry, manner, history and **encounter-date** parts kept | **Correct.** 0412 and 0630 are dispatch and call-in times |
| C037-AMB | "Encounter date/time conflict" removed | **Correct.** 1206: a call received; 1335: Miranda, which is the form's own hour; the date matches |
| F039-G, F039-X | Model finding "Narrative says 7:50 AM, form 08:47" withheld; the code adds a routing reason ("0750 hours without saying which event it is … A person should confirm") | **Withheld correctly, still routed.** "At approximately 7:50 AM a dark colored van passed the agents" does not state the encounter. Routing is unchanged |

**Kept, after the first draft over-reached** (the draft was corrected before freezing):
- **C001-M3:** the model's "does not specify the date or time of the encounter".
- **C021-CIT / C021-X1:** the encounter-**date** reasons.

**No case outside capability-1 changes whether it is routed. No benchmark label concerns the encounter time:** the only related label, G08, is a should-not-flag control, consistent with this change.

## 4. Live verification: candidate `a465773`, 22 capability-1 cases
**Conduct.**
- **Before any call:** the commit, a clean tree and the BUILD_ID were checked, and the capability-1 LOCK hashes were verified.
- **Settings:** unchanged; prompts `facts-v2.0` and `review-v1.4` are byte-identical to `72ba296`'s.
- **Order:** each case once, in ID order, concurrency 1, no reruns or edits.
- **Requests:** **66** (ceiling 132), 0 retries, all successful. No stopping rule triggered.
- **Results:** 22 reviews returned, all extractions valid, 21 complete. **CAP-E1N is partial** (no element output for E7, N6), as in the saved run.
- **Latency:** p50 19.2 s, p90 24.4 s, max 27.7 s.
- **Runs:** `eval/runs/2026-11-01T17-27-02` … `17-33-40` (experiment worktree; raw outputs and extractions in the bundle).

### Results (frozen scorer v2, then source-level adjudication)
| | This run (`a465773`) | Saved candidate run (`72ba296`) |
|---|---|---|
| Cases passing their checks | 22/22 | 20/22 |
| Encounter-time false **findings** | **0** | 1 (B1P) |
| Model encounter-time claims withheld | 9: A1N, B1N, B1P, C1P, C2N, D1N, D2N, E1P, E2N, all against the 0815 request or 0900 arrival | — |
| **No-flag cases routed** | **1/9** (E1N, partial review) | 7/9 (A1N, B1N, C1N, C2N, D1N, D2N; E1N partial) |
| Detect and unresolved cases routed | 13/13 | 13/13 |

**Adjudication of every finding:**
- **Correct detections, 10:** A1P, A2P (citing S5's designation), B1P, B2P, C1P, C2P, D1P, D2P, and the E1P and E2P citation rules.
- **No incorrect findings.**
- **Checklist items:** identical to the saved run (M-N1/U-N1 identifying documents; M-N5/U-N5 the bare REMOVABILITY ground). They are consistent with the template's wording.

**Errors in otherwise passing cases (this run):**
1. **CAP-D1P, citation `needs_human_review`.** The model writes that "the removal record conflict creates uncertainty about the charge fit". The selected charge, INA 212(a)(6)(A)(i), does not depend on a prior removal, so this qualification is unnecessary. The saved run said "consistent", so this is **model variance**, not code.
2. **CAP-E3U, routing reason.** One model reason says "the narrative and form fields conflict on that fact" (prior removal). The removal is of an unidentified occupant, so no subject-specific conflict is established. Routing and the citation verdict are right; the reason's wording overstates it.
3. **CAP-E1N, routed because the review is partial.** A completeness route, not a false concern; the same in the saved run.
4. **CAP-B1P, "Conflicting entry dates and locations".** Checked and **correct**: the form's last-entry place (Del Rio) is the narrative's first-entry place; S10 gives Eagle Pass.

### Code effects vs model variance
The code paths are deterministic, and each removal says which mechanism made it.

**Effects of this change (new code), seen live:**
- **B1N:** the model again claimed "agent arrived at 0900 vs 0910". The code before this change kept that exact claim: the verified engine's saved I-1. It is now withheld, and B1N is not routed. B1N's entry-date false finding is also gone; that is the earlier `be71a16` scope fix.
- **D1N, D2N, E2N:** model reasons "Encounter date/time conflict …" and "… requires verification" were removed by the new reason check. The previous mechanism had kept them, so without this change all three would have been routed. In the saved run E2N was not routed: the model raised no time reason then.
- **B1P:** a time-only reason was removed. B1P is still routed, correctly, for its entry conflict.

**The same under the previous code (model variance):**
- **A1N, C2N, E1P:** the request-only claims, and the reasons that repeated them, are withheld by mechanisms that already existed. They are unrouted now because the model's reasons were echoes, unlike the saved run's "Potential need to verify correct encounter time".
- **C1N:** the model raised no time concern this time.
- **D1P:** the citation qualification above.

**Effect of the earlier branch fixes:** A2P passes (attribution explanation) and B1N has no entry-date finding (`be71a16` / `e61b9c4`).

**Not shown by this run:** whether the new reason check removes a reason in a narrative with a genuine but unclassified encounter time. Offline, such a time routes (F039).

## 5. Limitations
- **Lexical event reading.** Event words outside the lists ("found", "came upon", "approached") read as no event. A differing time then routes rather than producing a finding; it is never treated as a conflict.
- **The 30-minute threshold** is the time rule's existing one, applied to model claims too. A stated encounter time 10 minutes from the form's is not a conflict.
- **Mixed routing reasons** that combine a time concern with another fact are kept whole. A1P and B1P had such reasons in the saved run.
- **Reused, team-authored cases** (capability-1) were seen before the fix: this is development verification, not evidence of accuracy.

## 6. Files
- **Code:** `lib/review/times.ts` (new) and `lib/review/review.ts`.
- **Tests:** `tests/encounter-time.test.ts`, plus one assertion in `tests/review.test.ts`.
- **Tooling:** `scripts/replay-reconstructed.ts`.
- **This report.**
- **Evidence (bundle):**
  - the live run's 22 raw outputs with extractions;
  - the driver and its log;
  - the analysis;
  - the stub and reconstructed replays (before and after) and the itemised change list;
  - suite, type-check, build and server logs.
