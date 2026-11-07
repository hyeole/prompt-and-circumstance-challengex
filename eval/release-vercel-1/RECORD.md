# release-vercel-1: local deployment branch for Vercel (prepared, not pushed or deployed)

## What is proposed for deployment
| Item | Value |
|---|---|
| Repository | `hyeole/prompt-and-circumstance-challengex` (personal, private) |
| Branch | `release/vercel-demo-1` (local only; not pushed) |
| Base | `6439a17` (head of `improve/hosting-free-1`) |
| Release preparation commit | `4b4c127` |
| Deployment commit | the head of `release/vercel-demo-1` after this record. Its code is identical to `4b4c127`; later commits add records only |

**What the branch contains:**
- the measured engine `d062b1d`;
- the UI fix `dc239ab`;
- the mobile fix `49fbf31`;
- the hosting implementation (`2acec51`, `207aff5`);
- the reviewed blocker fixes `641ec0f`;
- their evidence;
- the Upstash setup record `6439a17`.

**Branches left untouched:**
- your active development branch (`improve/round4-detection`, the main checkout);
- `improve/hosting-free-1`;
- `main`;
- every historical branch.

## Plan and acceptance criteria
| Criterion | Result |
|---|---|
| The branch contains `641ec0f` and its evidence, the mobile fix `49fbf31` and engine `d062b1d` | Yes (all are ancestors) |
| Engine, prompts, model settings, labels, scorers and results are unchanged | `git diff d062b1d..HEAD -- lib/review data scripts config` is empty |
| Type-check and tests | `tsc` clean; **518/518** |
| Production build as Vercel runs it (`VERCEL=1`, `VERCEL_ENV=production`, no secrets set) | Builds |
| Upload simulation | The commit exported with every `.vercelignore` match removed (by Git's own ignore matching; 1,013 tracked files left out). What remains is `app/`, `components/`, `config/`, `data/cases/` (13), `lib/`, `proxy.ts`, `next.config.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore` and `.vercelignore`. This tree **builds** |
| Runtime files in server functions | Every function trace (`.next/server/**/*.nft.json`) was checked. They hold only app code, `config/*.json` and the 13 sample cases. **None** of `eval/`, `tests/`, `scripts/`, `tools/`, `docs/`, `data/local`, `data/manifests`, `.env*`, PDFs or the offline test values. Largest function: about 3.1 MB (Vercel limit 250 MB) |
| Smoke test of the uploaded-tree build | Run locally in demo mode with Valkey, the Upstash-REST shim and the offline fixture (no hosted model). All pages return 200; 13 sample cases are listed; the benchmark set is hidden; judge unlock works; a live review was saved as v1 (3 fixture calls); the history page loads |
| Environment variables | `docs/DEPLOY-VERCEL.md` gives names and placeholders only, and which environment gets each |
| Basic secret checks | No key, token, private-key or credential patterns in any tracked or new file. Two env-style files are tracked: `.env.example` (placeholders) and `eval/hosting-free-1/local-test.env` (offline rehearsal values only; kept out of the upload and the function bundles, and refused on Vercel by `lib/visitor.ts`). `.env.local` and `data/local/` are git-ignored |
| Historical evidence | Nothing deleted. Excluded files stay in Git; they are only kept out of the upload and the function bundles |

## Changes on this branch
| Commit | What it changes |
|---|---|
| `4b4c127` | `.vercelignore`; `next.config.ts` trace includes and excludes; `docs/DEPLOY-VERCEL.md`. No engine, prompt, model-setting, label, scorer, result or UI change |

## Independent verification
**Reviewer:** a separate reviewer subagent. It worked from the actual code, Git history, its own builds and the function traces, in its own scratch area. It did not modify the branch.

**Verdict: READY FOR PREVIEW DEPLOYMENT.** No blockers confirmed.

| Item | Result |
|---|---|
| Branch provenance (contains `641ec0f`, `207aff5`, `2acec51`, `49fbf31`, `d062b1d`; other branches untouched; `main` = `origin/main`) | PASS |
| Engine diff empty; mobile fix intact (only additions to `globals.css` and `FindingsPanel.tsx` since `49fbf31`) | PASS |
| `tsc`; 518/518 tests; production build under `VERCEL=1 VERCEL_ENV=production` with no secrets, from the full commit and from the upload set | PASS |
| `.vercelignore` syntax and upload set (89 files kept; 1,014 excluded) | PASS |
| `.vercelignore` applied to Git-triggered builds | **UNVERIFIED**: the Vercel docs describe it for uploads. The function bundles are clean either way, because `next.config.ts` excludes the same files at trace level; this was checked by building the unfiltered commit |
| Function traces: `/**/*` applies to every route, including nested API routes; every route has the 13 sample cases and `config`; nothing excluded is traced; largest function 3.35 MB | PASS |
| Excluded paths unreachable in demo mode (benchmark sets, source PDF, local store) | PASS |
| Documentation: all required variables listed, placeholders only; repository and branch correct | PASS (optional variables with code defaults are not all listed) |
| Basic secret checks | PASS (this record's earlier wording about tracked `.env*` files is corrected above) |

**Optional, not blocking:**
- list the remaining optional variables, which have code defaults;
- note that previews share the one Upstash database and budget;
- reword "source PDF not available on this computer" for the hosted site;
- scope `lib/cases.ts:11` statically to remove the tracing warning.

**Only the real Vercel import or build can confirm:**
- `.vercelignore` behaviour for Git deployments;
- the `next/font/google` download at build time;
- Fluid compute on, so `maxDuration = 90` is accepted;
- the function region (no `vercel.json`; `iad1` is only stated in the docs);
- the per-environment variable scoping;
- live behaviour with the real Upstash database and model key.

## Deferred, by instruction
- The comprehensive credential-security audit happens before final handover.
- Pushing, importing into Vercel, setting the environment variables and deploying each need separate authorization.
