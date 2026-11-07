# measure-d062b1d: one full benchmark of the final candidate d062b1d (LOW reasoning) on the same 89 cases

**What this is:** a remeasurement on a **reused internal development benchmark**. It is **not** independent
validation or overall accuracy.

**Reporting:**
- The 77 historical cases (54 labels) and the 12 gen-v1 cases are reported separately.
- No runs are combined, and no failures are excluded.

## Candidate (`d062b1d`, branch `improve/grace-complete-1`)
**The one correction since d372f13** (`diff-d372f13-to-d062b1d.patch`, `lib/review/review.ts` only):
- **The defect:** a review-sample answer that is invalid, or that omits checklist items the model was asked about, no
  longer starts the 12 s grace period after which the other sample is cancelled. Live retry-check-1 C003-M3: sample 1
  answered without N4 and N6, and sample 2 was cancelled at the grace period.
- **The rule:** each sample keeps its own deadline; nothing is retried or extended; no status is invented. Items no
  sample supplies stay unchecked and the review is partial.
- **Shown by paired tests:** 1/5 pass at d372f13, 5/5 at d062b1d (`eval/grace-complete-1`).
- **Frequency in saved runs:** 1 of 1,808 records.

**Cumulative changes since 74e15fb** (`diff-74e15fb-to-d062b1d.patch`):
- `5ab93f1`: chronology;
- `ffa7ecd`: robustness;
- `d372f13`: the retry is reachable within the same budget;
- `d062b1d`: the grace rule.

**Checks before any call:**
- **Tests:** 484/484; `tsc --noEmit` clean.
- **Build:** clean production build; **BUILD_ID `GEBczFgK2OrwRJtYdvKIJ`**.
- **Replays:** 498 saved runs (1,768 records) in all four modes are byte-identical to d372f13.

**Settings:**
- `gpt-oss-20b`, **LOW** reasoning, `json_object`;
- 2 review samples, 12 s grace;
- **55 s per-call deadline**, **retry reserve 25 s** (the concurrent retry starts at 30 s), **at most 2 requests per
  call**;
- `facts-v2.0`, `review-v1.4`.

## Fixed inputs (verified before any call)
- **Locked files:** all 199 inputs locked for measure-ffa7ecd are byte-identical here: the 89 cases (dev 12, fresh 28,
  legacy 37, gen-v1 12), expected answers, `config/references.json`, the v2.4 scorers, `run-eval.ts`,
  `final-summary.ts`, and the **fixed starting adjudication state** (measure-74e15fb's final, `8480aec`: 119 items).
- **Baselines** under that same state, with the unchanged scorers:
  - **74e15fb:** 42/54, incorrect flags 0/91 (claim layer), completion 74/77.
  - **ffa7ecd:** 37/54, incorrect flags 1/84 (claim layer, before its additive adjudications), completion 54/77.

## Run
- **Size:** 89 reviews, each once, sequentially, concurrency 1.
- **Order:** dev, fresh, legacy, gen-v1, in ID order within each.
- **Budget:** **hard maximum 534 request attempts**, concurrent retries included.
- **Stops:** after 2 consecutive HTTP/server errors, or 3 consecutive reviews in which every model call failed.
- **No edits or reruns after outputs.**
- **Key:** server-side only, through a temporary link removed afterwards; the server is stopped afterwards.
- **Durable storage:** the runner and run records are in `.worktrees/measure-d062b1d` inside the project folder.

## Report
- **Detection:** historical 54-label detection, with and without the C045-X1 clarification credit.
- **Completion:** completion and partial reasons.
- **Findings and routing:** incorrect extra findings (claim and key-only layers) and routing.
- **Timing and requests:** latency, reviews over 60 s, request attempts, and direct retry rescues (from attempt logs).
- **Gains and losses:** every gain or loss against 74e15fb (42/54) and ffa7ecd (37/54). Recovered timeout losses are
  kept separate from genuinely new detections.
- **gen-v1:** separately.
- **New adjudications:** separately and additively, with scores before and after.
- **Not counted as engine gains:** scorer corrections and unsupported attribution.
