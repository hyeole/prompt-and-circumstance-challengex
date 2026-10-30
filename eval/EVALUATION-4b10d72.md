# Planned evaluation of the final build: production build of `4b10d72`

- **Runs:** dev-synthetic `2026-10-30T07-18-04`, fresh-v1 `2026-10-30T07-21-02`, legacy `2026-10-30T07-32-13`. HEAD was held at `4b10d72` for the whole batch.
- **Status:** all post-tuning. fresh-v1's only untouched result remains `2026-10-30T02-48-46`.
- **Before the run:** 162 unit tests passed; the production build had no key in its client bundle; the production e2e passed 23/23; targeted live checks were run.
- **Scoring:** policy v2.3, unchanged. Every flag was adjudicated by hand in both layers:
  - **default:** the original records, used for all historical scores;
  - **claim-aware:** `--adjudication-claims`, with the migration file `eval/migrations/2026-10-30-adjudication-claims.json`.

## Same-policy comparison across builds (default layer)

| Dataset | Evaluated build | Run (recorded HEAD) | Change | Completion | Strict recall | Incorrect flags | False flags | Unnecessary routing |
|---|---|---|---|---|---|---|---|---|
| dev-synthetic | `e5a47a7` | 2026-10-30T03-03-23 (`e5a47a7`) | post-tuning, before audit | 100% (12/12) | 100% (6/6) | 20% (2/10) | 2 | 20% (2/10) |
| dev-synthetic | `324c393` | 2026-10-30T03-48-20 (`324c393`) | audit items 1-8 | 100% (12/12) | 100% (6/6) | 0% (0/9) | 0 | 40% (4/10) |
| dev-synthetic | `8864d7b` | 2026-10-30T04-35-38 (`8864d7b`) | diagnosis fixes | 100% (12/12) | 100% (6/6) | 9% (1/11) | 1 | 0% (0/10) |
| dev-synthetic | `d0ec8c3` | 2026-10-30T05-12-29 (`d0ec8c3`) | refinements | 100% (12/12) | 100% (6/6) | 0% (0/11) | 0 | 0% (0/10) |
| dev-synthetic | `e4dd17b` | 2026-10-30T06-37-21 (`e4dd17b`) | fixes 1-6, accounts as routing | 100% (12/12) | 100% (6/6) | 0% (0/10) | 0 | 0% (0/10) |
| dev-synthetic | `4b10d72` | 2026-10-30T07-18-04 (`4b10d72`) | final: fix-4 scope, citation precedence | 100% (12/12) | 100% (6/6) | 0% (0/11) | 0 | 0% (0/10) |
| fresh-v1 | `e5a47a7` | 2026-10-30T03-05-54 (`e5a47a7`) | post-tuning, before audit | 82% (23/28) | 71% (12/17) | 18% (5/28) | 5 | 28% (5/18) |
| fresh-v1 | `324c393` | 2026-10-30T03-52-17 (`324c393`) | audit items 1-8 | 89% (25/28) | 47% (8/17) | 21% (4/19) | 4 | 61% (11/18) |
| fresh-v1 | `8864d7b` | 2026-10-30T04-38-25 (`0fd47be`) | diagnosis fixes | 96% (27/28) | 71% (12/17) | 4% (1/27) | 1 | 22% (4/18) |
| fresh-v1 | `d0ec8c3` | 2026-10-30T05-15-26 (`d0ec8c3`) | refinements | 96% (27/28) | 53% (9/17) | 0% (0/24) | 0 | 17% (3/18) |
| fresh-v1 | `e4dd17b` | 2026-10-30T06-40-08 (`e4dd17b`) | fixes 1-6, accounts as routing | 96% (27/28) | 53% (9/17) | 0% (0/25) | 0 | 22% (4/18) |
| fresh-v1 | `4b10d72` | 2026-10-30T07-21-02 (`4b10d72`) | final: fix-4 scope, citation precedence | 96% (27/28) | 53% (9/17) | 0% (0/26) | 0 | 22% (4/18) |
| legacy | `e5a47a7` | 2026-10-30T03-16-09 (`e5a47a7`) | post-tuning, before audit | 92% (34/37) | 87% (27/31) | 27% (17/62) | 17 | 0% (0/15) |
| legacy | `324c393` | 2026-10-30T04-06-35 (`324c393`) | audit items 1-8 | 86% (32/37) | 68% (21/31) | 19% (11/57) | 11 | 33% (5/15) |
| legacy | `8864d7b` | 2026-10-30T04-48-10 (`0fd47be`) | diagnosis fixes | 97% (36/37) | 65% (20/31) | 6% (4/63) | 4 | 7% (1/15) |
| legacy | `d0ec8c3` | 2026-10-30T05-26-47 (`d0ec8c3`) | refinements (original) | 81% (30/37) | 68% (21/31) | 6% (4/63) | 4 | 7% (1/15) |
| legacy | `d0ec8c3` | 2026-10-30T05-52-49 (`4c32391`) | refinements (repeat) | 100% (37/37) | 68% (21/31) | 7% (4/61) | 4 | 7% (1/15) |
| legacy | `e4dd17b` | 2026-10-30T06-49-35 (`e4dd17b`) | fixes 1-6, accounts as routing | 97% (36/37) | 71% (22/31) | 5% (3/62) | 3 | 7% (1/15) |
| legacy | `4b10d72` | 2026-10-30T07-32-13 (`4b10d72`) | final: fix-4 scope, citation precedence | 95% (35/37) | 68% (21/31) | 6% (4/63) | 4 | 7% (1/15) |

## Final build in both adjudication layers

| Dataset | Completion | Strict recall | Incorrect (default) | Incorrect (claim layer) | Incorrect except identity documents (default / claim) | Unnecessary routing | Should-not-flag |
|---|---|---|---|---|---|---|---|
| dev-synthetic | 100% (12/12) | 100% (6/6) | 0/11 | 0/11 | 0/8 / 0/8 | 0% (0/10) | 0 |
| fresh-v1 | 96% (27/28) | 53% (9/17) | 0/26 | 0/26 | 0/19 / 0/19 | 22% (4/18) | 0 |
| legacy | 95% (35/37) | 68% (21/31) | 4/63 | 2/63 | 4/44 / 2/44 | 7% (1/15) | 0 |

**Legacy false flags.**
- **Claim layer, 2:**
  - C012-M2 I-2: the model read the Trooper's request time (2000) as the encounter time.
  - C021-X1 I-3: NEGATIVE vs a lawful B2 admission.
- **Default layer, 2 more:** C003-M3 and C037-M3 U-N5. These are the earlier adjudication error, corrected only in the claim layer.

**By category (legacy, claim layer):**

| Identity documents | Citation | Human-review routing | Inconsistency | Missing elements | Unclear |
|---|---|---|---|---|---|
| 0/19 | 0/7 | 0/5 | 2/15 | 0/14 | 0/3 |

## Changes from e4dd17b to 4b10d72
- **Fix 4 narrowed:** support wording must name the charge or this charge's requirement.
- **Citation precedence:** on an equal "mismatch" verdict, verified rule evidence replaces unverifiable model evidence.
- **Negated admission:** a statement such as "was never admitted" is not counted as an admission.
- **Plant outcomes:** only two differ from e4dd17b, and neither because of these changes.
  - C021-X1: its fact call timed out, so the review is partial.
  - F055-H: the review completed this time, but its clarity finding cannot be credited under v2.3 (no anchor).

## Remaining missed plants (final build)
- **fresh, 8:**
  - routed for attribution with the planted sentence named: F010-X, F039-X, F055-A ×2, F075-H, F075-X;
  - F051-C: routed correctly (group member's removal);
  - F055-H: a clarity item, not creditable.
- **legacy, 10:**
  - routed for attribution with the planted sentence named: C001-X1, C003-AMB ×2, C012-X1, C013-X1, C045-X1, C119-AMB ×2;
  - C021-X1: partial review (fact-call timeout);
  - C119-CIT: routed correctly (the record says "POSITIVE - See Narrative").
- No missed plant is a model miss of a fact the system could attribute.

## Claim-aware layer in this run
- **Manual, claim-specific decisions, 2:**
  - DS08 U-N1: the default layer had inherited the verdict of DS08's *N2* finding (same sentence, different claim).
  - C013-X1 C-1: a mis-categorised description of the planted conflict.
- **Cross-case inheritance:** 28 verdicts were inherited across variants whose text differs, all checked. 26 hold. The other 2 are the earlier U-N5 error, already corrected in the claim layer.

## Item 7: fact-call duration vs output length (no setting changed)
| Dataset | Fact calls | Not completed | p50 | Output p50 (characters) | Correlation |
|---|---|---|---|---|---|
| dev-synthetic | 12 | 0 | 14.7 s | 732 | 0.78 |
| fresh-v1 | 28 | 1 | 19.3 s | 1,739 | 0.69 |
| legacy | 37 | 2 | 18.1 s | 987 | 0.62 |

## Known limitations found in this run (not fixed; candidates for the next change)
1. **Fix-4 negation scope.** "The form indicates **no** prior removal" counts as negating the narrative's support, so a self-contradicting C013-X1 "mismatch" was not marked unresolved. Negation should be scoped to the clause about the narrative.
2. **Model time claims.** The Trooper's request time is still read as the encounter time (C012-M2). The time rule excludes call and request times, but model inconsistency claims are not checked against that exclusion.
3. **Model-derived accounts for documentation gaps** (F055 base) are routed unnecessarily. Route a model account only when the form value is known.
4. **Fact-call timeouts** still cause partial reviews (1–2 per dataset). The measured relationship with output length suggests capping the output; this needs a fixed-case measurement first.
5. **Attribution** in multi-person narratives remains the main limit on recall. By design, such conflicts are routed with the statement named, not counted as detection.
