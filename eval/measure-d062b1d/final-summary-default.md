| Dataset | Completion | Strict detection | Incorrect flags | False | Duplicates | Unadjudicated | Unnecessary routing | Should-not-flag violations | Latency p50 / p90 / max |
|---|---|---|---|---|---|---|---|---|---|
| eval/dev-synthetic | 100% (12/12) | 100% (6/6) | 9% (1/11) | 1 | 0 | 0 | 20% (2/10) | 0 | 12.4s / 17.7s / 23.9s |
| eval/fresh | 100% (28/28) | 65% (11/17) | 0% (0/27) | 0 | 0 | 0 | 17% (3/18) | 0 | 18.0s / 29.6s / 36.6s |
| eval | 92% (34/37) | 81% (25/31) | 5% (3/56) | 3 | 0 | 0 | 20% (3/15) | 0 | 17.7s / 54.4s / 55.1s |

**Pooled:** strict detection 78% (42/54); incorrect flags 4% (4/94); completion 96% (74/77).

**Detection by plant type (pooled):**

| Plant type | Detected |
|---|---|
| missing_element | 100% (16/16) |
| inconsistency | 47% (8/17) |
| citation | 82% (9/11) |
| human_review:multi_charge | 100% (6/6) |
| human_review:ambiguity | 75% (3/4) |

**Flags by finding category (pooled, excluding duplicates):**

| Category | Flags | Incorrect | Valid observations | Planted |
|---|---|---|---|---|
| citation | 9 | 0 | 0 | 9 |
| human_review | 6 | 0 | 0 | 6 |
| identity documents | 30 | 0 | 30 | 0 |
| inconsistency | 9 | 1 | 1 | 7 |
| missing_element | 31 | 1 | 15 | 15 |
| unclear | 9 | 2 | 5 | 2 |

**Incorrect flags excluding identity-document observations:** 6% (4/64).

**Missed or not-detected plants:**

| Case | Plant | Outcome | Completed |
|---|---|---|---|
| F010-X | inconsistency | missed | true |
| F039-X | inconsistency | missed | true |
| F051-C | citation | routed_only | true |
| F055-H | inconsistency | missed | true |
| F075-H | inconsistency | missed | true |
| F075-X | inconsistency | missed | true |
| C001-X1 | inconsistency | missed | true |
| C013-X1 | inconsistency | missed | true |
| C119-AMB | human_review:ambiguity | routed_only | true |
| C119-AMB | inconsistency | missed | true |
| C119-CIT | citation | routed_only | true |
| C119-X1 | inconsistency | missed | true |

**Incorrect flags:**

- DS10 M-E6 missing_element: Missing: basis for the immigration violation [false_flag]: measure-d062b1d: the narrative states the facts: the officer found work tools, a 90-day hotel receipt and an employment offer letter, the subject said he intended to work three months, the officer fou
- C003-M3 U-N5 unclear: Unclear: specific ground stated and explained [false_flag]: The precise section is cited and the narrative states the facts that meet it elsewhere (illegal crossing / visa overstay); requiring the explanation in the same sentence is too strict.
- C021-X1 I-3 inconsistency: Encounter date discrepancy [false_flag]: measure-d062b1d: 4/12/2017 and 4/14/2017 are bus-travel dates in the TRAVEL DATA section, not the encounter; nothing in the narrative contradicts the form's encounter date 04/16/2017.
- C037-M3 U-N5 unclear: Unclear: specific ground stated and explained [false_flag]: The precise section is cited and the narrative states the facts that meet it elsewhere (illegal crossing / visa overstay); requiring the explanation in the same sentence is too strict.
