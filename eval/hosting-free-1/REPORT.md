# hosting-free-1: $0 public-demo implementation (offline only)

> **Superseded in part (2026-11-06):** the independent review of `5474b34` reproduced three blockers. They are fixed in `641ec0f`; see `FIXES-REPORT.md`:
> - request-id reuse;
> - unchecked bytes beyond the reservation;
> - quota consumed by refused reviews.
>
> **Correction to §2.4:** the monthly storage budget is approximate, not a hard cap. It can overshoot by the requests in flight, and Upstash Free's own limits are the hard stop.

**Branch:** `improve/hosting-free-1`, started from `28ece07` (the $0 plan, on `3369d9e`).

**Commits:**
- **Implementation:**
  - `2acec51`: storage, visitor separation, judge access, limits, cancellation, uploads, guards, UI, tests.
  - `207aff5`: fix for the storage-budget meter.
- **Evidence:** this folder, committed separately.

**What was not done:**
- **No accounts, cards or deployment:** no account was created, no card or billing was used, and nothing was purchased, deployed or pushed.
- **No hosted-model calls and no benchmark runs:** reviews were answered by the offline fixture endpoint replaying recorded `d062b1d` outputs.
- **No engine changes:**
  - **Diff is zero** for `lib/review/**`, `data/**` and `scripts/**`, which holds the engine, prompts, references, labels and scorers. Model settings, labels, scorers and historical results are unchanged.
  - **`lib/llm.ts` gains only a configuration guard** (§2.7). No line was removed.
- **Kept:** the mobile layout fix `49fbf31`.

## 1. Results
| Check | How | Result |
|---|---|---|
| **Type-check** | `tsc --noEmit` | Clean |
| **Full test suite** | `tests/*.test.ts` | **505/505** (`suite.txt`). 21 are new, and the store tests were rewritten. |
| **Contract tests on a real Redis-compatible engine** | Valkey 9.1.3 (Redis 7.2.4 compatible) behind an Upstash-REST shim (`upstash-rest-shim.ts`). The same cases also run on the in-process twin. | **16/16** (`kv-contract-valkey.txt`) |
| **Production builds** | Local-tool mode and public-demo mode | Both clean (`build.txt`, `build-demo.txt`). "Whole project traced" warnings went from 6 to 1 (`lib/cases.ts`). |
| **End-to-end, two app instances sharing one store** | 2 production servers (:3171, :3172), Valkey and the shim, the fixture endpoint. Independent cookie jars. | **28/28** (`e2e-output.txt`, `e2e-results.json`) |
| **Browser workflows** (demo build) | Run at phone (375) and desktop (1280×800, 1366×768) sizes. See the list below the table. | **Pass** (screenshots `h01`–`h08`) |
| **Layout sweep** | 9 pages × 375/390/768 on the demo build | **27/27**: no page-level horizontal overflow, panel overlap or hidden navigation |

**Browser workflows covered:**
- the judge-code banner;
- "Run review" sends nothing without a code;
- unlock → the review runs and is saved;
- exact evidence navigation;
- recording a decision;
- the demo notice;
- 429 and 503 messages;
- the error page during an outage.

**Requested verifications** (end-to-end unless marked otherwise):
- **Concurrent requests cannot exceed caps:**
  - 5 simultaneous reviews across both instances with an in-flight cap of 2: exactly 2 ran and 3 got 429 `busy`.
  - Daily cap of 6: exactly 6 ran, then 429 `day_limit`.
  - Contract tests on Valkey: 40 parallel requests stayed within an in-flight cap of 3; 30 parallel requests within a daily cap of 5. Nothing is reserved on refusal.
  - 25 parallel case writes from 25 different cookies stayed within a global daily cap of 7.
- **Concurrent saves lose no versions:**
  - Simultaneous saves on two instances produced versions `[1,2,3]`.
  - 25 parallel saves on Valkey produced versions 1..25, with 25 distinct reviews.
- **Two independent sessions cannot reach each other's data:**
  - The other visitor saw 0 versions, and their review page showed "No saved review".
  - Their entered case was not listed, and reading it, deciding on it and fetching its PDF all returned 404.
  - A decision on the other visitor's review was refused, and a cancel from the other visitor was ignored ("unknown").
  - A judge cookie copied into another visitor's session was refused.
- **Unauthorized requests never call the model:** no judge code, a copied cookie, a cross-origin request or an origin-less request each got 403 with **zero** new fixture requests. Refused (429) reviews made zero model calls too: 6 fixture requests for 2 admitted reviews.
- **Cancellation prevents the save, across instances:** a review started on instance A and cancelled through instance B returned 409 after about 2 s (the fixture was set to an 8 s delay), and **nothing was saved**. The contract tests also cover:
  - a cancel arriving before the request registered;
  - a save that wins the race and is reported to the late cancel.
- **Storage failures fail closed:** with the shim dropping connections or answering HTTP 500:
  - live reviews returned 503 `storage_unavailable` with no model call;
  - case creation returned 503;
  - pages showed the outage page (h05).

  Unit tests confirm that no admission, write or metered request proceeds.
- **Upload limits and messages:**
  - more than 3 MB → 413;
  - not a PDF → 400;
  - a valid PDF is stored and served from the other instance;
  - no judge code → 403;
  - per-visitor PDF cap (2), per-IP cap and byte caps → 429 (contract tests).
- **Write limits, and cookie resets:**
  - 10 cases per visitor, then 429 `visitor_limit`;
  - a fresh cookie on the same network after 20 cases gets 429 `ip_day_limit`.
- **Retention:** a visitor's data has a 30-day expiry (2,592,000 s) that is renewed on every change.
- **Mobile and desktop remain usable:**
  - phone: h01–h05;
  - desktop: h06–h08;
  - the three-column desktop layout (300 / flexible / 420 px) is unchanged;
  - the 27/27 sweep above.

**Screenshot labels:**
- `OFFLINE-REPLAY`: recorded outputs replayed. These are not live analysis; the model name and timings shown come from the replay.
- `LOCAL-DEMO-BUILD`: the public-demo build running locally.
- Test values only. The judge code typed in the browser is the local test value from `local-test.env`.

## 2. What was implemented
### 2.1 Storage (`lib/kv.ts`, `lib/kvScripts.ts`, `lib/store.ts`)
**Backends:**
- **Upstash REST client:** about 40 lines, no new dependencies.
- **Two in-process twins:** memory for tests, and a single JSON file for the **local single-user tool**, which replaces `data/local/*.json`.
- **No fallback in the demo:** the public demo **never** falls back to local files or `/tmp`. Without Upstash, every storage call fails with 503.

**Layout:** one Redis hash per visitor, `v:{visitorId}`:
- the visitor's cases;
- uploaded PDFs, stored as base64;
- versions, numbered by `HINCRBY` inside one atomic save script;
- one field per officer decision, with no read-modify-write;
- a summary of each case's latest version, so case lists never download versions;
- a review → finding-id index, used to validate decisions.

**Twins verified:** every Lua script has a JavaScript twin. The contract tests show they behave the same on Valkey.

### 2.2 Visitor separation and private caching (`proxy.ts`, `lib/visitor.ts`)
- **Visitor cookie:** each browser gets a random visitor id in an httpOnly, SameSite=Lax cookie, Secure on HTTPS. It carries an HMAC-SHA256 signature (`NC_VISITOR_SECRET`, at least 32 characters; the demo refuses to run without it).
- **Checks:** every route handler and server page re-verifies the cookie and reads or writes only `v:{that id}`.
- **What visitors can open:** another visitor's entered case is "not found". Benchmark case sets are not served in the demo.
- **Caching:** every response is `Cache-Control: private, no-store` with `Vary: Cookie`, including the PDF route, which was `private, max-age=3600`.
- **Same-origin check (proxy and route handlers):** every state-changing request needs a matching `Origin` or `Sec-Fetch-Site: same-origin`. The demo refuses requests carrying neither. The local tool accepts them so the evaluation scripts keep working.

### 2.3 Judge access (`lib/judge.ts`, `app/api/access/route.ts`, `components/JudgeAccess.tsx`)
- **What needs the code:** `NC_JUDGE_CODE` (at least 16 characters) gates live reviews and PDF uploads. Everything else is open.
- **Checking:** the code is compared in constant time, with 5 attempts per 15 minutes per IP and per visitor.
- **Sessions:** a correct code creates `judge:{sid}` → visitor id (12 h) in storage, and a signed httpOnly, SameSite=Strict cookie. A session **works only for the visitor that unlocked it**.
- **Interface:** the code form appears on the review page and next to the PDF field. "Run review" without a session sends nothing and focuses the code field. After unlocking, the requested review starts.
- **Refusals:** a refused review reads "The review was not run" with the server's reason. A recorded result is never shown in its place.

### 2.4 Admission and usage limits (`lib/usage.ts`, `lib/deploy.ts`); public demo only
**Live reviews:**
- **One atomic Lua script** checks, then reserves all of these, or none:
  - per judge session per hour (15);
  - per IP per day (30);
  - global per day (60);
  - global total (400);
  - in flight (3).
- **Concurrency** uses one **expiring lease per request** (a sorted-set member scored by its expiry, 120 s, longer than the route's 90 s). Expired leases are removed in the same script, and a request releases only its own lease.
- **Order:** this happens **before** any model call, and after the origin, visitor, judge-session and case-ownership checks.

**All storage-writing endpoints** (case creation, saved versions, decisions, PDF uploads):
- **One atomic script** per write.
- **Limits:**
  - per visitor: records per kind, and 12 MB;
  - per IP per day: records per kind;
  - global per day and total: records per kind;
  - global bytes ever written: 160 MB, below the 256 MB plan size.
- **Byte counting:** bytes are counted at **stored size**, JSON text and base64 PDFs (×4/3). A saved version reserves 120 KB before the model runs and is topped up if larger. Measured versions are about 21 KB.
- **Cookie resets:** global and per-IP limits do not depend on cookies.

**Monthly storage budget:**
- **Measurement:** each request's storage bandwidth (request plus response bytes) and commands are measured. Scripts are counted as 10 commands each, because Upstash does not document how it counts scripts.
- **Limits:** the budget stops requests at **8 GB and 400K commands a month**, below Upstash Free's 10 GB and 500K.
- **Measured costs** (`usage-measurements.json`):

| Action | Storage traffic | Counted commands |
|---|---|---|
| Live review | about 25 KB | 38 |
| Review or history page, 1 saved version | about 23 KB | 10 |
| Workspace page | about 1 KB | 8 |
| Decision | about 2 KB | 19 |

- **At the full 400-review allowance:** about 10 MB and 15K commands.

### 2.5 Cancellation (`lib/reviewRequests.ts`)
- **Ownership:** `req:{id}` records the visitor that started a request. A cancel from another visitor is reported "unknown" and changes nothing.
- **Atomic scripts:**
  - **cancel:** writes `cancel:{id}`, or reports the saved version;
  - **save-unless-cancelled:** saves only if no cancel marker exists.
- **Effect across instances:** a cancel received by **any** instance prevents the save.
- **Polling:** the running review checks the marker every 2 s, so a cancel on another instance also stops its model calls.
- **Early cancel:** a cancel that arrives before the request registers claims the random id for that visitor, so the request finds itself cancelled.

### 2.6 Retention
- **Expiry:** every write renews the visitor hash's expiry to `NC_RETENTION_DAYS` (30). Reads do not.
- **Notice:** shown on every page, it reads "Your saved work is visible only in this browser and is deleted 30 days after your last change." The workspace and cases pages say the same.
- **Other keys:** judge sessions last 12 h; cancel and saved markers 10 min; daily counters 2 days.
- **Counters that never expire:** the global total counters, by design. Reset them deliberately to reopen the allowance.

### 2.7 Uploads, guards and outage page
- **Upload limit:** **3 MB per PDF**, checked from the request size, the file size and on save. The intake form checks it as well.
- **Production guard (`lib/llm.ts`):** on Vercel production (`VERCEL_ENV=production`) the app refuses:
  - a model endpoint that is not HTTPS or points to a local address;
  - the offline-fixture key.
- **Outage page:** `app/error.tsx` shows a clear message when a page cannot load. It links to References, which needs no storage.

### 2.8 Defects found and fixed during verification
1. **Storage errors became HTTP 500:**
   - **Cause:** `instanceof` failed because the production bundle holds two copies of `lib/kv`, and minification renames classes.
   - **Fix:** errors now carry fixed `name` strings, and responses are matched on those.
2. **The monthly meter recorded nothing in API routes:**
   - **Cause:** the same duplicate-module issue.
   - **Fix:** the meter is now one per process, through `globalThis` (`207aff5`).
3. **After unlocking, the requested review did not start:** it was called with the pre-unlock state. It now starts after the unlocked state renders.

## 3. Correction to `HOSTING-PLAN-FREE.md`
- **What the plan said:** "Upstash, expiry … Claimed free databases: no inactivity rule found."
- **Correction:** Upstash documents that free databases are **archived after at least 30 days of inactivity**. This correction is as you supplied it; I did not re-fetch the page in this step.
- **What it means:** if nobody uses the demo for 30 days, the database can be archived and the site will show the outage page (503) until it is restored in the console.
- **Mitigation:**
  - open the demo and save something at least every few weeks until judging ends;
  - check the console a few days before judging;
  - read Upstash's current archival and restore instructions before relying on it.

## 4. Remaining blockers and limits (not resolved here)
| # | Item | Status | What to do |
|---|---|---|---|
| 1 | **Not run against real Upstash or Vercel.** Valkey plus a local shim is protocol-compatible but not Upstash. | **Untested** | **Request size:** a 3 MB PDF becomes about 4 MB of base64. **Command accounting:** Upstash's count for scripts is unknown, so 10 per script was assumed. **Monthly window:** Upstash's billing month may not match the calendar month used here. Rehearse on a Vercel **preview** with the free database (setup step 7). |
| 2 | **IP-based limits** trust `x-forwarded-for` and `x-real-ip`. | **Unverified for Vercel** | Locally these headers can be spoofed. The global caps hold regardless. Whether Vercel overwrites a client-supplied `x-forwarded-for` was not verified; check it on the preview with a spoofed header. |
| 3 | **Upstash free-plan behaviour at its own limits** is not documented. | **Mitigated** | The app's own budget stops at 80% of both limits. Any Upstash refusal fails closed. |
| 4 | **Hobby limits:** going over one locks the feature for 30 days. | **Mitigated, not removed** | The WAF rule (setup step 6) plus the app caps. Watch the Usage page after the rehearsal. |
| 5 | **Visitor identity is per browser.** | **By design** | A judge who clears cookies or switches browsers starts an empty workspace. Their earlier data stays private and expires. |
| 6 | **Local data from the old file store** (`data/local/{cases,history,uploads}`) is not migrated to `data/local/kv.json`. | **Known** | The old files are untouched on disk. A migration script can be added if that local data matters. |
| 7 | **Sample-case source PDF** is not in the repository (`*.pdf` is git-ignored). | **As before** | On Vercel, built-in cases show "source PDF not available"; uploaded PDFs work. |
| 8 | **Commercial-use question:** whether a cash prize counts as "financial gain" under Hobby terms. | **Your decision** | If CHALLENGE X pays prizes, ask Vercel support before the demo. |
| 9 | **One "whole project traced" warning** remains (`lib/cases.ts`). | **Minor** | Check the function size on the preview deployment. |

## 5. Free-account setup (exact steps; not done; each needs your approval)
⚠ **Steps 2–5 handle credentials.** Stop recording first.

**Rules for every step:**
- **No cards:** never enter a payment card anywhere.
- **No plan upgrades:** never choose "Pay as You Go", "Fixed" or "Pro".
- **One database:** create **exactly one** database.

1. **Prepare the repository:** merge `improve/hosting-free-1` into the branch you deploy, after your review. Vercel needs it on GitHub, so pushing is a later, separate step that needs your authorization.
2. **Upstash** (direct, not through the Vercel Marketplace):
   - **Sign in:** go to https://console.upstash.com and sign in with GitHub. Your first database must be created while signed in; anonymous `/start-redis` databases are deleted after 3 days.
   - **Create the database:**
     - Create Database → Redis, plan **Free**;
     - **primary region close to Vercel's default region `iad1` (Washington, D.C.)**, for example US-East-1;
     - TLS on.
   - **Copy two values:** **REST URL** and **REST token**, from the "REST API" section.
3. **Vercel:**
   - **Sign up:** at https://vercel.com, sign up with GitHub as `hyeole` on **Hobby**.
   - **Import:** Add New → Project → import `hyeole/prompt-and-circumstance-challengex`. When GitHub asks, grant access to **only that repository**.
   - **Build settings:** Framework Next.js, no changes.
4. **Generate two secrets on your computer** (each command prints a new random value):

   ```bash
   openssl rand -base64 48
   ```

   Run it once for `NC_VISITOR_SECRET`. Use a separate, unrelated value of 16 or more characters for `NC_JUDGE_CODE`.
5. **Vercel → Project → Settings → Environment Variables.** Add each as **Secret**, environment **Production only**:
   - `CHALLENGEX_API_KEY`, `CHALLENGEX_BASE_URL` (the `https://` endpoint), `CHALLENGEX_MODEL`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `NC_VISITOR_SECRET`, `NC_JUDGE_CODE`

   Optional, not secret: `NC_CAP_PER_DAY`, `NC_CAP_TOTAL` and the other limits in `.env.example`.

   **Preview** deployments get the Upstash and `NC_*` values but **no model key**, so a preview cannot spend live reviews. A second free database for previews would need its own free allowance. Instead, use the one database and flush test data before going live (step 7).
6. **Vercel → Project → Firewall:**
   - **Rule:** add the one Hobby **rate-limit rule**: all paths, key **IP**, **120 requests / 60 s**, action **429**.
   - **Deployment Protection:** leave on **Standard**. Production stays public; previews need a Vercel login.
7. **Rehearse on a preview deployment:**
   - **Checks:**
     - the demo notice;
     - judge code accepted and refused;
     - a synthetic case;
     - upload limits;
     - a second browser seeing nothing of the first.
   - **No live reviews on the preview:** it has no model key.
   - **Then:**
     - check Vercel → Usage and Upstash → Usage;
     - in the Upstash console, delete the test keys, or flush the database before going live.
8. **Production:** deploy. Run **one** live review, with your authorization and after you stop recording. Share the URL and the judge code with the judges privately, never in the repository or the deck.
9. **Until judging ends:** open the demo at least every few weeks (Upstash's 30-day inactivity archival). Check both Usage pages.

## Files
| File | What it is |
|---|---|
| `upstash-rest-shim.ts` | Offline Upstash-REST protocol shim in front of Valkey, with `down` and `http500` modes. Test tooling only. |
| `e2e-check.ts`, `e2e-output.txt`, `e2e-results.json` | The 28 end-to-end checks and their results. |
| `kv-contract-valkey.txt` | Contract tests on Valkey. |
| `measure-usage.mts`, `usage-measurements.json` | Storage traffic and commands per action. |
| `suite.txt`, `build.txt`, `build-demo.txt` | Test-suite and build output. |
| `fixture-requests.jsonl` | Model requests answered by the fixture: case, charge, outcome; no prompt text. |
| `local-test.env` | **Local test values only** (shim token, visitor secret, judge code) for this offline rehearsal. Not credentials for any service. |
| `screenshots/` | `h01`–`h08`, labelled. |
