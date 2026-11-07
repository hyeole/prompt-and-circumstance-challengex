# release-vercel-2: release branch prepared with both Preview-verified fixes (local only; not pushed or deployed)

## State
| Item | Value |
|---|---|
| Local `release/vercel-demo-1` | **`727e775`**: a fast-forward from `cebea55`, no merge commit. It is **the same commit** that was verified on Preview |
| Remote `release/vercel-demo-1` (Vercel's production branch) | `cebea55`, **unchanged**. Not pushed: pushing starts a Production deployment |
| Changes since the reviewed release `cebea55` | `ff6f1af` (`app/globals.css`, footer notice on phones) and `727e775` (`components/JudgeAccess.tsx`, Unlock on the new-case form). Nothing else |
| Engine | `git diff d062b1d..727e775 -- lib/review data scripts config` is empty |
| Checks on `727e775` | tsc clean; tests 518/518 (author and independent reviewer) |
| Production build as Vercel runs it (`VERCEL=1 VERCEL_ENV=production`, no secrets) | Builds (author, and the reviewer from a `git archive` copy with and without `.vercelignore` applied). 19 function traces, 87 unique app files, no excluded paths (`eval`, `tests`, `docs`, local data, `.env`, PDFs) |
| Hosted verification | Preview of `727e775`: see `eval/preview-vercel-1/RECORD.md` (pages, phone layout, Upstash, judge gate, review with 0 model attempts, history, PDF via file picker, two-browser isolation) |
| Credentials | `eval/credential-audit-1/REPORT.md`: no exposed credential. Recommends turning on Vercel 2FA |

## Before a Production deployment (each step needs your authorization)
1. **Ignored Build Step:** it is now "Only build pre-production", which **skips every Production build**.
   - Change it to **Automatic** before deploying, or the Production deployment will be cancelled again.
   - Afterwards, set it back to "Only build pre-production" if you want stray pushes to stay unbuilt.
2. **Push `release/vercel-demo-1`** (fast-forward `cebea55..727e775`, no force, no tags).
   - **Caveat:** Vercel's own setting text says it "skips builds for commits with a previously deployed SHA", and `727e775` is already deployed as a Preview. So the push alone may **not** start a Production build, even with Automatic set. The same thing happened on the first Preview: pushing `preview/vercel-demo-1` at an already-deployed SHA built nothing.
   - If no Production build appears, start one with **Create Deployment** from `release/vercel-demo-1` (it should offer "Production").
   - Promoting the verified Preview is another option, but it is untested here. Confirm in the build log that it ran with the Production variables.
3. **Check the Production deployment:**
   - a Production deployment for `727e775` actually exists and builds, not skipped or cancelled;
   - the commit is `727e775`;
   - the build log is clean;
   - the production address loads (it is public under Standard Protection);
   - storage works.
4. **One authorized live review** to prove the Production model key and endpoint. This is the first model call from Vercel. Watch the runtime log for `config` or `401` errors.
5. **Optional:**
   - a clearer free `*.vercel.app` production address than the automatic one (`project-7kvs7.vercel.app` at setup; check the Domains page, since the project was renamed afterwards);
   - a separate judge code for Production;
   - 2FA on Vercel, GitHub and Upstash.

## Independent verification
**Reviewer:** a separate reviewer subagent with no credentials or web sessions. It used read-only `gh api` calls and its own scratch builds.

**Verdict: READY FOR PRODUCTION (pending authorization).** No blockers.

**Confirmed:**
- the fast-forward and the remote state (GitHub `release/vercel-demo-1` is still `cebea55`);
- only the two files changed; the engine diff is empty;
- commit identity, with no trailers;
- the production-style build and the function traces.

**Its correction (C1):** a push of an already-deployed SHA may not start a Production build. Step 2 and step 3 above now cover this.

## Readiness
**Code and configuration: ready for a Production deployment once you authorize it.**

No blockers are open:
- both defects found on Preview are fixed and verified there;
- the audit found no exposed credential.

The remaining unknowns can only be settled after deploying: the Production model key's validity (step 4) and the first public load.
