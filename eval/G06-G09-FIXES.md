# G06 and G09: offline fixes on `4e76a9d`

**Status:** an uncommitted change.
- Offline only: no model calls, not evaluated, not promoted, not pushed.
- Unchanged: the baseline (`7efb231`/`49a12be`), the round-3 records, labels, raw results, scores, adjudications, prompts and scoring.

## 1. G06: a shared route does not identify a person
**Rule before.** `linkedToSubject` treated an unattributed statement in a multi-person narrative as the subject's when two facts other than the disputed one matched the form, and no other account shared them. Any two facts counted: the entry month and day, the place, or the manner.

**Problem.** The place and the manner describe a route, and people who crossed together share them. In G06, S8 matched the form only on "near Hidalgo" and "EWI". That was enough to produce `F-ENTRY-DATE`, asserting a conflict for the subject.

**Change** (`lib/review/facts.ts`, `linkedToSubject`). The link now also requires the form's entry month and day, a fact specific to one entry. Without it the statement stays an unattributed account, which is a specific human-review routing item naming the sentence.

**Attribution routes that are unchanged:**
- the subject named in the clause;
- a one-person narrative;
- pronoun continuity from a sentence naming the subject;
- the exact-entry link (full date and manner);
- the existing two-fact link when the month and day are among the matched facts. This covers C119-X1: month and day 08/11 plus manner AIR.

## 2. G09: a populated "UNK" field is not an established fact
**Checklist semantics** (unchanged in general).
- A form field recorded as unknown is *documented but not established*, so the narrative is still checked.
- A narrative that itself says the fact is unknown also leaves it documented-unknown.
- These remain `present` with qualifier `recorded_unknown`, a note and no finding. That applies, for example, to unknown entry dates and places, which are common and acceptable.

**Problem.** For the manner of entry, the same factual situation, with the manner known nowhere, was handled two ways:
- **blank field:** `absent` (`M-E3`);
- **field "UNK":** `present`/`recorded_unknown`, with no item at all (G09).

Yet the manner is the fact the charge depends on; the charge-support check already routed G09 for that reason.

**Change** (`lib/review/review.ts`, element merge). The element becomes **`unclear`**, which produces a `U-E3` item for a person, only when all of these hold:
- the element is **E3**;
- the form records it only as unknown;
- the model review ran, so the narrative was checked;
- the model did not cite a sentence stating the manner;
- fact extraction found no verified manner statement.

It is not `absent`, because the officer did record it as unknown.

**Not changed:**
- other elements recorded as unknown;
- a narrative that says the manner is unknown (documented in both);
- a known form value;
- a blank field (still `absent`);
- a review where the model did not run (the narrative was not checked, so the field result stands).

## Validation (offline)
| Check | Result |
|---|---|
| `scripts/repro-g06-g09.ts` (14 checks: 4 defect, 10 controls) | `4e76a9d`: **4 not as expected**, all 10 controls as expected. After the change: **0** |
| `tests/g06-g09.test.ts` | `4e76a9d`: 2 defect tests fail and 2 control tests pass. After the change: 4/4 |
| Earlier reproductions | round-3, multi-person and variants: 0 each; round-2 output identical |
| Full offline suite | 267/267 |
| Type-check, production build | Pass. The `rc-round3` build on disk was moved aside and restored (BUILD_ID `bR0Yw-Tb3C-sVXJ3E6kHn` unchanged). Build warnings are the existing file-tracing ones |
| Deterministic 89-case replay and multi-person flags | Identical to `4e76a9d` |
| Historical rescoring (11 saved runs, both layers) | 22/22 identical |

## Every behaviour change, from the saved outputs
The saved model outputs of all eleven runs (baseline, `1b5f59b`, round 3) were checked against both rules:
- **G06 rule:** one saved finding depended on a place-and-manner link, G06 in the round-3 run. It would now be routed. C119-X1's link, in three runs, matched on the month and day and is unchanged.
- **E3 rule:** G09 is the only case among the 89 whose form records the manner only as unknown. Its saved E3 result (`1b5f59b` and round 3) would now be `unclear`, with a `U-E3` item. The one exception would be if that run's extraction had found a manner statement; extracted facts are not stored, but G09's only entry sentence ("came to the United States several years ago") states no manner.
- **No other case** among the 77 or the 12 changes under either rule.

## Scoring consequences (v2.4 unchanged; reported, not acted on)
- **G06:** the questionable credit is removed. The account is routed with S8 named. Routing is **not** detection, so G06 counts as not detected under v2.4.
- **G09:** a `U-E3` item would match its missing-element plant, because v2.4 credits an `unclear` finding that references the element. That credit would follow from the semantics change, which was made for consistency. It should be reported separately from other detections in any future measurement.
- **Net effect on the gen-v1 figure, if the saved round-3 outputs were rescored with these rules:** still 6/7, but with a different composition (G06 lost, G09 gained). This is a projection from saved outputs, not a measurement. No rescoring of historical results has been done or recorded.

## G06 scoring limitation (scorer unchanged)
Under v2.4, an ambiguity plant counts as detected when a human-review finding cites the anchor and uses conflict wording about the entry (`aboutAmbiguity`).
- **No attribution check:** the scorer does not check whether the finding asserts an attribution the label says should not be asserted. Such a finding is classified as planted, so it never reaches adjudication or the incorrect-flag count.
- **Effect of this change:** in G06 the code no longer makes that assertion, but the scorer limitation itself remains.
- **No credit for routing:** a correctly routed ambiguity (the expected behaviour for G06) earns no detection credit, because routing is not counted.

This is documented here and in `ROUND3-EVIDENCE-G06-G09.md`; the scorer is not changed.
