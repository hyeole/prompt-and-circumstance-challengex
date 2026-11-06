# ui-mobile-1: phone/tablet layout fix and Vercel deployment-readiness inspection

**Starting point:** `dc239ab` (UI wording fix) on the measured `d062b1d` engine, branch `improve/ui-accept-1`.

**Commits:**
- `49fbf31` is the mobile fix: three files, layout only.
- The evidence commit holds this report, the screenshots, logs and the disposable store.

**What was not done:**
- **Engine:** no engine, detection, prompt, model-setting, reference, label, scorer or stored-result change.
- **Calls and runs:** no hosted-model call, no benchmark or experiment.
- **Publishing:** no push, no deployment, no change to repository visibility.
- **Accuracy:** a layout change does not change detection, and none is claimed.

---

## Part 1: mobile fix

### What changed (`49fbf31`)
| Width | Change |
|---|---|
| ≤ 1180 px | **Panels stack** in one scroll area instead of overlapping. Root cause: they were single grid rows with `min-height: 0` inside a fixed-height grid. **Findings come first**, then facts, then the narrative. |
| ≤ 1180 px | **New "Show in narrative" link** on each evidence quote. It scrolls to and focuses that quote's exact highlight, which `data-start`/`data-end` on each mark identifies. **Hidden on desktop and in print.** |
| ≤ 900 px | **Spacing:** the header wraps and padding shrinks. **Grids:** two-column grids (history, report) stack, and the history page's inline grid is overridden. **Overflow:** data tables scroll inside their own box, and finding tags wrap. |
| ≤ 600 px | **Navigation:** the side rail becomes a bottom tab bar. **Header:** it scrolls away with the review content, so reading is full-screen. |
| All widths | **Hidden labels contained:** visually hidden (`.sr-only`) labels are now kept inside their scrolling panel. **Bug found during the check:** they made the page 1818 px tall at 1280×800, so selecting a finding scrolled the whole window by 41 px and hid the header. On `/cases` at phone width they widened the page to 649 px. No visible desktop layout change otherwise. |

**Files:**
- `app/globals.css` (+63 lines, appended responsive block);
- `components/FindingsPanel.tsx` (the link plus a `fid` prop);
- `components/DocumentView.tsx` (two data attributes).

### How it was verified (offline only)
**Setup:**
- **Fixture:** the existing ui-accept-1 fixture endpoint replays the recorded measure-d062b1d outputs. It matches on every sentence plus the charge.
- **Placeholder key:** `CHALLENGEX_API_KEY=offline-fixture-not-a-key`.
- **Store:** a new disposable store at `eval/ui-mobile-1/store`.
- **C012-X1:** the invalid C012-X1 result from ui-accept-1 is **not** used. C012-X1 was reviewed afresh in this store, and the request log shows `case: C012-X1, candidates: [C012-X1]`.

| Check | Result |
|---|---|
| **Page sweep**, production build `vt2MNmIDpxMqdJs6Zy4dA`: 11 pages (workspace, cases, new case, references, 4 review pages, history, report, audit) × 375×812, 390×844 and 768×1024. Checked: page-level horizontal overflow, page taller than the window, element off-screen and not in a scroll box, panel overlap, navigation and header actions visible. | **33/33 clean** |
| **Desktop**, 1280×800 and 1366×768: three side-by-side columns (300 / flexible / 420 px), history in two columns, no "Show in narrative" link, page height equals the window | **Unchanged**. One defect fixed: the 41 px page jump on selecting a finding |
| **Exact evidence navigation, phone:** C012-X1 "contradicts itself (manner)" → Show in narrative focuses the S18 mark (offsets 2289–2417) or the S17 mark (2077). C003-AMB was checked the same way. | **Pass** (f02, f03) |
| **Exact evidence navigation, desktop:** a click centres both selected sentences in the narrative column | **Pass** (d01) |
| **Review states, phone width:** normal replay (C012-X1, C003-AMB ambiguity, C001-MC multi-charge with both charges in the request log); every call failing (C135); fact extraction failing ("Not completed: fact extraction.", C021); loading timer + Cancel → "Review cancelled. Nothing was saved", with no C037 file in the store | **Pass** (f04; dev-server shots m06–m08) |
| **Decisions:** Dismiss without a note refused; Acknowledge saved (store shows `F-ACCOUNT: acknowledged`) | **Pass** |
| **Editing:** a charge edit → **Outdated**, Report disabled, "Discard edits" offered | **Pass** |
| **History, report, intake:** history stacked; report single-column on phones; synthetic case typed → preview → created (`U001-osq8`) | **Pass** (f05, f06, m01, m02) |
| **Code checks:** `tsc --noEmit`, tests, `next build` | Clean; **484/484**; clean. The build shows the same 6 "whole project traced" warnings as before. |

**Screenshots** (`screenshots/`):
- **Labelling:** names ending `OFFLINE-REPLAY` or `OFFLINE-FIXTURE` show recorded outputs replayed, **not live analysis**. The app's model name and ~0.4 s latency come from the replay.
- **`f01`–`f08`:** final production build.
- **`d01`–`d03`:** desktop.
- **`intermediate-dev-server/`:** dev-server shots taken while the CSS was still being adjusted. They show the workflows. Header and panel order may differ from the final version.

### Remaining limitations
- **Tables:** on phones, wide tables (cases, audit, references) scroll sideways inside their own box (f07). The page itself does not.
- **Header and footer:** on non-review pages they stay fixed and take about 150 px at 375 px. Only the review page lets the header scroll away.
- **Getting back to a finding:** "Show in narrative" has no back link. To return, the user scrolls up or taps the highlight. Tapping a selected highlight deselects it, as before.
- **Not tested:**
  - real iOS or Android devices: only Chromium device emulation was used;
  - touch-target sizes;
  - 900–1180 px widths beyond the shared rule: only 768 was checked;
  - printing.
- **Smooth scrolling:** it runs only in a foreground tab. That is browser behaviour, not an app defect.

---

## Part 2: Vercel deployment readiness

**Sources:** official Vercel docs read on 2026-11-06 (functions/limitations, configuring-functions/duration, fluid-compute,
functions/runtimes, plans/hobby, plans/pro-plan, pricing, deployment-protection and password-protection, vercel-blob and
its usage-and-pricing page, redis, git/vercel-for-github, environment-variables, vercel-waf/rate-limiting, limits,
limits/fair-use-guidelines).

**What the docs say:**
- **Function duration:**
  - Hobby: 300 s, default and maximum.
  - Pro: 300 s default, 800 s maximum.
  - Fluid compute is on by default for new projects, and `maxDuration` in the route file is honoured.
- **Filesystem:** "read-only filesystem with writable `/tmp` scratch space up to 500 MB". **The docs do not say /tmp persists.**
- **Size limits:** request and response bodies up to 4.5 MB; function bundle up to 250 MB uncompressed.
- **Hobby restrictions:**
  - Use: "non-commercial, personal use only".
  - Repositories: Hobby projects cannot connect to repositories owned by Git organisations.
  - Protection: Hobby gets Vercel Authentication only. Password Protection is **Pro, $20 per month per project**.
- **Pro:** $20/month, 1 deploying seat and $20 usage credit included.
- **Blob:**
  - Private or public stores.
  - Hobby includes 1 GB, 10k simple and 2k advanced operations, and 10 GB transfer.
  - Pro pays $0.023/GB, $0.40 per 1M simple and $5 per 1M advanced operations.
- **Vercel KV** no longer exists; Redis comes from the Marketplace (Upstash).
- **WAF rate limiting:** all plans. Hobby gets 1 rule per project, Pro 40.
- **Secrets:** "Secret" environment variables are write-only.

### Blocker table
**Confirmed** means shown by the code together with a documented platform fact. **Unverified** means plausible but not proven.

| # | Area | Status | Finding (code reference) | Smallest fix |
|---|---|---|---|---|
| 1 | Persistence | **Confirmed blocker** | **Every save writes to the local disk:** `lib/store.ts:19-24` (`writeJSON`: mkdir, tmp-file write, rename) and `:49-55` (`savePdf`) write under `process.cwd()/data/local`. These are the only filesystem writes in `app/`, `lib/` and `components/`. On Vercel's read-only filesystem, **case creation, review versions, decisions and PDF uploads all fail**. Pointing `NC_STORE_DIR` at `/tmp` would not fail, but nothing documented says it persists or is shared between instances. | Keep the same functions in `lib/store.ts`, backed by **Vercel Blob (private store)** when `BLOB_READ_WRITE_TOKEN` is set, and by the current fs code otherwise (dev, tests). |
| 2 | Persistence under concurrency | **Confirmed blocker** once storage is shared | **Lost writes:** `appendVersion` and `setDecision` (`lib/store.ts:87-108`) read, modify and rewrite one `history/{id}.json`. This is safe in one Node process, but two instances writing at once lose a version or a decision. **Id collisions:** `newUserCaseId` (`:38-41`) counts files, so ids can collide. | Store each version as its own object (`history/{id}/{savedAt}-{rand}.json`, never rewritten) and each decision as `decisions/{id}/{reviewId}/{findingId}.json`. Number versions when reading. Make case ids random (`crypto.randomUUID`, still matching `ID_RE`). |
| 3 | Visitor privacy and separation | **Confirmed blocker** | **No visitor separation:** there is no login, session or visitor id anywhere. `GET /api/cases` (`app/api/cases/route.ts:9-12`) lists **every** user-created case with its history summary, and `/api/cases/[id]` returns any case's full history. **Anyone can write anywhere:** `/api/review` with `save: true` appends a version to **any** id that passes `ID_RE`, built-in cases included (`app/api/review/route.ts:44-47`). `/api/cases/[id]/decisions` sets decisions on any case. Separating cases is not enough: in a public demo, every visitor's narratives, PDFs and decisions are visible to everyone. | Add a **per-visitor namespace**. A Next 16 `proxy.ts` (formerly `middleware.ts`) issues a random, HMAC-signed, httpOnly cookie. A new `lib/visitor.ts` reads it in route handlers. Every store key is prefixed `v/{visitorId}/`. Built-in sample cases stay shared read-only, but their versions and decisions go to the visitor's namespace. Saving is refused unless the case exists for that visitor or is built in. |
| 4 | Access control and public model usage | **Confirmed blocker** | **Open model proxy:** `/api/review` takes **any text up to 40,000 characters** from anyone (`route.ts:12-22`). It runs up to 3 model calls (2 review samples and fact extraction), each up to 2 requests, using the server's key, with **no authentication and no rate limit**. Anyone with the URL can use the hosted model through the app. | **Gate:** Vercel **Password Protection**, Pro only, for the whole deployment, production included. **Rate limit:** one **WAF rate-limit rule** on `/api/review` (for example 10 requests per 10 minutes per IP; available on all plans). The existing zod limits stay. |
| 5 | Uploads | **Confirmed blocker** | **Size mismatch:** the app accepts PDFs up to **25 MB** (`app/api/cases/[id]/pdf/route.ts:7,28`), but Vercel caps request bodies at **4.5 MB**, so larger uploads fail with a platform error. The upload also writes to disk (blocker 1). The 4.5 MB cap also applies to a review request: 40,000 characters fit easily. | **Smallest:** set `MAX` to 4 MB and change the message in `IntakeForm.tsx`. **Alternative:** turn uploads off in the public demo with an env flag, which also removes the risk of real documents being uploaded. Larger files would need direct client upload to Blob. |
| 6 | Request lifecycle: cancellation | **Unverified concern**, likely | **Cancel may not stop a save:** the cancel registry is in memory (`lib/reviewRequests.ts:9-11`, `globalThis` Map). A cancel `POST` (`app/api/review/cancel/route.ts`) can reach a different instance from the running review. It then answers `unknown`, and the review can still **save after the user cancelled**. The docs say concurrent invocations *can* share an instance, but do not guarantee it. **Partial mitigation:** the browser also aborts its fetch, and the route checks `req.signal.aborted` before saving (`route.ts:38`). Whether Vercel passes a client disconnect through to `req.signal` was **not verified**. | Write a cancel marker (`cancel/{requestId}`, short-lived) to the shared store, and check it in `saveUnlessCancelled` just before saving (`lib/reviewRequests.ts:41-47`). |
| 7 | Request lifecycle: timing | **Not a blocker** (confirmed) | **Model timing:** calls run in parallel, each with a 55 s budget and a retry reserved inside it (`lib/llm.ts:7,20`; `lib/review/review.ts:62,325`), plus the 12 s sample grace. **Route limit:** `maxDuration = 90` (`app/api/review/route.ts:9`), within Hobby's and Pro's 300 s default. **Browser limit:** the UI stops at 90 s (`components/ReviewWorkspace.tsx:18,122`). **Fallbacks:** failures produce partial reviews and are already handled. | None. Keep `maxDuration = 90`, so the function ends at about the same time as the UI's 90 s limit. |
| 8 | Credentials | **Not a blocker**; one guard advised | **Server-only:** only `lib/` reads `process.env`. `components/` and `app/` do not, and there is no `NEXT_PUBLIC_` variable. **Placeholder check:** `lib/llm.ts:39-41` refuses only `replace-with-your-key`. A deployment carrying the offline fixture settings (`offline-fixture-not-a-key`, `http://localhost:4555/v1`) would deploy and then fail every review. | Set `CHALLENGEX_API_KEY`, `CHALLENGEX_BASE_URL` and `CHALLENGEX_MODEL` as **Secret** env vars, **Production only**. In `lib/llm.ts`, when `VERCEL_ENV === "production"`, refuse a base URL that is not `https://` or points to localhost, and refuse the fixture placeholder. |
| 9 | Fixture vs production separation | **Not a blocker**; small exposure | **Fixture not deployed as an endpoint:** the fixture endpoint is a stand-alone script in `eval/` started with `tsx`, not an app route. **Test data:** the disposable test stores (`eval/ui-accept-1/store`, this folder's `store/`) are committed but not read by the app unless `NC_STORE_DIR` points there. **Benchmark cases exposed:** `findCase` (`lib/caseSource.ts:13-21`) opens **benchmark cases** (eval, fresh, dev) by id, and `/api/cases?set=eval` lists them. A public demo would expose the internal benchmark inputs. | In production, restrict `allCases`/`findCase` to the `app` set (`lib/caseSource.ts`, `app/api/cases/route.ts:10`). |
| 10 | Bundle | **Unverified concern** | **Whole project traced:** the build warns that dynamic `fs` paths (`lib/cases.ts:11`, `lib/caseSource.ts:26`, `lib/store.ts:30-39`) trace the whole project into the function. The project is about 16 MB apart from `node_modules` and `.next` (eval 9.6 MB), well under 250 MB, but the deployed size was not measured. | After the first preview deployment, check the function size. If needed, scope the paths (`path.join(process.cwd(), "data", "cases")`) or add `/*turbopackIgnore: true*/`. |
| 11 | GitHub import and plan eligibility | **Unverified**: your decision | **Repository:** `hyeole/prompt-and-circumstance-challengex`, owned by a personal account and private. Hobby can import personal-account repositories where you are the owner. Hobby **cannot** connect a repository owned by a GitHub **organisation**, so the UC3 org repository would need Pro. A statement covering *private* personal repositories on Hobby was not found. **Commercial use:** Hobby is non-commercial personal use only. Whether a team CHALLENGE X entry counts as commercial is for you or the sponsor to decide. **Password protection:** needs Pro either way. | Use **Pro** (see below). Then the question does not arise. |
| 12 | Data handling | **Unverified concern**: policy | **What visitors could submit:** real I-213 text holds personal data. In the demo it would be sent to the shared model endpoint and stored in Blob. The app labels text origin but does not stop real data. | **Notice:** a demo banner saying "synthetic or public redacted text only". **Uploads:** off in the demo (blocker 5). **Retention:** a scheduled clean-up deleting visitor namespaces older than N days (Vercel Cron and Blob `list`/`del`). |

### Recommended setup
**Vercel Pro**, with these settings:
- **Access:** **Password Protection** on the project, covering production too. Share the password with judges by email, not in the repository or the deck.
- **Storage:** one **private Vercel Blob store** for cases, versions, decisions, cancel markers and any uploads.
- **Rate limiting:** **one WAF rate-limit rule** on `/api/review`.
- **Key:** stored as a **Secret** env var, Production only.

| Item | Cost (official pricing, 2026-11-06) |
|---|---|
| Pro plan (1 deploying seat; $20 usage credit included) | **$20 / month** |
| Password Protection add-on | **$20 / month per project** |
| Blob (a few MB of JSON; ops in the thousands) | Expected to fit in the $20 credit ($0.023/GB, $0.40 per 1M simple ops, $5 per 1M advanced ops) |
| WAF rate limiting, DDoS mitigation | Included |
| **Total** | **About $40 / month.** It can be downgraded after the judging period. |

**Why not Hobby (free):**
- the non-commercial restriction;
- no Password Protection, so you would have to build login yourselves;
- Blob on Hobby **stops working** when its quota is exceeded.

**Account setup:**
1. Sign in to Vercel with the GitHub account `hyeole`. Create a team and upgrade it to Pro.
2. Import the private repository. Leave the framework preset as Next.js and Fluid compute on.
3. Create the Blob store as **Private** and connect it to the project, which adds `BLOB_READ_WRITE_TOKEN`.
4. Add the environment variables as Secrets: `CHALLENGEX_API_KEY`, `CHALLENGEX_BASE_URL`, `CHALLENGEX_MODEL`, and a new `NC_VISITOR_SECRET`. ⚠ **This is the credential step.** Stop recording before doing it.
5. Turn on Password Protection for **All Deployments**. Add the WAF rule.
6. Deploy a **preview** first, and check it with synthetic cases only.

### Ordered implementation steps (not implemented here)
1. **Storage adapter (blockers 1, 2):** in `lib/store.ts`, add a Blob backend (`@vercel/blob`, private) behind the existing exported functions:
   - versions and decisions stored as append-only, separate objects;
   - random case ids;
   - the fs backend kept for dev and tests.

   Add tests that run the adapter against a fake Blob client.
2. **Visitor namespace (blocker 3):**
   - new `proxy.ts` that issues the signed cookie;
   - new `lib/visitor.ts`;
   - pass the visitor id into every store call from:
     - `app/api/cases/route.ts`
     - `app/api/cases/[id]/route.ts`
     - `app/api/cases/[id]/decisions/route.ts`
     - `app/api/cases/[id]/pdf/route.ts`
     - `app/api/review/route.ts`
     - the server pages that read history (`lib/casePage.ts`).

   Refuse saving to a case that does not exist for that visitor.
3. **Upload limits (blocker 5):**
   - `MAX` set to 4 MB, or an `NC_UPLOADS=off` flag (`app/api/cases/[id]/pdf/route.ts`, `components/IntakeForm.tsx`);
   - matching UI text.
4. **Cancellation (blocker 6):** a cancel marker in the shared store, checked in `saveUnlessCancelled` (`lib/reviewRequests.ts`).
5. **Production guards (blockers 8, 9):**
   - base URL and placeholder check in `lib/llm.ts`;
   - production case set limited to `app` in `lib/caseSource.ts` and `app/api/cases/route.ts`.
6. **Demo notice and retention (blocker 12):**
   - banner in `components/AppShell.tsx`;
   - optional clean-up route under Vercel Cron.
7. **Platform settings (blocker 4 and the setup above):** Password Protection, the WAF rule, and Secret env vars.
8. **Rehearse before production:**
   - deploy a preview;
   - check the function size (blocker 10);
   - run the offline-fixture browser checks against a local build with the Blob backend;
   - then **one** live review with your authorization, after you stop recording.

## Files
- `REPORT.md`: this report.
- `screenshots/`: labelled screenshots.
- `fixture-requests.jsonl`: request log (case matched, charge, mode, outcome; no prompt text).
- `suite.txt`, `build.txt`: test and build output.
- `store/`: disposable test data, including the synthetic case `U001-osq8`.
