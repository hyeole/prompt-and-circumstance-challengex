# Event scope and finding attribution: implementation report (branch `improve/scope-attribution`, from `72ba296`)

> **Corrected version.** This revision supersedes the report committed with `e61b9c4`.
> - **Promotion gap fixed (§1.1a).** An independent review found that the first-to-last promotion tested the whole sentence. In "The subject first entered the United States in 2005; his wife has never left the United States since 2016." it promoted the subject's first entry because of the wife's clause. The promotion now requires the evidence to concern the same person and the same entry event.
> - **Changed-case count corrected.** The recorded replay changes **8** distinct cases, not 7: C037-AMB, C037-X1, C119-AMB, CAP-A1P, CAP-A2P, CAP-B1N, CAP-B1P, CAP-B2P.

**What this is:** one code/test change for the two defects that capability-1 found on **both** engines, validated **offline only**.
- **CAP-B1N:** a *first* entry was compared with the form's *last* entry.
- **CAP-A2P:** a finding contradicted its own attribution.

**What this is not:**
- No hosted-model calls, evaluation, merge, push, promotion or deployment.
- The capability-1 cases, expected answers, scorer and measured outputs are unchanged (branch `experiment/capability-1`, `f192a43`).
- The two reproductions are **post-observation development tests**. Nothing here measures accuracy, and **no accuracy increase is projected**.

## 1. What changed (`lib/review/facts.ts`, `lib/review/person-event.ts`)
### 1.1 Event scope in entry comparisons
**How scope is read.** Each entry statement now carries the scope its own clause states, read by `entryScope`:
- the entry word nearest the fact (the year, or the manner wording);
- the scope word governing it: "first entered", "his last entry", "had previously entered", "for the first time".

In "first entered … in 2005 and last entered … in 2016", each year takes its own entry's scope. A scope word in a reporting clause ("When first asked, he said he entered …") does not count.

| Comparison | Before | Now |
|---|---|---|
| Statement vs the form's last-entry **date** (`F-ENTRY-DATE`) | any entry statement | last-entry or unspecified statements only |
| Two narrative years (`F-ENTRY-DATE-2`) | any two | only about the same entry: last with last (or unspecified), or first with first; previous entries never |
| Statement vs the form's **manner** (`F-ENTRY-MANNER`) and two manners (`-2`) | any | the same rule |
| Unattributed accounts routed as "may conflict with this record" | any differing statement | last-entry or unspecified statements only |
| "Does the subject agree with the form" (suppresses unattributed statements) | any subject statement | the subject's last-entry statements only |

**Unchanged:**
- **Same event in the source:** a first entry counts as the last entry only when the source says so **about that person and that entry** (§1.1a), and no other statement gives a last or previous entry.
- **Unspecified scope** is still compared, as before.
- **Corrected first answers:** handling is unchanged.
- **Timeout fallback:** the fallback (`sourceEntryStatements`) already used only last or unspecified entries.
- **Charge-requirement checks:** not scope-restricted. They ask whether *anything attributed to the subject* supports the charge's factual element, which is not a same-event comparison.

### 1.1a When a first entry is also the last (corrected)
**The defect.** In `e61b9c4` the promotion tested the **whole sentence** for "never left … since" wording. In "The subject first entered the United States in 2005; his wife has never left the United States since 2016.", `entryScope` correctly returned "first", but the wife's clause promoted the subject's entry to "last".

**Now (`firstEntryIsOnly`).** The evidence must concern the same person and the same entry event. Otherwise the entry stays a first entry. Either:
- **"Only" wording inside the entry's own clause:** "his first and only entry was in 2005"; or
- **A later no-departure clause** ("has never left / not departed the United States", "remained in the United States") that meets all of these:
  - **Same person:** its own subject is the statement's person (a pronoun or "the subject"), or it has no subject of its own and is coordinated with the entry clause ("… in 2005 and has never left …").
  - **No one else in between:** no other person, group or group member is mentioned between the entry and the clause, and no departure, return or removal comes between them.
  - **Same event:** "since" refers to that entry. Accepted: a bare "since", "since then / that time / that date / that entry", "since his entry / arrival", or a date in the entry's own year. No "since", or a different date, ties nothing to this entry.

**No keyword exclusion.** The wife's clause is rejected because its subject is a third party, by the existing participant reading used for every event. Its date (2016) would also reject it on its own. Clauses about a redacted person, and pronouns after another person is mentioned, are rejected the same way.

### 1.2 Findings' attribution, evidence and explanation agree
**The A2P defect.** The decision used one attribution and the explanation another:
- **Decision:** account continuity, "S6 continues S5's account".
- **Explanation:** the sentence-level note "The narrative does not say whether this statement is about this record's subject".

**What changed:**
- **Basis recorded.** `attributeStatement` now records what a "supported" outcome rests on: the clause names the subject, only one person is described, an account continued by pronoun, or the exact-entry link.
- **Account basis, now stricter.** It requires the person–event analysis to resolve the statement's pronoun to the subject's designation. That means the only compatible antecedent, gender-checked, through any intervening pronouns. A continuation whose pronoun could be someone else (a gender mismatch, two men in the named sentence) is **no longer treated as the subject's**: no subject-specific finding, and the account is routed.
- **Entry findings now cite and explain the basis:**
  - **Account link:** the designation is cited as verified evidence (S5, quote "the subject, [REDACTED …]", marked "Names the subject"). The explanation says how the pronoun reaches it.
  - **One person described:** the explanation says so.
  - **Exact-entry link:** the explanation states it, plus "a person should confirm".
- **Unchanged:**
  - The statement's own evidence keeps its text-level label ("unattributed").
  - The form-value link path (`linkNote`) was already explicit.
  - Findings about the history are not affected (none carried the unresolved-attribution note).

### 1.3 Person–event fixes the link needed (both are general defects, not case rules)
1. **Appositive.** "the subject, [REDACTED]" is one person, not two candidates. Before, a pronoun after it was always ambiguous.
2. **Antecedent chosen by position, not by text.** With identical redaction markers in one sentence ("Agent [REDACTED] questioned the subject, [REDACTED]"), `resolve` took the **agent's** marker. CAP-A2P resolved to "officer".

## 2. Development reproductions and controls (`tests/scope-attribution.test.ts`, 18 tests)
The two reproductions are labelled **post-observation** in the file.

| Test | On `72ba296` | Branch |
|---|---|---|
| **Reproduction, CAP-B1N:** first entry 2005 vs form last entry 2016 → no finding | fail | pass |
| **Reproduction, CAP-A2P:** the finding cites S5's designation and explains the pronoun link; no unresolved-attribution note | fail | pass |
| Identical redaction markers: "He" resolves to the subject, not the agent | fail | pass |
| A first and a last entry in one sentence: each year has its own scope | fail | pass |
| A previous entry (later removed) is not compared | fail | pass |
| A first entry with "has never left … since" is compared (same event); not when a last entry is also given | fail | pass |
| **Paired, added in the correction:** another person's no-departure clause does not promote the subject's first entry. Covers the review's wife sentence ("since 2016"), the wife with a bare "since", a redacted person as the clause's subject, and "he" after "with his brother" | fail ³ | pass |
| **Paired:** the subject's own linked statement does promote it. Covers the coordinated "and has never left … since", "he has never left … since 2005", "has remained … since then", and "his first and only entry … in 2005" | pass ³ | pass |
| **Paired date scope:** the same person, but not this entry. Covers "since 2016", no "since" at all, and a return to Mexico in between | fail ³ | pass |
| Same-event pairs: last/last (B2P) and first/first conflict; first/last does not | fail ¹ | pass |
| Manner: a first entry by visa vs the form's EWI last entry → no finding; the last entry vs AIR → finding | fail | pass |
| The pronoun's person could be someone else (gender mismatch; two men) → no finding, routed | fail | pass |
| One-person narrative: the explanation states that basis | fail | pass |
| Timeout fallback: same scoped and explained results | fail | pass |
| Control CAP-B1P: genuine last-entry conflict kept | fail ¹ | pass |
| Control: unspecified entry still compared; "When first asked" is not a first entry | fail ¹ | pass |
| Control CAP-B2N: corrected first answer, no conflict | pass | pass |
| Control CAP-A2N: two unnamed men → routed, never a finding | pass | pass |

³ Against the first version of this branch (`e61b9c4`). The "another person" and "date scope" tests fail there; the linked-statement test passes on both.

¹ These fail on `72ba296` only on the new explanation wording ("for the last entry") or on the new `entryScope` export. The behaviour they protect is the same on both.

## 3. Validation
| Check | Result |
|---|---|
| Full suite | **326/326** (308 existing, unchanged, plus 18 new) |
| Type-check (`tsc --noEmit`) | clean |
| Production build (`next build`) | ok, BUILD_ID `p5PTXK07ZEcp4Sp4W99dq` (not deployed) |
| Existing offline repro scripts (10) | 9 identical. `replay-round3`: F010/F010-D/F010-X S46 (a consular-notification sentence) is no longer "supported" (§1.2's stricter account basis; S45 names "The subject" and a separate redacted person). No finding depends on it |
| **Offline replay of every saved result**: 1,412 results in 142 runs (main checkout plus the integration, visa and capability-1 worktrees), each in three modes | Against `72ba296`:
- **recorded extraction:** 32 results change, in **8** distinct cases (C037-AMB, C037-X1, C119-AMB, CAP-A1P, CAP-A2P, CAP-B1N, CAP-B1P, CAP-B2P);
- **model citation forced to mismatch:** the same 8 cases, 32 results;
- **every fact call failed (fallback):** 24 results, in 4 cases (C037-X1, CAP-A1P, CAP-A2P, CAP-B1P).

Nothing else changes. **The corrected promotion changes no saved result** in any mode: the outputs are identical to `e61b9c4`'s, so no saved output relied on the promotion. The repro scripts are also identical to `e61b9c4`'s |

The replays use the saved extraction, or a timeout where it failed, and a stubbed review sample. Model-written issues are therefore not replayed (§5).

## 4. Every changed finding, citation and routing item (all three replay modes)
### Removed false findings
| Case | Results | Change | Source check |
|---|---|---|---|
| **CAP-B1N** | 2 (both engines' saved extractions); recorded and mismatch modes | `F-ENTRY-DATE` (S9 "first entered … in 2005" vs form last entry 08/20/2016) removed. Its routing reason and the citation qualification "depends on conflicting facts the charge relies on" go with it; recorded-mode citation `needs_human_review` → `consistent` | **Correct.** S9 is the first entry; S10 (last entry, 08/20/2016) agrees with the form. In the fallback mode this finding never existed |

### Improved explanations (same finding, same decision)
| Case | Results | Change | Source check |
|---|---|---|---|
| **CAP-A2P** | 2, all three modes | `F-ENTRY-DATE` now cites S5's "the subject, [REDACTED]" and says S6's "He" can only refer to that person. The "does not say whether …" note is gone | **Correct.** S4's other person is a woman; S5 designates the subject by appositive ("about his citizenship") |
| **C037-X1** | 18, all three modes | `F-ENTRY-DATE`: the note is replaced by "S21 does not name the subject itself; the narrative describes only one person of interest, so the statement is treated as the subject's" | **Matches the decision**: the engine's existing one-person rule. Benchmark plant **already detected**; the explanation only |
| **C037-AMB** | 2; recorded and mismatch modes | `F-ENTRY-MANNER`: the same one-person basis replaces the note | Same |
| **CAP-A1P, CAP-B1P** | 2 each, all modes | "gives 2016 for the entry" → "for the last entry" | **Correct**: the cited statement says "last entered" |
| **CAP-B2P** | 2; recorded and mismatch modes | `F-ENTRY-DATE-2`: "… for the entry" → "for the last entry" | **Correct**: both statements are about the last entry |

### Recovered detections
**None.**
- **CAP-A2P** was already flagged and routed. It is not a new detection: the explanation no longer disclaims the finding.
- Under the frozen scorer v2 its check moves from fail to pass. That is an explanation correction, classified as such.

### Losses: routing removed
- **C119-AMB** (benchmark case), 2 results, recorded and mismatch modes. **What was removed:**
  - the rule-level unattributed account "S15 describes entry without inspection; the form code AIR indicates admission";
  - its routing reason;
  - the citation qualification "depends on an unattributed account", recorded-mode citation `needs_human_review` → `consistent`.
- **Cause:** S15 is "He also stated that he **first** entered the United States by walking across the border". The form's AIR is the **last** entry, which S26 corroborates. Under the scope rule this is no longer a possible conflict with the record. The label review of 2026-10-30 already questioned the inconsistency plant's premise for the same reason.
- **Effect on the benchmark:**
  - The inconsistency plant stays **missed**, as before.
  - The **ambiguity-routing plant** loses its rule-level routing item. In **all 18 saved live runs** the model also routed C119-AMB for its own reasons, so no saved run's routing credit would change. With a review where the model does not route, it would.
- **This is a real reduction in rule-level routing on a labelled plant. It is reported as a loss, not a fix.**

### Attribution decision changed with no output effect
- **F010 / F010-D / F010-X, S46:** no longer "supported" (§3). No finding, citation or routing item changes in any replay.

### Citation safeguards
In the forced-mismatch mode, the only citation differences are B1N's and C119-AMB's qualifications above. The E3U/E4U protections and all charge-requirement tests are unchanged.

## 5. Capability-1 (development cases): what this does and does not show
**Composed check.** Each engine's saved live result was taken with its comparison findings (`F-ENTRY*`, `F-HISTORY*`) recomputed by this code, and scored with the **frozen** scorer v2:
- **CAP-B1N** and **CAP-A2P** move from fail to pass for both engines.
- **No other case's comparison findings change.**

**These are the development reproductions themselves. This is not a measurement.** Counts are given only to show what did not change:
- Verified: 19/22 saved → 21/22 composed. E4U still fails: model citation, fixed only in the candidate.
- Candidate: 20/22 → 22/22.

**A case pass is not a fully correct review.** Known defects retained, not addressed here: the model's encounter-time findings ("0910 vs the agent arrived at 0900"). The narrative never states the encounter time. The shared case template does not excuse them.

| Engine | Encounter-time false findings | In cases that pass their check |
|---|---|---|
| Verified (`2f54880`) | 5: B1N ×2, B1P, B2N, C1P | B1P, B2N, C1P pass with a false finding. B1N, composed, passes its check but still has **two** false findings |
| Candidate (`72ba296`) | 1: B1P | B1P passes with a false finding |

**Unnecessary routing (model requests about the encounter time, no finding behind them):**
- **Candidate:** A1N, C1N, C2N, D1N, D2N.
- **Verified:** B2N.

They pass their checks, but a person would have to clear them.

**Other live items:** the identifying-documents and REMOVABILITY-ground checklist items (A2N, A2P, E1N, E1P, E2N, E2P, E3U, E4U). They are consistent with the template's bare wording, not false findings.

## 6. The 54-plant benchmark
**No existing 54-plant miss is recovered.**
- **The six entry-date misses are unchanged:** F039-X, F010-X, F075-X, C001-X1, C045-X1's planted conflict, and C119-AMB. Their statements lack an explicit tie to the subject. The stricter account rule does not create one, and matching values are still excluded.
- **No benchmark case gains a finding** in any replay mode.
- **Benchmark cases that change:**
  - **Explanation only:** C037-X1 and C037-AMB.
  - **Rule-level routing removed** (§4): C119-AMB.

**No accuracy change is projected.**

## 7. Limitations
- **The scope reader is lexical:**
  - an earlier entry with **no** scope word ("entered in 2005 and returned to Mexico in 2010; last entered in 2016") is still compared, as before;
  - re-entry words ("came back", "returned to the United States") are unspecified.

  Inferring "previous" from a later departure was not added.
- **Coverage of the corpus:** across all saved extractions (505 distinct entry statements), the reader marks 3 as first, 54 as last and 448 as unspecified, so most comparisons are unaffected.
- **The stricter account rule** depends on the person–event pronoun resolver (gender, nearest compatible sentence). A narrative with an unmarked gender for the subject, and another compatible person in between, will route rather than attribute.

## 8. Files
- **Code:** `lib/review/facts.ts`, `lib/review/person-event.ts`.
- **Tests:** `tests/scope-attribution.test.ts`.
- **First commit:** `e61b9c4`. **Correction:** the commit carrying this report.
- **Tooling:** `scripts/replay-all-saved.ts` (offline replay of any set of saved runs, resolving each run's own cases).
- **Evidence** (in the bundle, not committed):
  - before/after replay outputs for the three modes;
  - the itemised change list;
  - test, type-check and build logs;
  - the new tests' results on `72ba296`;
  - the capability-1 composed check;
  - the scope audit;
  - repro-script diffs.
