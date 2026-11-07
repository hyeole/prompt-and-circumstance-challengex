# measure-d062b1d: full benchmark of the final candidate d062b1d (LOW reasoning) on the same 89 cases

**What this is:**
- A **remeasurement on a reused internal development benchmark**. It is **not** independent validation or overall
  accuracy.
- The 77 historical cases (54 labels) and the 12 gen-v1 cases are reported separately. No runs are combined, and no
  failures are excluded.

**Headline:**
- **Strict detection: 42/54 (77.8%)**; **41/54 (75.9%)** without the C045-X1 clarification credit.
- **Against 74e15fb:** the same score, label for label. No detection was gained or lost.
- **Against ffa7ecd** (37/54): 5 labels recovered, and **all 5 are recovered timeout losses**, not new detections.
- **Completion:** 74/77.
- **Incorrect flags after adjudication:** **2/94** (claim layer) and **4/94** (key-only).
- **Timing:** no review took over 60 s.

| Engine | Strict detection | Without the C045-X1 credit | Completion | Incorrect flags (claim layer, final) |
|---|---|---|---|---|
| `ed42763` (rc-int-1, historical) | 44/54 | 43/54 | 77/77 | 1/105 |
| `74e15fb` (measured) | 42/54 | 41/54 | 74/77 | 0/91 |
| `ffa7ecd` (measured; endpoint timeouts) | 37/54 | 36/54 | 54/77 | 0/84 |
| **`d062b1d` (this run)** | **42/54** | **41/54** | **74/77** | **2/94** |

## 1. Candidate and freeze
**The one correction since d372f13** (`diff-d372f13-to-d062b1d.patch`, `lib/review/review.ts`):
- **The rule:** a review-sample answer that is invalid, or that omits checklist items the model was asked about, does
  not start the 12 s grace period after which the other sample is cancelled.
- **Unchanged:** no retry, deadline or status changes. Omitted items stay unchecked if no sample supplies them.
- **Evidence:**
  - paired tests: 1/5 pass at d372f13, 5/5 at d062b1d;
  - suite 484/484; `tsc` clean; clean build;
  - 498 saved runs (1,768 records) replay byte-identically to d372f13.

**Cumulative changes since 74e15fb** (`diff-74e15fb-to-d062b1d.patch`): chronology (`5ab93f1`), robustness
(`ffa7ecd`), a reachable retry inside the same budget (`d372f13`), and the grace rule (`d062b1d`).

**Freeze:** `dd41249`, before any call.
- **BUILD_ID:** `GEBczFgK2OrwRJtYdvKIJ`, on a clean server tree.
- **Locked inputs:** all 199 locked for measure-ffa7ecd are byte-identical: the 89 cases, expectations, references,
  v2.4 scorers, run scripts, and the fixed starting adjudication state (`8480aec`, 119 items).
- **Settings:** LOW reasoning, 55 s per call, retry reserve 25 s, at most 2 requests per call, 2 samples, 12 s grace.

**Run:**
- 89 reviews, each once, sequentially.
- **278 requests** (hard maximum 534).
- **Errors:** 0 HTTP errors. No stop rule fired, and no review had every call fail.
- **Afterwards:** the server is stopped and the key link removed.
- **Storage:** run records in `.worktrees/measure-d062b1d` (durable).

## 2. Historical benchmark (77 cases, 54 labels)
| Measure | Before this run's adjudications | **After (final)** |
|---|---|---|
| Strict detection (both layers) | 42/54 | **42/54 (77.8%)** |
| – without the C045-X1 clarification credit | 41/54 | **41/54** |
| Incorrect flags, claim layer | 4/94 (4 unadjudicated) | **2/94** |
| Incorrect flags, key-only layer | 6/94 (4 unadjudicated + 2 long-standing `U-N5`) | **4/94** |
| Completion | 74/77 | **74/77** |
| Multi-charge routing | 6/6 | 6/6 |
| Ambiguity routing | 3/4 | 3/4 |
| Unnecessary routing | dev 2/10, fresh 3/18, legacy 2/15 = 7/43 | same |
| "Should not flag" violations | 0 | 0 |

**By dataset (claim layer, final):**

| Dataset | Detection | Incorrect | Completion | Latency p50 / p90 / max |
|---|---|---|---|---|
| dev | 6/6 | 1/11 (DS10) | 12/12 | 12.4 / 17.7 / 23.9 s |
| fresh | 11/17 | 0/27 | 28/28 | 18.0 / 29.6 / 36.6 s |
| legacy | 25/31 | 1/56 (C021-X1) | 34/37 | 17.7 / 54.4 / 55.1 s |

**Detection by plant type:** missing element 16/16, inconsistency 8/17, citation 9/11, multi-charge 6/6, ambiguity 3/4.

**Partial reviews (3), with reasons:** C013, C021-X1 and C037-CIT. In each, fact extraction did not complete: both
requests timed out, so entry and history comparisons used only the source-text rules.

**Incorrect flags:**
- **Claim layer (2):** DS10 `M-E6` and C021-X1 `I-3` (see §5).
- **Key-only layer (4):** the same two, plus two key-layer records that the claim layer holds valid. The two extra
  key-only flags are the long-standing key-layer records, not new findings.

## 3. Gains and losses
**Against 74e15fb (42/54): none.** All 54 plant outcomes are identical.

**Against ffa7ecd (37/54):**

| Label | ffa7ecd → d062b1d | Kind |
|---|---|---|
| C003-M3 (missing element) | not completed → **detected** | **Recovered timeout loss** |
| C037-M3 (missing element) | not completed → **detected** | Recovered timeout loss |
| C037-X1 (entry date) | not completed → **detected** | Recovered timeout loss |
| C037-AMB (ambiguity) | not completed → **detected** | Recovered timeout loss |
| C037-AMB (inconsistency) | not completed → **detected** | Recovered timeout loss |
| F075-X; C119-AMB (both labels); C119-CIT; G06 (gen-v1) | not completed → missed or routed only | Same outcome as 74e15fb |

**Genuinely new detections: none.**
- All five recoveries were detected by 74e15fb and lost in ffa7ecd only because those reviews timed out.
- They completed here, but the attempt logs show **no direct retry rescue**. Their first requests answered in time.
- **Cause:** the endpoint behaved better in this run. The correction did not rescue them.
- **Scorer corrections and unsupported attribution:** none were counted.

## 4. Timing, attempts and retries
**Latency:**
- **Historical reviews:** p50 17.0 s, p90 29.6 s, max 55.0 s.
- **gen-v1:** p50 18.2 s, max 25.9 s.
- **Reviews over 60 s:** none. The longest call was 55.02 s.

**Requests:** 278 for 267 calls; 256 calls used one request.

**The 11 calls where a second request started:**

| Outcome | Calls |
|---|---|
| **Direct rescue** (the second answered while the first was still unanswered) | **0** |
| First request answered after the second started (second cancelled) | 7 (5 fact extractions, 2 review samples) |
| Caller grace cancelled both (the twin sample had answered) | 1 |
| **Both requests timed out** | **3** (fact extractions of C013, C021-X1, C037-CIT: the 3 partial reviews) |

**The new grace rule was not exercised:** no review kept a second sample more than 12.5 s after the first had answered.
C003-M3 completed without needing it.

## 5. New adjudications (additive; scores before and after in §2)
| Case | Item | Verdict | Source |
|---|---|---|---|
| DS08 | `U-N1` | valid | No identity document of the subject is named (work tools, a hotel receipt, a job offer letter) |
| C012 | `U-N1` | valid | No identity document is named for anyone |
| **DS10** | **`M-E6`** ("facts showing lack of lawful status or documents" not stated) | **incorrect** | The narrative states the officer found an intent to work without authorization (tools, a 90-day receipt, an offer letter, a stated plan to work three months), and that he is not in possession of a valid immigrant visa |
| **C021-X1** | **`I-3`** (encounter date discrepancy) | **incorrect** | 4/12 and 4/14/2017 are bus-travel dates, not the encounter; the form's 04/16/2017 is not contradicted |
| G08 (gen-v1) | `I-1` (encounter near Detroit against MONROE, MI) | valid | Same verdict as rc-int-1, measure-74e15fb and measure-ffa7ecd |
| **G08 (gen-v1)** | **`I-2`** (passport presented against "no documents") | **incorrect** | A Mexican passport is not an immigration document allowing presence; no contradiction |

**Records:** `eval/adjudications.json` 119 → 124; claim-migration manual records 32 → 38. Every earlier record is
unchanged (prefix check).

**Not re-imported:** the adjudications made after measure-ffa7ecd, retry-check-1 and timeout-cmp-1 started on other
branches. This run starts from the fixed state, so DS08, C012 and G08 `I-1` were adjudicated again here, with the same
verdicts.

## 6. Routing and explanations (read against the source; changes against 74e15fb)
**Newly routed: DS07 and DS10** (dev expedited-removal cases).
- **What the model raised:** that a B1/B2 visitor visa "does not support" the 212(a)(7)(A)(i)(I) immigrant charge.
- **Why that is debatable at best:** the charge's basis (immigrant intent; DS10's officer finding of intended
  unauthorized work) is stated.
- **These are the 2 unnecessary dev routings.**
- **Correction to my earlier report:** in measure-ffa7ecd I described DS10's similar concern as "supported". On
  rereading the full narrative, that was too generous.

**Unsupported routing reasons:**
- **C021-X1:** "encounter date discrepancy" and related, repeating the incorrect `I-3`.
- **G08:** "Passport vs. no documents claim", repeating the incorrect `I-2`.
- **F036:** routed by "Potential impact on charge applicability", which names no fact.

**Other new reason wording** (for example in C001-M3, C012-X1, C045-X1, G03 and G05) restates supported findings or
planted conflicts.

**No longer routed:** F055.

## 7. gen-v1 (separate)
| Measure | Value |
|---|---|
| Detection | **6/7** (5/7 without G09's checklist credit); G06's ambiguity was routed only, as in 74e15fb |
| Incorrect flags | **1/9** after adjudication (G08 `I-2`); 2/9 before |
| Completion | 12/12 |
| Multi-charge routing | 1/1 |
| Ambiguity routing | 0/1 |
| Unnecessary routing | 1/6 |
| Latency p50 / p90 / max | 18.2 / 23.4 / 25.9 s |

## 8. Plain-terms summary
- **The final candidate matches 74e15fb's 42/54.** It recovers every label ffa7ecd lost to endpoint timeouts.
- **Recoveries:** they came from a healthier endpoint in this run, not from a rescued retry (0 direct rescues). The new
  grace rule was not needed.
- **Incorrect findings:** 2 (claim layer), both model claims the code let through, against 0 for 74e15fb. Three
  reviews remain partial because both fact-extraction requests stalled.
- **What this does not show:** whether these figures would hold under the slow-endpoint conditions of ffa7ecd's run,
  or on independent data. 90% is not reached.

**Not done:** tuning, fixes, reruns, scorer or label changes, failure exclusion, hosting, merge, push or presentation
changes.
