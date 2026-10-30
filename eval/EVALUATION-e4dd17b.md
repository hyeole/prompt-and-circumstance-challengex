# Planned evaluation: production build of `e4dd17b`

- **Runs:** dev-synthetic `2026-10-30T06-37-21`, fresh-v1 `2026-10-30T06-40-08`, legacy `2026-10-30T06-49-35`. HEAD was held at `e4dd17b` for the whole batch, so every run recorded the build it tested.
- **Status:** all post-tuning. fresh-v1's only untouched result remains `2026-10-30T02-48-46` (71% recall, 30% incorrect, v2.2).
- **Scoring:** policy v2.3, unchanged. Every flag was adjudicated by hand in two layers:
  - **Default layer:** the original adjudication records, keyed by base case and evidence. This is the layer used for every historical score.
  - **Claim-aware layer** (`--adjudication-claims`, `eval/migrations/2026-10-30-adjudication-claims.json`): a verdict is inherited only for an identical claim (kind, ordered values, direction, negation, subject and event). Differing claims, and variants whose text changes the fact a verdict rests on, are adjudicated manually. Its results are in the `*-v2.3-claims` files.
- **Before this evaluation:** 156 unit tests passed, production e2e passed 23/23, and the targeted live checks were run.

## Same-policy comparison across builds (default layer)

Incorrect = false + unadjudicated, over issued flags excluding duplicates.

| Dataset | Evaluated build | Run (recorded HEAD) | Change | Completion | Strict recall | Incorrect flags | False flags | Unnecessary routing |
|---|---|---|---|---|---|---|---|---|
| dev-synthetic | `e5a47a7` | 2026-10-30T03-03-23 (`e5a47a7`) | post-tuning, before audit | 100% (12/12) | 100% (6/6) | 20% (2/10) | 2 | 20% (2/10) |
| dev-synthetic | `324c393` | 2026-10-30T03-48-20 (`324c393`) | audit items 1-8 | 100% (12/12) | 100% (6/6) | 0% (0/9) | 0 | 40% (4/10) |
| dev-synthetic | `8864d7b` | 2026-10-30T04-35-38 (`8864d7b`) | diagnosis fixes | 100% (12/12) | 100% (6/6) | 9% (1/11) | 1 | 0% (0/10) |
| dev-synthetic | `d0ec8c3` | 2026-10-30T05-12-29 (`d0ec8c3`) | refinements | 100% (12/12) | 100% (6/6) | 0% (0/11) | 0 | 0% (0/10) |
| dev-synthetic | `e4dd17b` | 2026-10-30T06-37-21 (`e4dd17b`) | fixes 1-6, accounts as routing | 100% (12/12) | 100% (6/6) | 0% (0/10) | 0 | 0% (0/10) |
| fresh-v1 | `e5a47a7` | 2026-10-30T03-05-54 (`e5a47a7`) | post-tuning, before audit | 82% (23/28) | 71% (12/17) | 18% (5/28) | 5 | 28% (5/18) |
| fresh-v1 | `324c393` | 2026-10-30T03-52-17 (`324c393`) | audit items 1-8 | 89% (25/28) | 47% (8/17) | 21% (4/19) | 4 | 61% (11/18) |
| fresh-v1 | `8864d7b` | 2026-10-30T04-38-25 (`0fd47be`) | diagnosis fixes | 96% (27/28) | 71% (12/17) | 4% (1/27) | 1 | 22% (4/18) |
| fresh-v1 | `d0ec8c3` | 2026-10-30T05-15-26 (`d0ec8c3`) | refinements | 96% (27/28) | 53% (9/17) | 0% (0/24) | 0 | 17% (3/18) |
| fresh-v1 | `e4dd17b` | 2026-10-30T06-40-08 (`e4dd17b`) | fixes 1-6, accounts as routing | 96% (27/28) | 53% (9/17) | 0% (0/25) | 0 | 22% (4/18) |
| legacy | `e5a47a7` | 2026-10-30T03-16-09 (`e5a47a7`) | post-tuning, before audit | 92% (34/37) | 87% (27/31) | 27% (17/62) | 17 | 0% (0/15) |
| legacy | `324c393` | 2026-10-30T04-06-35 (`324c393`) | audit items 1-8 | 86% (32/37) | 68% (21/31) | 19% (11/57) | 11 | 33% (5/15) |
| legacy | `8864d7b` | 2026-10-30T04-48-10 (`0fd47be`) | diagnosis fixes | 97% (36/37) | 65% (20/31) | 6% (4/63) | 4 | 7% (1/15) |
| legacy | `d0ec8c3` | 2026-10-30T05-26-47 (`d0ec8c3`) | refinements (original) | 81% (30/37) | 68% (21/31) | 6% (4/63) | 4 | 7% (1/15) |
| legacy | `d0ec8c3` | 2026-10-30T05-52-49 (`4c32391`) | refinements (repeat) | 100% (37/37) | 68% (21/31) | 7% (4/61) | 4 | 7% (1/15) |
| legacy | `e4dd17b` | 2026-10-30T06-49-35 (`e4dd17b`) | fixes 1-6, accounts as routing | 97% (36/37) | 71% (22/31) | 5% (3/62) | 3 | 7% (1/15) |

## e4dd17b in both adjudication layers

| Dataset | Completion | Strict recall | Incorrect (default layer) | Incorrect (claim layer) | Unnecessary routing | Should-not-flag violations |
|---|---|---|---|---|---|---|
| dev-synthetic | 100% (12/12) | 100% (6/6) | 0/10 | 0/10 | 0% (0/10) | 0 |
| fresh-v1 | 96% (27/28) | 53% (9/17) | 0/25 | 0/25 | 22% (4/18) | 0 |
| legacy | 97% (36/37) | 71% (22/31) | 3/62 | 1/62 | 7% (1/15) | 0 |

The two layers differ on legacy because of an **adjudication error**:
- The 03-16-09 run's verdict "U-N5 false flag: the facts meeting the ground are stated elsewhere" was right for the base narratives (C003, C037). It was applied to the M3 variants, which had *removed* those facts.
- The claim layer corrects C003-M3 and C037-M3 with case-specific manual records.
- The default layer keeps the original records unchanged.
- `scripts/diag-cross-case-inheritance.ts` lists every verdict inherited across variants whose text differs. In this evaluation that was 26, all checked by hand: 24 hold (the variant's change does not touch the fact the claim rests on) and 2 were the error above.

## Flags by category, e4dd17b (default layer)

Identity-document (N1) observations are shown separately so they cannot hide other weaknesses.

| Dataset | N1 | Missing elements | Unclear | Inconsistency | Citation | Human-review | All except N1 |
|---|---|---|---|---|---|---|---|
| dev-synthetic | 0/3 false | 0/4 | 0/1 | 0/1 | 0/1 | n/a | 0/7 |
| fresh-v1 | 0/7 false | 0/11 | 0/4 | n/a | 0/2 | 0/1 | 0/18 |
| legacy | 0/20 false | 0/15 | 2/2 false (the U-N5 error; 0/2 in the claim layer) | 1/14 false (C021-X1, history vs B2 admission) | 0/6 | 0/5 | 3/42 (claim layer 1/42) |

## What each fix did in this run
1. **Qualified consistency.** Every planted entry conflict that is routed for attribution now shows the citation as "needs human review" instead of "consistent": F010-X, F039-X, F055-A, F075-X, C001-X1, C003-AMB, C012-X1, C045-X1, C119-AMB. History accounts do not qualify an entry-without-inspection charge (F075-H keeps "consistent", by design).
2. **Accounts as routing items, not findings.** Shown in the review panel, the report and the audit export, grouped by fact.
   - No finding cites an unattributable statement, so the pre-labelled DS06 and FS10 controls have no violation.
   - The planted conflicts in multi-person narratives stay "routed only" or "missed". That is intended: recall is not inflated by routing.
3. **Place of entry.** C012-M2 (place removed) is now detected; it had been missed in every earlier run.
4. **Support wording.** No "mismatch" whose explanation claims support was issued without verified evidence in this run.
5. **Claim-aware adjudication.** See above. It found and corrected the U-N5 error.
6. **Prior encounters.** F039's prior Border Patrol arrest and voluntary returns against a NEGATIVE record are a clarity item, kept distinct from removals. F075-H's unattributed prior arrests are routed as an account.

## Remaining missed plants (e4dd17b)
- **fresh, 8:** F010-X, F039-X, F055-A (×2), F075-H and F075-X are routed for attribution, with the planted sentence named; F051-C is routed correctly (group member's removal); F055-H's review was partial (fact call timed out).
- **legacy, 9:** C001-X1, C003-AMB (×2), C012-X1, C013-X1, C045-X1 and C119-AMB (×2) are routed for attribution with the planted sentence named; C119-CIT is routed correctly (the record says "POSITIVE - See Narrative").
- **No missed plant is a model miss** in this run.

## New routing costs
- **F055 (fresh base):** a model claim about a documentation gap (the narrative gives a date and place; the form says "unknown") was withheld for attribution, and its account was routed. That routing is unnecessary.
  - **Proposed:** route a model-derived account only when the form value is known.
- **C021 (legacy base):** the second traveller's entry date is routed as an account. It is a genuine attribution question, but there is no planted reason, so it counts as unnecessary routing.

## Item 7: fact-call duration vs output length (measured; no setting changed)
| Dataset | Fact calls | Not completed | Completed p50 | Output p50 (characters) | Correlation of duration and output length |
|---|---|---|---|---|---|
| dev-synthetic | 12 | 0 | 11.0 s | 733 | 0.81 |
| fresh-v1 | 28 | 1 | 16.8 s | 1,194 | 0.81 |
| legacy | 37 | 1 | 15.9 s | 997 | 0.66 |

- Fact-call duration rises with output length. Long outputs are the likely mechanism for the timeouts, but timed-out calls return no length, so this is inferred, not observed.
- **Proposed next step:** cap the output (fewer statements, shorter quotes), measured on a fixed case set, before considering any timeout change.

## Limitations
- **Attribution is the dominant limit.** Most adapted source records describe several people with redacted names. The system now routes those conflicts to a person and does not decide.
- **The claim function is conservative:** any rewording needs manual adjudication. That is intended.
- **Detection is pattern-based** for place of entry, prior encounters and support wording. Unusual wording falls back to the model, which is cross-checked.
