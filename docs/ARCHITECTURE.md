# Architecture

One Next.js (TypeScript) application. The browser never talks to the model and never sees the key.

```
Browser (React workspace)
   │  POST /api/review  { case }               ← case JSON only; no expected answers
   ▼
app/api/review/route.ts  (Node runtime, input size limits)
   ▼
lib/review/review.ts
   1. splitSentences()          lib/text.ts      stable sentence IDs + character offsets + PDF page
   2. runRules()                lib/review/rules.ts   field coverage, redaction status, charge count, time check
   3. completeJSON()            lib/llm.ts       ONE call to gpt-oss-20b, 55s budget, ≤1 retry on transient errors
   4. ModelOutput.safeParse()   lib/review/schema.ts  zod validation
   5. verifyEvidence()          quotes must match the reviewed text; contradictions need two sources;
                                charge suggestions stripped; unverifiable statements withheld (listed as "withheld")
   6. merge → ReviewResult      checks status, elements, citation, human-review reasons, findings, timings, versions
   ▼
Browser renders highlights from verified offsets only.
```

## Why this shape
- **One app, one language for the product.** Fewer moving parts for a three-day build. Python is used only for offline PDF preparation (`tools/extract`).
- **Rules first, model second.** Deterministic checks are cheap, testable, and still work if the shared endpoint is slow or down.
- **One model call per review.** Keeps latency inside the 60-second target on a shared endpoint. Add calls only if measured quality justifies it.
- **No database or login.** Cases are JSON files. Edits and reviewer actions live in the browser session.

## Versioning
Every review result records `model`, `promptVersion` (`lib/review/prompt.ts`), `referenceVersion` (`config/references.json`), the hash of the narrative and facts it reviewed, and latency.

## Security
- The key is read only in `lib/llm.ts`, which imports `server-only`, so a build fails if it is ever pulled into browser code.
- Error messages report the HTTP status or a timeout, never request headers.
- Case text goes inside a `<case>` block, and the system prompt says it is data. Model output is never executed and is shown only after validation.

## Model requests per review (three-call design)

Each review sends **three requests at the same time** to the shared `gpt-oss-20b` endpoint:

| Request | Prompt | Purpose |
|---|---|---|
| `review-1`, `review-2` | `review-v1.3` | Two independent samples of the full review: elements, issues, citation opinion, human-review opinion |
| `facts` | `facts-v1.2` | Extraction only: entry and removal statements with exact quotes. Code compares them with the form fields |

- Settings: `reasoning_effort=low`, temperature 0, JSON mode, and a 55-second budget per request with at most one retry for timeouts, 5xx and 429.
- Once one review sample succeeds, the other gets a **12-second grace period** and is then cancelled.
- Concurrency is 3 requests per review. The evaluation runs one review at a time (earlier runs used two reviews at a time, so up to 6 requests).
- Every request is logged in the result (`calls`): role, status (ok / failed / cancelled / invalid_output), duration and attempts. The Checks tab shows it under "Run details".

### Measured (diagnostic run 2026-10-29T23-08-37, commit 554c9b8, 16 dev reviews, one at a time)

| | Count |
|---|---|
| Requests logged | 48 (3 per review); 48 HTTP attempts, so no retries were needed |
| `review` samples | 22 ok, 6 cancelled after the grace period, 4 failed (timeout) |
| `facts` | 15 ok, 1 failed (timeout) |
| Reviews with 2 / 1 / 0 valid review samples | 7 / 8 / 1 |
| Request duration (median / max) | review 15.8s / 55.0s; facts 11.4s / 55.0s |
| Full review, client-measured (p50 / p90 / max) | 20.4s / 55.0s / 55.0s; none over 60s |

**What this means:**
- The second sample often does not finish within the grace period: only 7 of 16 reviews actually merged two samples. The design adds safety when the endpoint is fast; under load it falls back to one sample rather than waiting longer.
- One review in 16 had no valid review sample (model check failed). It still received the rule-based checks, including the form-field charge requirement check, and was marked "Partial review".

### Does merging accumulate false flags?
- Every displayed model issue records `sampleAgreement`: how many valid samples reported an issue with the same evidence.
- In the diagnostic run, the samples produced 3 issues before verification. After merging there were 3, and all 3 were reported by every valid sample. So merging added no single-sample flags in this run.
- The sample is small (7 two-sample reviews). Earlier runs did not record per-sample data, so this cannot be checked for them.
- The scorer can now compare false-flag rates by agreement in future runs.
