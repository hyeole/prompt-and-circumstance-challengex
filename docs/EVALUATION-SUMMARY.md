# Evaluation summary: reconciled figures (2026-11-07)

**Purpose:** one place that explains every headline number, which run it comes from, and why documents disagree. No evaluation was rerun to write this. All figures are copied from the run reports linked below.

**What these numbers are:** internal results on team-created test cases. They are **not** a sponsor evaluation.

## 1. Units
| Unit | Meaning | Count in the 77-case benchmark |
|---|---|---|
| **Narrative** | One distinct narrative text | **56**: 15 adapted public CBP records, 20 synthetic variants with edited text, 21 fully synthetic (two dev cases, DS03 and DS12, share one) |
| **Case** | A narrative plus its form facts and officer-selected charge | **77**: 15 source records, 40 synthetic variants, 22 fully synthetic. 20 of the variants reuse their source record's narrative unchanged and change only the facts, charge or citation |
| **Planted error** | One labelled defect the review should catch | **54**, in 50 cases (46 with one, 4 with two). 44 in synthetic variants, 10 in fully synthetic cases, 0 in source records |
| **Review run** | One review of one case | **77** per evaluation: every case once, no retries of whole reviews. Model calls inside a review may retry once |

**Datasets** inside the 77: dev-synthetic 12 cases (6 planted errors), fresh-v1 28 (17), legacy 37 (31).
A separate 12-case set, **gen-v1**, is always reported on its own.

The 27 cases with no planted error count only toward incorrect flags. Narrative and case counts were taken from the case files and the closeout run's raw results. measure-d062b1d used the same 77 locked cases (its `LOCK.json`).

## 2. Headline: the deployed engine
The engine on https://project-7kvs7.vercel.app is commit `d062b1d` (in the deployed release `727e775`). It was measured once: [eval/measure-d062b1d/REPORT.md](../eval/measure-d062b1d/REPORT.md) (freeze `dd41249`, results `2ef1908`, on the local branch `experiment/measure-d062b1d`, not pushed). The report, plan, lock file and summaries are copied into this branch; the scored run folders, baselines and patches it mentions stay on that local branch.

**Status:** post-tuning, on a reused development benchmark. Not held-out.

| Measure | Result |
|---|---|
| Strict detection | **41/54 (75.9%)** excluding the C045-X1 clarification-only credit. The report's "strict detection" is 42/54 (77.8%) with that credit; the credit is a judgement call, so the lower figure is the headline here |
| Incorrect flags | **2/94** in the claim-aware layer (DS10 `M-E6`, C021-X1 `I-3`); **4/94** in the key-only layer (the same two plus two long-standing key-layer records) |
| Completion | **74/77**: C013, C021-X1 and C037-CIT were partial because both fact-extraction requests timed out |
| Routing | multi-charge 6/6; planted ambiguity 3/4; unnecessary routing 7/43 |
| By plant type | missing element 16/16, inconsistency 8/17, citation 9/11, multi-charge 6/6, ambiguity 3/4 |
| gen-v1 (separate) | detection 6/7 (5/7 without G09's checklist credit); incorrect flags 1/9; completion 12/12 |
| Latency | p50 17.0 s, p90 29.6 s, max 55.0 s; no review over 60 s |

## 3. The only untouched results (earlier builds)
| Set | Run | Build | Detection | Incorrect flags | Report |
|---|---|---|---|---|---|
| Legacy set, 21-case held-out split (dataset v1): 18 planted errors | `2026-10-29T22-28-28` | `ae55a38` | 15/18 (83%) | 5/18 (28%) | `eval/runs/2026-10-29T22-28-28/` |
| fresh-v1: 28 cases, 17 planted errors | `2026-10-30T02-48-46` | `ab6feb6` (tag `fresh-eval-v1-frozen`) | 12/17 (71%) | 11/37 (30%) | [eval/fresh/RESULT.md](../eval/fresh/RESULT.md) |

Each was run once, before any tuning on that set. Every later run on these cases is post-tuning.

**Corrections to older wording:**
- **"Only one untouched held-out result":** `eval/RUNS.md` opens with this, which was written before fresh-v1 existed. There are two untouched results, on different case sets.
- **Two denominators in the legacy held-out run:** it reports incorrect flags both as 5/18 (all issued flags including base cases, from `summary.json`) and as 4/17 (variants only, "conservative", in `REPORT-official-heldout.md`). The README uses 5/18.

## 4. Why "74/77" and "75/77" both appear
They are **different runs of different builds**. Neither is a recount of the other.

| Run | Build | Completion | Detection | Incorrect flags (claim layer) | Report |
|---|---|---|---|---|---|
| Checkpoint | `4b10d72` | 74/77 | 36/54 | 2/100 (5/101 in the key-only layer, scoring policy v2.4) | `eval/EVALUATION-4b10d72.md` |
| **Closeout** (tag `rc-closeout`) | `7efb231` | **75/77** | 42/54 | 2/100 | `eval/EVALUATION-closeout-7efb231.md` |
| Round 2 candidate, not promoted | `1b5f59b` | 73/77 | 41/54 | | `eval/RUNS.md` |
| Round 3 candidate, not promoted | `4cf02c3` | 67/77 | 41/54 | | `eval/RUNS.md` |
| `74e15fb` | `74e15fb` | 74/77 | 42/54 | 0/91 | measure-d062b1d report, table 1 |
| **Deployed engine** | `d062b1d` | **74/77** | 42/54 (41 strictly) | 2/94 | `eval/measure-d062b1d/REPORT.md` |

- **The earlier README** quoted the closeout (`7efb231`): 75/77, 42/54, 2/100.
- **The current README** quotes the deployed engine (`d062b1d`): 74/77, 41/54 (42 with the credit), 2/94.
- **Why denominators differ:** incorrect-flag denominators vary because each run issues a different number of flags.

## 5. Live demonstrations (not benchmarks)
| Record | Case | Result |
|---|---|---|
| [eval/demo-video-1/RECORD.md](../eval/demo-video-1/RECORD.md) | `U-98df8507cc22` | Complete in 14.8 s. 1 of 3 planted errors caught (missing manner of entry); date and citizenship conflicts missed |
| [eval/demo-video-2/RECORD.md](../eval/demo-video-2/RECORD.md) | `U-faffb1cb41ac` | Complete in 20.6 s. 3 of 3 planted errors caught: entry-place conflict and missing entry date (model), charge mismatch (rule-based) |

Each was a single run on a synthetic case. They are not accuracy measurements.

## 6. Figures not used as headlines
- **"90% (28/31)" legacy recall from run `2026-10-30T03-16-09`:** post-tuning, on an earlier scoring policy.
- **Per-dataset figures quoted alone:** they hide the other datasets.
- **The 44/54 of `ed42763`** (rc-int-1, historical): superseded. Rescored with the later code on the same saved data, it reads 42/54 (41/54 without the credit) (`eval/ACCURACY-ITERATION-1-REPORT.md`). That engine was never deployed. Any earlier deck or speaker note quoting 44/54 is out of date.
- **rc-full-1, 43/54, 71/77, 2/104:**
  - an **earlier** candidate: its server code `2f54880` (2026-10-30) is an ancestor of the deployed engine `d062b1d`, 30 commits earlier;
  - its run records are on the local branch `improve/round4-detection` (`eval/EVALUATION-full-rc-full-1.md`);
  - not the deployed engine.
