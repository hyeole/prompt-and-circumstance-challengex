# preview-vercel-1: first Vercel Preview deployment and hosted verification (2026-11-06/07)

**Scope:** deploy the reviewed release to the **Preview** environment only, verify it on the hosted site, fix the mobile footer problem found there, and redeploy the fix to Preview.
- Production was not deployed or promoted.
- No model key in Preview and no hosted-model calls.
- Synthetic data only. $0 Hobby plan.

This record is kept on `improve/hosting-free-1`. That keeps both deployment branches free of record-only commits, which would trigger builds.

## Final state
| Item | Value |
|---|---|
| Preview branch | `preview/vercel-demo-1` = **`ff6f1af`** (the footer fix on top of `cebea55`), pushed |
| Production branch | `release/vercel-demo-1` = `cebea55`, **unchanged** |
| `main` / tags | `49a12be` / 5 tags, unchanged |
| Latest Preview deployment | `ff6f1af`, Ready, Environment Preview. Fixed branch address: `narrativecheck-demo-git-preview-c23961-prompt-and-circumstance.vercel.app` (needs a Vercel login, under Standard Protection) |
| Production deployments | **One triggered and cancelled; none built or serving.** See "Production" below |
| Ignored Build Step | "Only build pre-production" (`if [ "$VERCEL_ENV" == "preview" ]; then exit 1; else exit 0; fi`): Preview builds, Production is skipped |

## What happened, in order
1. **Production:** Vercel makes a new project's first deployment Production, and a Preview-only first deployment was not possible.
   - With your approval, a deployment of `cebea55` to Production was created while "Don't build anything" was on. It was **cancelled by the Ignored Build Step** without building.
   - Vercel still assigned it a deployment address (`narrativecheck-demo-4pigsks5l-…`). That address returned 302 to the Vercel login. The project's production domain returned 404.
2. The Ignored Build Step was then set to "Only build pre-production".
3. Branch `preview/vercel-demo-1` was pushed at `cebea55`. Vercel did not build that commit again on its own, so the Preview was created manually with Create Deployment, which showed "Preview".
4. **Blocker found and fixed:** Upstash rejected the storage credentials (`KvError … HTTP 401`), and the app failed closed with "This page could not load".
   - You checked the URL and token privately in your own terminal (PING / SET).
   - You re-entered all four `UPSTASH_*` values (Preview and Production).
   - Preview was redeployed without the build cache, and storage then worked.
5. You replaced `NC_JUDGE_CODE` in Preview and Production; the old code had not been kept. Preview was redeployed.
6. Hosted checks (below) found the footer problem. The fix `ff6f1af` was pushed to `preview/vercel-demo-1` only, and Vercel built it as a Preview automatically.

Every Preview build log shows `Branch: preview/vercel-demo-1`. The commit was `cebea55` for the first three Preview deployments and `ff6f1af` for the last. Build: Next.js 16.4.3 on Vercel CLI 65.11.0, region iad1.
- `.vercelignore` is applied to Git builds ("Removed 1014 ignored files"). This settles an item the release review left unverified.
- The build log has one flagged item: the known Turbopack tracing warning at `lib/cases.ts:11`, which is optional. The `next.config.ts` exclusions guard against it.

## Hosted checks (built-in browser pane, signed in to Vercel; synthetic data)
| Check | Result |
|---|---|
| Real Upstash connection | PASS after the credential fix. The workspace loads with 13 sample cases, and saved data survived three redeploys |
| Pages | PASS. `/`, `/cases`, `/cases/new`, `/references`, `/review/C001`, `/review/C001/history`, `/report/C001`, `/audit/C001`, `/api/cases/C001` return 200. An unknown case and a traversal path return 404. Benchmark sets are not listed |
| New case (UI form) | PASS. `U-a2a11e4f4315` and, on the branch address, `U-c3267ff07735` were created, marked `synthetic-test`, and read back from storage |
| Judge gate | PASS. Before unlock: PDF upload → 403 `judge_required`, and "Run review" sends no request. After you typed the code: `/api/access` → `active: true` |
| Review with no model key | PASS. Saved as v1, "Review incomplete" (`modelStatus failed`, completion `partial`), **`modelAttempts 0`**, 33 ms. `lib/llm.ts:40` throws before any client or request when `CHALLENGEX_API_KEY` is unset |
| History | PASS. "v1 · Review incomplete · 1 finding · latest" |
| PDF upload | PASS, server endpoint only, via the page's own fetch. A text file → 400 "not a PDF". 3.2 MB → 413. A 615-byte synthetic PDF → 200, read back byte-identical. **The file-picker UI was not tested** |
| Phone width before the fix | FINDING. Below 900 px the demo notice was pushed into a second column off the right edge, so the data-use disclosure was clipped or off-screen |
| Phone width after the fix | PASS. The new rule is served. The notice is inside the screen at 375 px (14–357) and 715 px (78–697), with no sideways scroll on `/`, `/cases`, the review page and history |
| Visitor isolation, two browsers | **NOT RUN.** The Claude in Chrome extension was not connected (three attempts). A case made on one Preview address returns 404 on another, but that only shows the visitor cookie is tied to the address; it is **not** proof of isolation between two browsers on the same address |

## The fix (`ff6f1af`)
- Only `app/globals.css` (+6 lines): `@media (max-width: 900px) { .footer { flex-wrap: nowrap; } .demo-notice { flex-basis: auto; } }`.
- The bug came from three rules combining:
  - the 900 px block makes the footer a column;
  - the demo block's `flex-wrap: wrap` was added in `2acec51`;
  - the notice's `flex-basis: 100%`.
- Local check (demo mode, in-memory storage, no model key):
  - 375, 390, 715 and 768 px: footer column, notice on screen, no page overflow on six pages;
  - 1280 px: unchanged row layout.
- `tsc` is clean and tests pass **518/518**. `git diff d062b1d..ff6f1af -- lib/review data scripts config` is empty.
- Below 900 px the notice now comes after the "Built by" credit, because of its existing `order: 3`. This is cosmetic.
- Author Harshal Yeole <322620407+hyeole@users.noreply.github.com>; no attribution trailer.

## Independent verification
**Reviewer:** a separate reviewer subagent with no account access and no network calls. It worked from the code, Git and the non-secret evidence, in its own scratch area.
- It re-ran `tsc` and the 518 tests.
- It reproduced the bug and the fix with the real old and new CSS in headless Chrome, at 320–900 px and at 901, 1024 and 1280 px. Desktop measurements were identical before and after.
- It read the visitor, judge and storage code.

**Verdict: PREVIEW VERIFIED WITH GAPS.** No blockers.

| Item | Verdict |
|---|---|
| CSS fix; engine unchanged; commit metadata; tsc and tests | PASS |
| Preview only | PASS with a caveat: the one cancelled Production deployment (above) |
| Production branch unchanged; deployed commits; Upstash; pages; judge gate; review with 0 model attempts (code confirmed); history; hosted mobile | PASS (hosted items from the evidence) |
| PDF upload | PASS, endpoint only |
| Visitor isolation | **Live: UNVERIFIED.** Code design supports it: an httpOnly `nc_vid` signed with HMAC-SHA256, per-visitor storage `v:{vid}`, and judge sessions bound to the visitor |
| Secrets | PASS. No values in the evidence text or the commit |

**Corrections made from the review:**
- Earlier evidence notes said "no production deployment". They now say one Production deployment was triggered and cancelled, and none was built.
- The different-address 404 is no longer counted as isolation evidence.

## Update (2026-11-07): manual two-browser test, file-picker test and the Unlock fix
All on the same Preview address (the fixed branch address).
- **Session A:** the built-in pane.
- **Session B:** your Chrome. You performed every step in it.

| Step | Result |
|---|---|
| 1. B's workspace on first visit | PASS: 13/0/0/0, nothing pending, no saved reviews |
| 2. B opens A's case `U-c3267ff07735` directly (review, history, data, PDF) | PASS: 404 / 404 / "Case not found." / "No source PDF", no download |
| 3. B's `/api/access` while A was unlocked | PASS: `active:false` |
| 4. A opens B's case `U-312b82d6daaf` (list, review, history, report, audit, data, PDF) | PASS: not listed; all 404 |
| 5a. PDF via the file picker on `ff6f1af` (case `U-d39a40a126fc`) | **FAIL.** The PDF was not stored. The request log shows no unlock or upload request, and `/cases/new` was reloaded three times |
| 5b. Same test on `727e775` (case `U-3a53e4804784`) | **PASS.** Case details lists the PDF and "open source PDF" shows the synthetic page. Request log: `POST /api/access` 200, `POST /api/cases` 200, `POST /api/cases/U-3a53e4804784/pdf` 200, `GET …/pdf` 200 |

**Cause of 5a:**
- The judge box on the new-case form was a `<form>` nested inside the case form, so **Unlock** reloaded the page.
- As a result the code was never checked and the chosen PDF was lost.
- This was reproduced locally. The bug was already in the reviewed release (`2acec51`).

**Fix `727e775`:** `components/JudgeAccess.tsx` only (+9/−6).
- The box is now a group with a plain Unlock button.
- Enter in the code field checks the code without submitting the surrounding form.
- tsc is clean; 518/518 tests pass; engine diff is empty.

**Local check:** wrong and right codes, by click and by Enter, on the new-case form and the review page. No reload, file kept, upload 200.

**Independent review:** **READY FOR PREVIEW**, no blockers.
- Headless Chrome with `setInputFiles`.
- Control run on the pre-fix commit reproduced the reload.

**Deployment:** pushed to `preview/vercel-demo-1` only. Preview of `727e775` Ready; the branch address serves the new box (a DIV, 0 nested forms).

## Still open
1. ~~Visitor isolation with two browsers~~: **passed** (above).
2. ~~PDF upload through the file picker~~: **passed on `727e775`** (above).
3. `release/vercel-demo-1` (the production branch): fast-forwarded **locally** to `727e775`. Not pushed. See `eval/release-vercel-2/RECORD.md`.
4. Production uses the same Upstash database and judge code as Preview. No model has been called from Vercel yet.
5. ~~Comprehensive credential-security audit~~: **done**. See `eval/credential-audit-1/REPORT.md` (no exposed credential; recommends Vercel 2FA).

Evidence (outside Git; it shows account and project names but no secret values): scratchpad `vercel-evidence/p01–p09`, `preview-fix-tests.txt`, and the reviewer's `cov-preview/`.
