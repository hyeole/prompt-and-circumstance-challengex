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
