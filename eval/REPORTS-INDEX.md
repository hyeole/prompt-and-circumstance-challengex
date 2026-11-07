# Index of evaluation, deployment and audit records

Every record is kept where it was written. Files were not moved or renamed, so links in older documents still work. Start with [docs/EVALUATION-SUMMARY.md](../docs/EVALUATION-SUMMARY.md) for the reconciled headline figures.

## Current: what is deployed and how it was checked
| Record | What it is |
|---|---|
| [measure-d062b1d/REPORT.md](measure-d062b1d/REPORT.md) | Measurement of the deployed engine `d062b1d` on the 77-case benchmark and gen-v1 (copied from the local branch `experiment/measure-d062b1d`, commit `2ef1908`, not pushed; its scored run folders stay there) |
| [release-vercel-1/RECORD.md](release-vercel-1/RECORD.md), [release-vercel-2/RECORD.md](release-vercel-2/RECORD.md) | Release branch preparation and review |
| [vercel-setup-1/RECORD.md](vercel-setup-1/RECORD.md) | Vercel Hobby project setup ($0) |
| [preview-vercel-1/RECORD.md](preview-vercel-1/RECORD.md) | Preview deployment, hosted checks, two-browser isolation, the footer and Unlock fixes |
| [production-vercel-1/RECORD.md](production-vercel-1/RECORD.md) | Production deployment of `727e775`, public checks |
| [credential-audit-1/REPORT.md](credential-audit-1/REPORT.md) | Credential-security audit, independently reviewed |
| [demo-video-1/RECORD.md](demo-video-1/RECORD.md), [demo-video-2/RECORD.md](demo-video-2/RECORD.md) | The two live demonstration runs and videos. The videos themselves are kept outside Git |
| [hosting-free-1/](hosting-free-1/), [upstash-setup-1/](upstash-setup-1/), [ui-accept-1/](ui-accept-1/), [ui-mobile-1/](ui-mobile-1/) | Public-demo implementation, storage setup, UI acceptance and mobile layout checks |

## Planned evaluations, in order
| Record | Build | Status |
|---|---|---|
| [RUNS.md](RUNS.md) | all | Registry of every run with its code version. Its opening note predates fresh-v1; see the evaluation summary |
| [fresh/RESULT.md](fresh/RESULT.md) | `ab6feb6` | fresh-v1 untouched internal evaluation |
| [EVALUATION-e4dd17b.md](EVALUATION-e4dd17b.md) | `e4dd17b` | planned evaluation |
| [EVALUATION-4b10d72.md](EVALUATION-4b10d72.md) | `4b10d72` | checkpoint (74/77 completion) |
| [EVALUATION-closeout-7efb231.md](EVALUATION-closeout-7efb231.md) | `7efb231` | closeout (75/77 completion); superseded as the deployed engine by `d062b1d` |
| [EVALUATION-round2-1b5f59b.md](EVALUATION-round2-1b5f59b.md), [EVALUATION-round3-4cf02c3.md](EVALUATION-round3-4cf02c3.md) | `1b5f59b`, `4cf02c3` | candidates, not promoted |
| [VERIFY-PLAN-fa4457f.md](VERIFY-PLAN-fa4457f.md), [TARGETED-VERIFICATION-d95d075.md](TARGETED-VERIFICATION-d95d075.md) | | targeted verifications, not overall results |

## Diagnoses and fixes (development history)
- **Diagnoses:**
  - [MISSED-PLANTS-d0ec8c3.md](MISSED-PLANTS-d0ec8c3.md)
  - [MISS-CLASSIFICATION-4b10d72.md](MISS-CLASSIFICATION-4b10d72.md)
  - [ROUND2-DIAGNOSIS.md](ROUND2-DIAGNOSIS.md)
  - [ROUND2-prefix-test-results.txt](ROUND2-prefix-test-results.txt)
- **Defect fixes:**
  - [ROUND3-DEFECT-FIXES.md](ROUND3-DEFECT-FIXES.md)
  - [ROUND3-EVIDENCE-G06-G09.md](ROUND3-EVIDENCE-G06-G09.md)
  - [G06-G09-FIXES.md](G06-G09-FIXES.md)
- **Attribution and scope:**
  - [ATTRIBUTION-REVIEW-PACKET-4b10d72.md](ATTRIBUTION-REVIEW-PACKET-4b10d72.md)
  - [ATTRIBUTION-RESOLUTION-closeout.md](ATTRIBUTION-RESOLUTION-closeout.md)
  - [SCOPE-ATTRIBUTION-REPORT.md](SCOPE-ATTRIBUTION-REPORT.md)
  - [SCOPE-AND-EXPLANATIONS-REPORT.md](SCOPE-AND-EXPLANATIONS-REPORT.md)
  - [MULTIPERSON-DETECTION.md](MULTIPERSON-DETECTION.md)
- **Specific checks:**
  - [ENCOUNTER-TIME-REPORT.md](ENCOUNTER-TIME-REPORT.md)
  - [CROSSING-POLARITY-AND-COVERAGE.md](CROSSING-POLARITY-AND-COVERAGE.md)
  - [CITATION-STABILITY-CHECKPOINT.md](CITATION-STABILITY-CHECKPOINT.md)
  - [CONTRADICTION-COMPAT-1-REPORT.md](CONTRADICTION-COMPAT-1-REPORT.md)
  - [ROUTING-REASONS-AND-TIMEOUTS.md](ROUTING-REASONS-AND-TIMEOUTS.md)
- **Iteration reports:**
  - [ACCURACY-ITERATION-1-REPORT.md](ACCURACY-ITERATION-1-REPORT.md)
  - [DIAG-FIXES-1-REPORT.md](DIAG-FIXES-1-REPORT.md)
  - [DIAG2-FIXES-1-REPORT.md](DIAG2-FIXES-1-REPORT.md)
  - [DIAG2-FIXES-1-REVIEW-CORRECTIONS.md](DIAG2-FIXES-1-REVIEW-CORRECTIONS.md)
  - [INTEGRATION-1-DEVELOPMENT.md](INTEGRATION-1-DEVELOPMENT.md)
- **Robustness and timing:** [chronology-1/](chronology-1/), [robustness-1/](robustness-1/), [retry-reachable-1/](retry-reachable-1/), [grace-complete-1/](grace-complete-1/), [diag-1/](diag-1/), [diag-2/](diag-2/), [ex-1/](ex-1/)

## Labels, test sets and scoring
- [README.md](README.md): test set, splits and matching policy
- [LABEL-REVIEW-2026-10-30.md](LABEL-REVIEW-2026-10-30.md), [VARIANT-FIXES.md](VARIANT-FIXES.md), [adjudications.json](adjudications.json), [migrations/](migrations/)
- **Datasets:** [cases/](cases/) and [expected/](expected/) (legacy), [fresh/](fresh/), [dev-synthetic/](dev-synthetic/), [gen-v1/](gen-v1/); [variants.json](variants.json)
- **Run outputs:** [runs/](runs/) (scored reports; raw model outputs are not committed); [archive/](archive/)

## Not on this branch (local branches, not pushed)
- **Unmerged round-4 work, from before the deployed engine:** the rc-full-1 full run (`eval/EVALUATION-full-rc-full-1.md`), the detection investigation and the hedge experiment. They are on the local branch `improve/round4-detection` and not deployed.
- **Round-5 and round-6 local branches (also from before the deployed engine):** `improve/round5-visa-chronology` and `improve/round6-person-event` hold bounded checks and a prototype, not evaluations.
- **Demo videos and voice recordings:** kept outside Git.
