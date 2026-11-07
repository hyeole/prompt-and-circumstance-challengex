# production-vercel-1: first Production deployment (2026-11-07)

**Scope (authorized by you):**
- switch Ignored Build Step to Automatic;
- push only `release/vercel-demo-1` to the reviewed commit `727e775`;
- confirm a Production build starts;
- verify the commit, the public address, pages and storage, with the judge gate kept on.

**Not done, by instruction:** no live AI review, no video, no presentation changes.

## Result
| Item | Result |
|---|---|
| Ignored Build Step | "Only build pre-production" → **Automatic**. Saved, and still set after a reload |
| Push | `release/vercel-demo-1`: `cebea55..727e775`, fast-forward, `--no-tags`. `main` (`49a12be`) and the 5 tags unchanged |
| Production build | **Started automatically**: not skipped, even though `727e775` already had a Preview deployment. Deployment `GAEEaNyQUjTN8sS2JzwA7TZGo4g1`, Environment **Production**, **Ready** in 30 s. Build log: `Branch: release/vercel-demo-1, Commit: 727e775`, no build cache, `.vercelignore` removed 1,014 files |
| Public address | **https://project-7kvs7.vercel.app**, public with no login |
| Pages | `/`, `/cases`, `/cases/new`, `/references`, `/review/C001`, `/review/C001/history`, `/report/C001`, `/audit/C001` → 200. Unknown cases → 404. 13 sample cases listed |
| Storage (Production Upstash) | Working. Visitor A created synthetic case `U-8095f1eee839` ("PROD-SMOKE synthetic visitor A") and read it back |
| Visitor isolation | Visitor B (separate cookies) and a request with no cookie: no user cases listed; A's case, PDF, review and history → 404 |
| Judge gate | On: `/api/access` → `required:true, configured:true, active:false`. PDF upload without the code → 403 `judge_required` |
| Other protections | Write from another origin → 403. Cookie `nc_vid` Secure, HttpOnly, SameSite=Lax. HSTS. API responses `private, no-store` |
| Both fixes live | Phone width 375 px and desktop 1280 px: no sideways scroll, footer notice on screen, judge box is a DIV, no nested forms |
| Runtime logs | No errors, no `KvError` |
| Model calls | **None.** No review request was sent |
| Other addresses | Branch alias, deployment address and project alias → Vercel login (Standard Protection). Only `project-7kvs7.vercel.app` is public |

## Independent verification
**Reviewer:** a separate reviewer subagent with no credentials and no dashboards. It used only read-only GET/HEAD requests to the public site and the other hosts, plus `gh api` GETs.

**Verdict: VERIFIED WITH GAPS.** No blockers.

**Confirmed from outside:**
- GitHub: the release and preview branches are `727e775`; the push was a fast-forward (compare: ahead 2, behind 0, 2 files); `main` and the 5 tags are unchanged.
- **The public site serves `727e775`.**
  - The served CSS contains the footer fix rule.
  - The served scripts contain the new judge box: `div` with `role="group"`, Unlock as `type:"button"`, Enter handled.
  - No script contains the old form markup.
- Public pages, the judge gate and the 13 sample cases.
- Isolation of A's case for a fresh visitor.
- Other hosts redirect to the Vercel login.
- **0 secrets** in 11 pages, 15 scripts, the CSS, the JSON and the headers. No model endpoint host appears.

**Rests on the author's evidence (`p13`):**
- the Ignored Build Step value;
- the deployment's Environment and Production variables;
- the build-log commit;
- clean runtime logs;
- that case `U-8095f1eee839` exists for visitor A (a 404 for others cannot show that from outside);
- the layout measurements.

## Remaining issues and risks
| # | Item | Note |
|---|---|---|
| 1 | **Production model key unproven** | It is write-only in Vercel. Only the first live review will show whether the key and endpoint work. Do one authorized test review before judges use the site |
| 2 | **Every push now deploys** | With Ignored Build Step on Automatic, any push to `release/vercel-demo-1` goes live, and any other branch builds a Preview. Consider "Only build production", or another setting, once Production is stable |
| 3 | **Search indexing** | The production address sends no `x-robots-tag: noindex`, and there is no `robots.txt`, so search engines may index the demo. Optional: add `noindex` |
| 4 | **Hardening headers** | No CSP, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options` or `Referrer-Policy` on pages, so the site could be framed by another page. Minor for a demo; can be added in `next.config.ts` |
| 5 | **Public case creation** | Anyone can create cases without the code. Storage is bounded by the Upstash free tier, the 200 KB request limit and 30-day retention. PDF upload and reviews need the code |
| 6 | **Shared Upstash database** | Preview and Production share one database and its free quota. Test data from Preview stays until it expires (30 days). The Production smoke case `U-8095f1eee839` is a harmless leftover with the same expiry |
| 7 | **Account security** | Two-factor authentication is off on Vercel (credential-audit-1). Turn it on for Vercel, GitHub and Upstash |
| 8 | **Address name** | `project-7kvs7.vercel.app` is the automatic name. `narrativecheck-demo.vercel.app` returned 404 and may be available as a clearer free address |

Evidence (outside Git, no secret values): scratchpad `vercel-evidence/p13-production-deploy.txt`, and the reviewer's `cov-prod/`.
