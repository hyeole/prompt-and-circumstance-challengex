# diag-1 results: a fresh bounded diagnostic of df11086

**Status:**
- **What this is:** 20 **team-authored development cases**, written and locked before any engine output on them was seen (`LOCK.json`, commit `fef99e6`).
- **What this is not:** an evaluation, independent validation, or part of the historical 54-issue benchmark. No overall accuracy percentage and no target achievement is claimed.
- **What was done afterwards:** findings were adjudicated by the team against the source (`adjudications.json`). Nothing was tuned, and no engine code changed.

## Run
- **Engine:** `df11086`.
- **Build mapping:**
  - The server worktree's `lib`, `app`, `components` and `config` are identical to `df11086`, and the tree was clean.
  - It was freshly built, with BUILD_ID `QI0oq2VYogLpfsW7Nu78k`, checked by the driver before any call.
  - The runner checkout was `fef99e6`, the lock commit, whose code is the same.
- **Settings (unchanged):** `gpt-oss-20b`, low reasoning, 2 samples, `facts-v2.0`, `review-v1.4`, references `team-provisional-2026-10-31.1`, existing timeout and retry limits.
- **Execution:** 20 reviews, each case once, in ID order, concurrency 1, no reruns.
- **Model requests:** **60 attempts** (hard maximum 120).
  - 20 fact extractions ok.
  - 39 review samples ok, plus 1 second sample cancelled after the normal grace period.
  - 0 retries, 0 HTTP errors. No stop rule triggered.
- **Completion:** 20/20 reviews complete.
- **Latency (server):** p50 14.0 s, p90 24.4 s, max 38.9 s.
- **Preserved:** raw results (findings, extractions, calls, timings) are in the evidence bundle. Run records are under `eval/runs/2026-11-04T19-*` (raw is git-ignored), with `driver-log.json`.

## Results, reported separately
**Source-supported detections (10 established issues, locked checks):**

| Case | Issue | Outcome |
|---|---|---|
| DG01 | pronoun-linked entry date (2016 vs form 2019) | **Detected** (`F-ENTRY-DATE`, S7) |
| DG02 | last entry without inspection; form manner B2 (from the first entry) | **Missed**; an incorrect citation mismatch was raised instead (see below) |
| DG03 | never admitted (explicit) under INA 237(a)(1)(B) | **Detected** (citation mismatch) |
| DG04 | completed removal in the subject's records vs NEGATIVE | **Detected** (`F-HISTORY`) |
| DG05 | manner of entry missing | **Detected** (`M-E3`); the charge is "needs human review", not "mismatch" (correct: absence is not contradiction) |
| DG06 | disposition missing | **Detected** (`M-N7`) |
| DG07 | 8 U.S.C. 1326 with an explicit no-removal record and denial | **Missed**: the citation was "needs human review" instead of a mismatch |
| DG08 | B2 admission under INA 212(a)(6)(A)(i) | **Detected** (citation mismatch) |
| DG09 | designated subject among three people (2015 vs 2017) | **Detected** (`F-ENTRY-DATE`, S5) |
| DG10 | place of entry (Del Rio vs Calexico) | **Detected** (model finding `I-1`) |

8 of the 10 locked established-issue checks passed. This is a count on these development cases, not an accuracy rate.

**Incorrect flags (adjudicated):** 8 of the 18 findings issued.
- **DG02 `C-1`:** a mismatch resting on the form's B2 and the 2009 **first** entry (S5). The narrative's **last** entry supports the charge.
- **DG07 `M-N5`:** "ground not stated", false. The ground is stated, but split by the sentence splitter.
- **DG07 `F-HISTORY`:** the split-off charge clause "1326 as an alien found in the United States after removal" was read as a prior removal of the subject.
- **DU03 `M-N5`:** the same splitting defect as DG07.
- **DU02 `F-HISTORY`:** asserts the subject's removal from the cousin's relayed "he was deported", which has two possible referents. The extraction itself marked the statement person "other".
- **"Unclear: identifying documents" (`U-N1`), three times, on paraphrases that do state the documents:**
  - **DN06:** "carried no papers of any kind".
  - **DU01:** "Neither man carried identification".
  - **DU02:** "He presented a Honduran identity card".

**Correct or valid findings:** 9 correct (the eight detections listed above, plus DU04's conflicting-accounts finding), and 1 debatable valid observation (DU04 `M-N1`).

**Charge-check verdicts:**
- **Incorrect:**
  - **DG07:** "needs human review" instead of a mismatch. The misread charge clause counted as a verified prior removal.
  - **DU03:** "consistent". An in-absentia removal **order** was treated as a completed removal, although the records say execution is not shown.
- **Unnecessary qualification:** DG01, DG09 and DG10. A date or place conflict qualified a charge that depends on manner, which is stated and uncontested.

**Unresolved cases (routing):**

| Case | Expected | Outcome |
|---|---|---|
| DU01 | routed, naming the 2010 statement, with no contradiction | **Met**: routed with an item for S7 ("cannot be attributed"); no contradiction asserted |
| DU02 | routed, with no history conflict asserted | Routed and S5 named, but an **incorrect** `F-HISTORY` contradiction was also asserted |
| DU03 | charge "needs human review" or "insufficient information", and routed | **Not met**: "consistent", not routed |
| DU04 | routed for the two accounts, no mismatch | **Met**: `F-ENTRY-MANNER-2`, routed, charge "needs human review" |

**Negative controls:**
- 5 of 6 produced no finding and no routing: DN01, DN02, DN03, DN04, DN05.
- DN06 produced one incorrect `U-N1`.
- No negative control was routed to a person.

**Completion:** 20/20 complete. No review relied on a fallback.

## Strongest reasoning failures (warranting implementation; not implemented here)
1. **Statute citations split mid-sentence, and charge wording read as history** (DG07, DU03).
   - **The defect:** the sentence splitter breaks "8 U.S.C. 1326" after "U.S.". The fragment then:
     - hides the stated ground (false `M-N5`);
     - is matched by the prior-removal reader (`isPriorRemoval("1326 as an alien found in the United States after removal")` returns true), giving a false `F-HISTORY`;
     - turns a correct mismatch into "needs human review".
   - **How general:** "U.S.C." occurs in 13 existing case files (legacy 7, fresh 2, gen-v1 2, app samples 2).
   - **Fix direction:**
     - treat "U.S.C." and similar legal abbreviations as non-terminal in the splitter;
     - never read charge or ground statements (REMOVABILITY, CHARGE, "charged under …", "inadmissible/removable under …") as historical events.
2. **A removal order counted as a completed removal** (DU03).
   - **The defect:** `isPriorRemoval` accepts "ordered … removed in absentia", and the charge check then accepts the 1326 requirement. The person-event module already distinguishes `removal_order` from `completed_removal`.
   - **Fix direction:** under 8 U.S.C. 1326, an order without documented execution or departure leaves the requirement unresolved (a person decides). The same distinction should apply to the history conflict check.
3. **Reported speech by a third party attributed to the subject in the history rule** (DU02).
   - **The defect:** the deterministic history conflict used a relayed statement whose pronoun has two referents, and ignored the extraction's own "other".
   - **Fix direction:** route such statements as unattributed accounts, as entry statements already are.
4. **Event scope of the form's manner** (DG02).
   - **The defect:** the form's manner field (the last entry) was not compared with the narrative's explicitly scoped **last** entry. The charge check also used a **first**-entry statement and the form value as mismatch evidence, although the narrative's last entry supports the charge.
   - **Fix direction:**
     - compare the form's manner with the last-entry statements;
     - when the last entry supports the charge and only the form disagrees, report the form conflict, not a charge mismatch;
     - never use a first-entry statement as support.
5. **Identity-document paraphrases** (DN06, DU01, DU02): "identity card", "no papers of any kind" and "carried no identification" are not recognised, giving false "unclear" flags.
6. **Charge-check qualification by unrelated conflicts** (DG01, DG09, DG10). A date or place conflict qualifies a manner-based charge. This is an explanation and routing improvement, not a detection.

**By kind:**
- **New detections:** items 1, 2 and 4 (the DG02 and DG07 misses; correct handling of DU03).
- **False-flag removals:** items 1, 3, 4 and 5.
- **Explanation and routing:** item 6.
- **Scoring:** none. The locked checks were not changed after the run.

## Not done
No tuning, merge, push, deployment or presentation change. The server was stopped after the run, and the key link was removed from the server worktree.
