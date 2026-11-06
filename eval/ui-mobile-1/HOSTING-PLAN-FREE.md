# NarrativeCheck hosting plan at $0: Vercel Hobby and Upstash Redis Free

**Status:** a plan only. Nothing is purchased, upgraded, created or deployed. There are no model calls and no engine change.

**Supersedes:** the Pro recommendation in `REPORT.md` §"Recommended setup". The blocker table there still holds.

**Preserved:**
- **Engine:** the measured `d062b1d` engine (`lib/review/*`, `lib/llm.ts` settings) is unchanged.
- **Mobile fix:** `49fbf31` is kept.

**Sources:** official Vercel and Upstash pages read on 2026-11-06, listed at the end.

**Hard rules for every step:**
- **Vercel:** no paid plan, add-on or trial.
- **Upstash:** **never enter a payment card.** Its FAQ says that upgrades the database to pay-as-you-go.

## 1. Does the student-competition use fit Vercel Hobby?
**What the terms say:**
- **Hobby:** "non-commercial, personal use only".
- **Definition:** commercial use is a deployment used "for the purpose of financial gain of anyone involved". The listed examples:
  - taking payments;
  - advertising a product or service;
  - being paid to build or host the site;
  - affiliate links;
  - ads.

  Donations are explicitly not commercial.
- **Not mentioned:** students, education, hackathons and competitions.

**Assessment:**
- **Fits Hobby:** a student entry with no sales, ads, payments or monetisation matches none of the commercial examples, so it fits Hobby **as written**.
- **One open point:** if the competition pays **prize money**, the terms do not say whether that counts as "financial gain". Confirm whether CHALLENGE X has cash prizes. If it does, ask Vercel support before the demo. Do not upgrade.

**Repository:** deploy from **`hyeole/prompt-and-circumstance-challengex`**, a personal repository that you own. Hobby "does not support" connecting to repositories **owned by a Git organisation**, so the UC3 org repository cannot be used on Hobby.

## 2. The $0 architecture: two services, nothing else
| Piece | Service (free tier) | Why |
|---|---|---|
| Website and API | **Vercel Hobby** | Already a Next.js app. Production is public: Standard Protection covers previews only, so judges need no Vercel account. |
| All persistent data, plus rate limits, usage caps and cancel markers | **One Upstash Redis Free database**, created **directly in the Upstash console** | Free plan: 500K commands/month, 256 MB data, 10 MB per request, no overage billing. Redis gives **atomic** writes and counters, which fixes blockers 2 and 6 and gives a firm cap. Separate keys per visitor give separation. Expiring keys give retention **without a cron job**. |
| Coarse traffic limit | **Vercel WAF**, the one Hobby rate-limit rule | Limits every IP before functions run. Rate-limited traffic is not billed as CDN traffic. |

**Not used, and why:**
- **Vercel Blob:**
  - **Write quota:** Hobby includes only **2,000 advanced operations a month**, and every `put` and `list` counts. A save, a decision, a case and an upload are each a `put`.
  - **Failure mode:** at the limit, "you will not be able to access Vercel Blob". The whole store, and every saved review, would become unreadable until the period resets.
- **Vercel Cron:** not needed, because expiring keys handle retention.
- **Marketplace installation of Upstash:** the docs do not say whether billing then runs through Vercel, so create the database directly at upstash.com instead.

### Data model (Redis keys; every visitor key expires after `NC_RETENTION_DAYS`, default 30)
| Key | Type | Replaces |
|---|---|---|
| `v:{vid}:case:{caseId}` | string (JSON) | `data/local/cases/{id}.json` |
| `v:{vid}:cases` | set of case ids | the directory listing |
| `v:{vid}:ver:{caseId}` | list; `RPUSH` returns the new version number **atomically** | `history/{id}.json` versions (about 40 KB each) |
| `v:{vid}:dec:{caseId}` | hash; field `{reviewId}:{findingId}`, value the decision JSON | `history/{id}.json` decisions |
| `v:{vid}:pdf:{caseId}` | string (binary, ≤ 3 MB) | `uploads/{id}.pdf` |
| `cancel:{requestId}` | string, 10-minute expiry | the in-memory cancel registry |
| `cap:day:{yyyy-mm-dd}`, `cap:total`, `cap:inflight`, `cap:pdfs` | counters | new: the usage caps |
| `rl:*` | `@upstash/ratelimit` keys | new: per-session and per-IP limits |

**Sample cases:** the built-in sample cases (public, redacted CBP records already in `data/cases`) stay read-only files in the bundle. A visitor's reviews of them are stored under that visitor's `v:{vid}:` keys.

### Visitor separation
- **Visitor id:** a `proxy.ts` (the Next 16 name for `middleware.ts`) gives each browser a random visitor id. The cookie is `nc_vid`: httpOnly, Secure, SameSite=Lax. It carries `HMAC(NC_VISITOR_SECRET, vid)`, so it cannot be forged or guessed.
- **What each visitor reaches:** every read and write uses that browser's `vid`. A visitor cannot list or open another visitor's cases, versions, decisions or PDFs.
- **Benchmark cases:** they are not served in production. `findCase` and `allCases` are limited to the `app` set.
- **What is shared:** only the public sample cases, read-only.

### Judge access for live reviews
- **Open to everyone** (each visitor's own space, no model call):
  - browsing the site and sample cases;
  - entering a case;
  - recording decisions on their own saved reviews;
  - viewing history and reports.
- **Needs the judge access code:**
  - **Run review**, the only path that uses the model key;
  - PDF upload, which is storage-heavy.
- **Checking the code:** `POST /api/access` compares the code with `NC_JUDGE_CODE` (a Secret env var, at least 16 random characters) in constant time.
  - **On success:** it sets a signed, httpOnly `nc_judge` cookie that expires after 12 hours.
  - **Brute force:** attempts are limited to **5 per 15 minutes per IP**.
- **Without the code:**
  - **What the visitor sees:** "Live reviews need the judge access code" and a code field.
  - **No recorded fallback:** **no recorded result is shown in place of a live review.** The offline fixture is never part of the deployment.

### Rate limits and the firm usage cap (all enforced in code before any model call; **fail closed**)
| Limit | Default (env) | Enforced in |
|---|---|---|
| Live reviews per judge session | 15 per hour (`NC_RL_JUDGE_PER_HOUR`) | `@upstash/ratelimit`, fixed window (2 Redis commands per check) |
| Live reviews per IP | 30 per day (`NC_RL_IP_PER_DAY`) | `@upstash/ratelimit` |
| **Global live reviews per day** | **60** (`NC_CAP_PER_DAY`) | `INCR cap:day:*`, with the key expiring after 2 days |
| **Global live reviews, whole demo** | **400** (`NC_CAP_TOTAL`) | `INCR cap:total`, never expires; reset by hand |
| Reviews running at once | 3 (`NC_MAX_INFLIGHT`) | `INCR`/`DECR cap:inflight` with a 120 s safety expiry |
| PDFs stored, all visitors | 30 (`NC_CAP_PDFS`); 2 per visitor | `INCR cap:pdfs` |
| Each request | 1 review ≤ 3 model calls ≤ 6 upstream requests (unchanged engine) | `lib/llm.ts` (unchanged) |
| All traffic per IP | 120 requests per 1 minute, action 429 | the single Vercel WAF rate-limit rule (Hobby: one rule; IP key; 10 s–10 min window) |

**Reasoning:**
- **Hard ceiling:** 400 reviews × 6 = **at most 2,400 upstream model requests for the whole demo**. Raising the ceiling is a deliberate env change.
- **What a refused review looks like:** a cap or rate limit gives HTTP 429 and the UI says why ("Daily live-review limit reached"). There is no recorded fallback.
- **When Redis is unreachable:** live reviews are **refused** (503), never run without limits.

### Uploads
- **Limit:** **3 MB per PDF** (was 25 MB).
- **Why 3 MB:** the request must pass Vercel's **4.5 MB** body limit. Redis's REST API stores binary as base64 (×4/3, so 3 MB becomes about 4 MB, under Upstash's 10 MB request limit).
- **Storage budget:** 30 PDFs × 3 MB = 90 MB at most. Reviews take about 40 KB each, so 400 take about 16 MB. Everything stays well inside the 256 MB data limit.
- **Behaviour unchanged:** PDFs are still for viewing only. No text is read from them.

## 3. Quotas, accounts and risks that affect the demo
| Item | Fact (source) | Effect and handling |
|---|---|---|
| Vercel Hobby, card | Not stated. The pricing page says "Hobby is free". | **Do not add a card.** If the sign-up flow asks for one, stop and tell me. |
| Vercel Hobby, over a limit | "you will have to wait until 30 days have passed before you can use the feature again". Hobby "cannot purchase additional usage". | **No charges are possible, but going over a limit can take a feature down for 30 days.** This is the main demo risk. It is why the WAF rule and the caps exist. |
| Vercel Hobby, monthly allowance | 1M function invocations; 4 h Active CPU; 360 GB-hrs provisioned memory; 2 GB per function; 300 s maximum duration | A review mostly waits on the model, which is light on CPU. **CPU per review was not measured.** Check Vercel's Usage page after the preview rehearsal. |
| Vercel Hobby, inactivity | Not found | None known. Redeploy before the demo anyway. |
| Deployment Protection | "Standard Protection … protects all domains except production domains", available on all plans | Leave it on Standard. Production is public; previews need a Vercel login (good for testing). |
| Upstash Free | 500K commands/month; 256 MB; 10 MB per request; 10,000 commands/s; no overage billing | Roughly 3–10 commands per page view or save, and about 12 per live review including the limit checks. Thousands of visits fit comfortably. |
| Upstash, at the limit | **Not documented** for the free plan | Our caps keep usage far below. Fail closed, so if Upstash refuses, reviews and saves are refused with a message, never run unmetered. |
| Upstash, card | Entering one "upgrades" to pay-as-you-go | **Never enter a card.** Never pick "Pay as You Go" or "Fixed". |
| Upstash, expiry | Unclaimed `/start-redis` databases are "deleted after 3 days". Claimed free databases: no inactivity rule found. | Create the database **while signed in**. Visit the demo once a week before judging. Recheck the console a few days before. |
| Model endpoint | The sponsor's shared endpoint and key; its own quota is unknown | The 400-review ceiling bounds our use. Confirm any sponsor limit. |

**Data retention:** visitor data expires after 30 days by itself. The site states this, and that only **synthetic or public redacted text** may be entered, because entered text goes to the shared model endpoint.

## 4. Requirements check
| Requirement | Met at $0? | How, or the compromise |
|---|---|---|
| Persistent case and review storage | **Yes**, for 30 days by default | Upstash Redis Free. Saved reviews are kept per visitor until expiry. Longer retention is an env change, within the 256 MB limit. |
| Separation between visitors | **Yes** | A signed visitor cookie, with every key namespaced by it. **Compromise:** identity is per browser, not a login. A judge who switches browser or clears cookies starts empty. Their earlier data stays private and expires. |
| Public site without a Vercel account | **Yes** | Production is public under Standard Protection. |
| Protected live reviews | **Yes, in the app** | **Compromise:** Hobby has no Password Protection, so the judge code is our own code: a constant-time check, a signed cookie and attempt limits. It protects the model key and uploads; browsing stays public by design. |
| Rate limits and a firm usage cap | **Yes** | Redis counters and `@upstash/ratelimit`, failing closed, plus one WAF rule. |
| Upload limits compatible with the platform | **Yes, with a smaller limit** | **Compromise:** 3 MB per PDF, judges only, 30 in total. Larger PDFs would need direct browser uploads to storage, which the free Blob quota cannot carry. Uploading stays a core feature with lower limits. |
| No exposure of private data | **Yes**, with namespaces and benchmark cases hidden | Sample cases are public redacted records. |
| No silent recorded results | **Yes** | The fixture is not deployed. A refused review says why. |
| No charges | **Yes**, given the card rules above | Neither free tier can bill without a card and an explicit upgrade. |

**Not met at $0:**
- **Platform-level password protection.** It is replaced by the judge code above.
- **Guaranteed availability after abuse.** If a Hobby limit were still exceeded despite the WAF rule and caps, the affected feature stops for up to 30 days. The caps and WAF rule make that unlikely; nothing at $0 can rule it out.

## 5. Exact implementation steps (none done yet)
**Code (in a new branch from `3369d9e`; engine files untouched):**
1. **Dependencies:** add `@upstash/redis` and `@upstash/ratelimit` (free, open-source libraries).
2. **`lib/kv.ts` (new):** returns an Upstash client when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Otherwise it returns `null`, so local dev and tests keep the current file store. In production a missing client is a startup error, never a silent fallback to `/tmp`.
3. **`lib/store.ts`:** keep every exported function name, and add a `vid` argument. Implement them on the keys in §2:
   - `RPUSH` for versions;
   - `HSET` for decisions;
   - random case ids;
   - `EXPIRE` on every write.

   Keep the fs code for local use. Add `tests/store-kv.test.ts` against an in-memory fake that covers:
   - visitor isolation;
   - atomic version numbers;
   - decision overwrite;
   - expiry being set.
4. **`proxy.ts` (new) and `lib/visitor.ts` (new):**
   - issue and verify `nc_vid` (HMAC, `NC_VISITOR_SECRET`);
   - `getVid(req)` for route handlers and server pages.
5. **Pass `vid` through every caller:**
   - `app/api/cases/route.ts`
   - `app/api/cases/[id]/route.ts`
   - `app/api/cases/[id]/decisions/route.ts`
   - `app/api/cases/[id]/pdf/route.ts`
   - `app/api/review/route.ts`
   - `lib/casePage.ts`
   - `lib/caseSource.ts`
   - `lib/workspaceData.ts`, which the workspace and case-list pages (`app/page.tsx`, `app/cases/page.tsx`) use

   Refuse saving a review or decision to a case that is neither built in nor the visitor's own.
6. **Judge access:**
   - **Routes and cookie:**
     - new `app/api/access/route.ts`;
     - new `lib/judge.ts` (cookie signing, constant-time check);
     - an attempt limit through `@upstash/ratelimit`.
   - **Interface:**
     - **Code field:** in `components/FindingsPanel.tsx`'s ready state, "Run review" shows the code field when there is no judge cookie.
     - **Same for uploads:** `components/IntakeForm.tsx` does the same for the PDF field.
7. **`lib/usage.ts` (new):** `beginLiveReview(vid, ip)` checks the per-session, per-IP, daily, total and in-flight limits in that order. It returns a release function or a refusal. `app/api/review/route.ts` calls it **before** `reviewCase` and releases in `finally`.
   - **Refusals:** HTTP 429 with a reason the UI shows. `components/ReviewWorkspace.tsx` displays it as an error, not a result.
   - **Fail closed:** a Redis error gives 503.
8. **Cancellation (`lib/reviewRequests.ts`):** `cancelRequest` also writes `cancel:{id}` (expiring after 10 minutes). Before saving, `saveUnlessCancelled` checks it, so a cancel received by another instance still prevents the save.
9. **Uploads:**
   - `app/api/cases/[id]/pdf/route.ts`: `MAX` becomes 3 MB, plus the judge cookie and `cap:pdfs`. The PDF goes to Redis instead of disk.
   - The `GET` handler reads the PDF from Redis.
   - The limit text in `IntakeForm.tsx` changes to match.
10. **Production guards:**
    - **`lib/llm.ts`:** when `VERCEL_ENV === "production"`, refuse a base URL that is not `https://` or is localhost, and refuse the fixture placeholder key. This is a configuration check only; model settings are unchanged.
    - **`lib/caseSource.ts` and `app/api/cases/route.ts`:** serve only the `app` case set in production.
11. **Notice:** `components/AppShell.tsx` gets a one-line banner: "Demo: enter only synthetic or public redacted text. Data is deleted after 30 days."
12. **Bundle tracing (optional):** scope the `fs` paths in `lib/cases.ts` and `lib/caseSource.ts` to their folders, to silence the "whole project traced" warnings.
13. **Checks, all offline:**
    - `tsc`; the full test suite plus the new tests; `next build`.
    - The ui-mobile-1 browser checks against a local production build, using a **local Redis-compatible fake** or a **separate free Upstash test database** and the offline fixture endpoint.
    - Confirm 429 and 503 messages, judge-code gating, visitor isolation across two browser profiles, and cancel-then-no-save.

**Accounts and settings** (each step needs your approval; the ⚠ steps involve credentials, so stop recording first):

14. **Upstash:**
    - Sign up at console.upstash.com with GitHub or email. **No card.**
    - Create **one** Redis database: Free plan, one region near Vercel's default (Washington D.C., `iad1`), TLS on.
    - ⚠ Copy the REST URL and token.
15. **Vercel:**
    - Sign up for Hobby with the GitHub account `hyeole`. **No card**; stop if one is asked for.
    - Import `hyeole/prompt-and-circumstance-challengex`. Grant the Vercel GitHub app access to **that repository only**.
16. ⚠ **Vercel → Settings → Environment Variables**, as **Secret**, for **Production** only:
    - `CHALLENGEX_API_KEY`, `CHALLENGEX_BASE_URL`, `CHALLENGEX_MODEL`
    - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
    - `NC_VISITOR_SECRET` (32+ random bytes)
    - `NC_JUDGE_CODE` (16+ random characters)

    The cap settings (`NC_CAP_*`, `NC_RL_*`) are not secret.

    **Preview:** give preview deployments the Upstash test database and **no model key**, so previews cannot spend reviews.
17. **Vercel → Firewall:** add the one rate-limit rule (all paths, key IP, 120 requests per 60 s, action 429). Leave Deployment Protection on **Standard**.
18. **Rehearsal:**
    - deploy a **preview**;
    - check with synthetic cases;
    - check the Vercel Usage page.
19. **Production:** promote the build. **One** live review on production, with your authorization and after you stop recording. Then share the URL and the judge code with the judges privately, never in the repository or the deck.

## Sources (read 2026-11-06)
- **Vercel plans and terms:**
  - https://vercel.com/docs/plans/hobby
  - https://vercel.com/docs/limits/fair-use-guidelines
  - https://vercel.com/docs/limits
  - https://vercel.com/pricing
- **Vercel functions:**
  - https://vercel.com/docs/functions/limitations
  - https://vercel.com/docs/functions/runtimes
- **Vercel protection and firewall:**
  - https://vercel.com/docs/security/deployment-protection
  - https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
  - https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing
- **Vercel storage, cron and GitHub:**
  - https://vercel.com/docs/vercel-blob/usage-and-pricing
  - https://vercel.com/docs/vercel-blob/using-blob-sdk
  - https://vercel.com/docs/cron-jobs/usage-and-pricing
  - https://vercel.com/docs/git/vercel-for-github
- **Upstash:**
  - https://upstash.com/pricing/redis
  - https://upstash.com/docs/redis/overall/pricing
  - https://upstash.com/docs/redis/sdks/ratelimit-ts/costs
  - https://vercel.com/marketplace/upstash
