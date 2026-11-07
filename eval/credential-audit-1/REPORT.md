# credential-audit-1: credential-security audit before the Production deployment (night of 2026-11-06/07, local time)

**Scope:** credentials for the NarrativeCheck public demo:
- the model key and endpoint;
- the Upstash REST URL and token;
- the visitor-signing secret;
- the judge access code.

**Places checked:** the Git repository (all refs, all commits), the local machine, the local Claude session logs for this project, the built and hosted app, GitHub, and Vercel.

**Method:** every check printed only counts, names, lengths or masked forms. No credential value was printed, copied or shown to a reviewer. Read-only throughout: no setting was changed. $0, using local scripts instead of paid scanners (gitleaks and trufflehog are not installed).

## Results
| # | Check | Result |
|---|---|---|
| 1 | **Exact-value search** for the real model key (from `.env.local`) across all 176 commits on 56 refs (diffs and messages) | **0 hits** |
| 2 | Exact-value search across 36,183 files: the main checkout, worktrees `release-vercel-1`, `preview-vercel-1` and `ui-accept-1`, and the session scratchpad (evidence) | **0 hits** (`.git`, `node_modules`, `.next` and `.env.local` itself excluded) |
| 3 | Exact-value search across this project's local Claude session logs (238 files) | **0 hits** |
| 4 | Pattern search over every line added in Git history (all refs): private keys, AWS, GitHub, `sk-…`, Slack, JWT, `Bearer <long>`, `*.upstash.io`, and assignments to key/token/secret/password/judge-code of 24+ characters | **0 credential hits.** The assignment rule excluded placeholders (`replace-with…`, `placeholder`, `example`), bare identifiers and `process.env` references. Without that filter the reviewer found 22 assignment matches: placeholders, identifiers, the offline test values, and one test-only literal in `tests/hosting-fixes.test.ts` (commit `641ec0f`). None is a credential |
| 5 | The same patterns over the local Claude session logs | One pattern only: 4 mentions of `lat…cy.upstash.io`, which is the word "latency" in an earlier reviewer's notes, **not** the project's database. No other hits |
| 6 | Upstash token, visitor secret and judge code (stored only in Vercel, never on this machine) | Not stored locally, so they could not be matched exactly; covered by checks 4, 5 and 8. They were entered **only by you**, directly in Vercel, and never shown in chat, screenshots or logs |
| 7 | Where secrets are read in code | Only in `lib/llm.ts` (model key and URL), `lib/kv.ts` (Upstash), `lib/visitor.ts` (visitor secret), `lib/judge.ts` (judge code). No `NEXT_PUBLIC_` variables. **No browser component imports these modules, directly or indirectly.** Their runtime imports from `lib/` are pure helpers; everything else is type-only. `import "server-only"` enforces this for `llm`, `kv` and `judge`, but **not** for `lib/visitor.ts`, which is server-only by use (low-priority follow-up: add the guard) |
| 8 | **Hosted Preview:** HTML of 8 pages and all 15 browser script files (742 KB) searched for secret names, the Upstash host, the model endpoint host and key formats | **0 hits** |
| 9 | Logging | No `console.*` call logs environment values, cookies, headers or codes |
| 10 | Cookies and code checks | Visitor id: random, signed with HMAC-SHA256, httpOnly, Secure over HTTPS, SameSite=Lax. Judge session: httpOnly, SameSite=Strict, 12 hours, bound to the visitor. The code and signatures are compared in constant time (`timingSafeEqual`). Code attempts are rate-limited (429 seen in review testing) |
| 11 | Weak or published values | The public demo refuses visitor secrets under 32 characters and judge codes under 16, `.env.example` placeholders, and on Vercel the offline test values. All 3 values in `eval/hosting-free-1/local-test.env` carry the refused prefixes (checked by name and length only). **Gaps:**
- The model key is refused only when it is the `.env.example` placeholder or, in production, contains fixture/offline/placeholder wording. There is no length check.
- The Upstash token has no placeholder check, though a wrong token fails closed (401 → "This page could not load") |
| 12 | API responses | `cache-control: private, no-store`, `vary: Cookie`, HSTS, `x-robots-tag: noindex`. Errors are generic (for example "refused the request (HTTP 401)") and never include credential values |
| 13 | Files that reach Vercel | `.vercelignore` removes 1,014 files, including `.env*` (confirmed in the Vercel build logs). The function traces of `727e775` (19 traces; 1,059 app-file references counted with duplicates, 87 unique files) contain no `.env`, `eval`, `tests`, `docs`, local data or PDF files |
| 14 | Tracked env-style files | Only `.env.example` (placeholders) and `eval/hosting-free-1/local-test.env` (offline test values, refused on Vercel). `.env.local` is ignored by Git and has owner-only permissions (`-rw-------`). The model key is not in any shell profile |
| 15 | GitHub `hyeole/prompt-and-circumstance-challengex` | Private. One collaborator (you). 0 deploy keys, 0 webhooks, 0 Actions secrets, 0 workflows. The Vercel GitHub app can see only this repository (vercel-setup-1) |
| 16 | Vercel | Hobby, no payment method, one team member (you, Owner). Variables marked Secret (write-only). **Preview has no model key or endpoint.** Previews are behind Vercel login (Standard Protection) |
| 17 | Credential handling during this work | Upstash URL and token re-entered by you after a private PING/SET check in your own terminal. Judge code replaced by you in both environments. Local throwaway codes were generated for tests and deleted afterwards, as were the reviewers' scratch secrets. `.claude/launch.json` was restored after each local test, with no values left in it |

## Findings and recommendations
| Severity | Finding | Recommendation |
|---|---|---|
| Medium (account) | **Two-factor authentication appears to be off on the Vercel account.** The Members page shows a crossed-circle icon in the 2FA column for the Owner. Vercel's own sidebar prompt "Enable 2FA … Help protect your Vercel account" in screenshots p02/p03 corroborates this | Turn on 2FA for Vercel. Also check it on GitHub and Upstash, since all three control the credentials. This is your account setting; it was not changed |
| Low | Production and Preview share one Upstash database, budget and judge code. Synthetic test cases from the Preview tests are stored there under test visitors and expire 30 days after last change | Acceptable for the demo. Optionally rotate `NC_JUDGE_CODE` for Production before sharing it with judges, so that testers' codes and judges' codes differ |
| Low | The Production model key and endpoint have never been exercised from Vercel. They are write-only, so their values cannot be checked except by a live call | Make one authorized live review after the Production deployment, then watch the runtime log for `config` or `401` errors |
| Info | `CHALLENGEX_BASE_URL` has a default endpoint in code (`lib/llm.ts:6`) and `.env.example` | This is an address, not a credential, and is already published in the repository |
| Info | No dedicated scanner was used (budget) | Checks 1–5 and 8 cover the same ground for this repository. Re-run before any visibility change |

**No exposed credential was found.** Nothing needs rotating because of a leak.

## Independent verification
**Reviewer:** a separate reviewer subagent. It was given **no credentials**: it did not read `.env.local`, print environment values or open web sessions. It used read-only `gh api` calls.

**Verdict: AUDIT SOUND WITH GAPS.** No exposed credential was found by any check it could repeat.

**Re-run by the reviewer and passed:**
- the history pattern scan;
- where secrets are read in code, and what can reach the browser;
- logging;
- constant-time comparison, cookie settings and attempt limits;
- refusal of weak and offline values (by prefix and length only);
- tracked env files and `.gitignore`;
- `.vercelignore`;
- the GitHub metadata;
- a production-style build and its function traces;
- a secret-pattern check of the records and evidence text.

**Not re-runnable without credentials or sessions, so they rest on the author's evidence (`p12`):**
- the exact-value searches with the real key;
- the hosted script and header scan;
- the shell profiles and `.env.local` permissions;
- the Vercel settings and 2FA state;
- check 17.

**Corrections applied:** checks 4, 7 and 11 above, and the 2FA corroboration.

## Not covered
- Third-party systems' own logs (Vercel, Upstash, GitHub), beyond what their dashboards show.
- Your browsers' saved passwords and other apps on this computer.
- Whether the Production values are correct: they are write-only, so only a live call can show it.
- Screenshots in the evidence folders were checked by eye earlier (v01–v20, p01–p04), not by OCR.
