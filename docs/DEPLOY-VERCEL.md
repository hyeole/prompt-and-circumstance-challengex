# Deploying NarrativeCheck to Vercel (Hobby, $0)

**Status:** preparation only. Nothing has been pushed, imported or deployed. Every step below needs separate authorization.

**Plan:** see `eval/ui-mobile-1/HOSTING-PLAN-FREE.md`. **Implementation and verification:** `eval/hosting-free-1/REPORT.md` and `FIXES-REPORT.md`.

## What is proposed for deployment
| Item | Value |
|---|---|
| Repository | `hyeole/prompt-and-circumstance-challengex` (personal, private; Hobby cannot connect organization-owned repositories) |
| Branch | `release/vercel-demo-1` |
| Commit | the head of `release/vercel-demo-1`, as stated in `eval/release-vercel-1/RECORD.md` |
| Framework preset | Next.js; default build command (`next build`), no output-directory override |
| Function region | Washington, D.C. (`iad1`), next to the Upstash database (AWS us-east-1) |
| Deployment Protection | Standard: previews need a Vercel login, production is public |

## Environment variables (names only; never put values in Git, chat, screenshots or logs)
Set these in **Vercel → Project → Settings → Environment Variables**:
- **Production:** mark each one **Secret**.
- **Preview:** gets the storage and `NC_*` values but **no model key**, so a preview cannot spend live reviews.

| Name | Placeholder | Production | Preview | Notes |
|---|---|---|---|---|
| `CHALLENGEX_API_KEY` | `<model API key>` | Secret | not set | Server only (`lib/llm.ts`). Placeholders and the offline fixture key are refused in production. |
| `CHALLENGEX_BASE_URL` | `https://<model endpoint>/v1` | Secret | not set | Must be HTTPS and not a local address in production. |
| `CHALLENGEX_MODEL` | `<model name>` | yes | not set | Model settings are otherwise unchanged (defaults in `lib/llm.ts`). |
| `UPSTASH_REDIS_REST_URL` | `https://<database>.upstash.io` | Secret | Secret | From the Upstash console, "REST API" section of `narrativecheck-demo`. |
| `UPSTASH_REDIS_REST_TOKEN` | `<REST token>` | Secret | Secret | Same place. Never the read-only token. |
| `NC_VISITOR_SECRET` | `<32+ random characters>` | Secret | Secret | Generate locally (`openssl rand -base64 48`). Placeholders and the offline test values are refused. |
| `NC_JUDGE_CODE` | `<16+ characters>` | Secret | Secret | Shared with judges privately. Placeholders and the offline test values are refused. |

**Optional, not secret** (the defaults apply when unset): `NC_RL_JUDGE_PER_HOUR` (15), `NC_RL_IP_PER_DAY` (30), `NC_CAP_PER_DAY` (60), `NC_CAP_TOTAL` (400), `NC_MAX_INFLIGHT` (3), `NC_RETENTION_DAYS` (30).

**Do not set these on Vercel:**
- `NC_PUBLIC_DEMO`: Vercel turns the demo mode on by itself.
- `NC_KV`, `NC_STORE_DIR`, `NC_SOURCE_PDF`: local-only.
- Anything from `eval/hosting-free-1/local-test.env`, which holds offline test values only.

## What the deployment contains
- **Uploaded:** `.vercelignore` keeps evaluation history, tests, tooling, docs, local stores, `.env` files, PDFs and test-only values out of the upload. They remain in Git.
- **Bundled into server functions:** `next.config.ts` limits each function to the app code, `config/*.json` and the 13 sample cases in `data/cases`. The public demo serves only the sample set.
- **Verified:** the built trace files were checked: no evaluation, test, local-store, credential or PDF files, and the largest function is about 3 MB. See `eval/release-vercel-1/RECORD.md`.
