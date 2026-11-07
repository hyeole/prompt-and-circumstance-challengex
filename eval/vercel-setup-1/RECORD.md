# vercel-setup-1: Vercel Hobby project configured, not deployed (2026-11-06)

**Scope:** account and project setup only. No deployment, merge, code change, visibility change or model call.

This record is kept on `improve/hosting-free-1`, so the deployment branch `release/vercel-demo-1` stays at `cebea55`.

## Acceptance criteria and result
| Criterion | Result |
|---|---|
| Hobby plan, no payment method, no paid add-ons or trials | Met. Billing shows "Hobby Plan – Active" and "No payment methods added"; the account has one team (Hobby) |
| No duplicate project | Met. The team had no projects; one new project, `narrativecheck-demo` |
| Only the private personal repository is connected | Met. `hyeole/prompt-and-circumstance-challengex` (private) is the only repository visible to the Vercel GitHub app. GitHub visibility and `main` are unchanged |
| Production branch | `release/vercel-demo-1` (Settings → Environments → Production → Branch Tracking) |
| Build settings | Framework Next.js, default build, output and install commands, root `./`; Node.js 26.x (Vercel default) |
| No deployment created | Met: no production or preview deployments. Created as an empty project; connecting Git triggered nothing; the "Redeploy" suggestion was dismissed |
| Safety net | Ignored Build Step = "Don't build anything" (`exit 0`). **Must be switched back to Automatic before the first deployment**, or every build is skipped |

**Environment variables:** entered by the user directly in Vercel. Values were never shown, captured or printed.

| Name | Production | Preview | Development | Type |
|---|---|---|---|---|
| `UPSTASH_REDIS_REST_URL` | yes | yes | no | Secret |
| `UPSTASH_REDIS_REST_TOKEN` | yes | yes | no | Secret |
| `NC_VISITOR_SECRET` | yes | yes | no | Secret |
| `NC_JUDGE_CODE` | yes | yes | no | Secret |
| `CHALLENGEX_API_KEY` | yes | no | no | Secret |
| `CHALLENGEX_BASE_URL` | yes | no | no | Secret |
| `CHALLENGEX_MODEL` | yes | no | no | Config |

- No team-level shared variables are linked; checked under the Production filter.
- No local-only or fixture variables are present.

## Independent verification
**Reviewer:** a separate reviewer subagent, given only 20 non-secret screenshots and the implementer's check record. It had no account access and made no network calls.

**Verdict: SETUP VERIFIED (evidence-based).**

**Confirmed from screenshots:**
- the plan, payment method and team count;
- the new empty project;
- the one private repository;
- the production branch;
- the Next.js defaults;
- the build-skipping setting;
- no production or preview deployments;
- the exact production (7) and preview (4) variable sets and their Secret/Config icons;
- the full spelling of both Upstash names, through searches;
- no Development variables;
- no shared variables under Production;
- no secret value in any screenshot.

**Supported only by the implementer's claim:**
- the type-filter results, although the icons agree;
- no shared variables for Preview or Development;
- the GitHub app's repository selection on GitHub's side;
- no other projects in the team after setup.

**Only a real deployment can check:**
- the secret values themselves;
- the build on Node 26.x;
- that the deployed commit is `cebea55`.

**Notes:**
- The production address is still the automatic `project-7kvs7.vercel.app`. A clearer free `*.vercel.app` address can be added later.
- Vercel recommends two-factor authentication for the account; that is the user's choice.

The screenshots are kept outside Git. They show the username, team name and project ID, which are not credentials.

## Before the first deployment (separate authorization)
1. Switch Ignored Build Step back to "Automatic".
2. Trigger a production deployment of `release/vercel-demo-1` at `cebea55`. For example, Deployments → Create Deployment from that branch, or a redeploy once Automatic is set.
3. Then check that the build log shows commit `cebea55`, along with live behaviour, the judge code, and one authorized live review.
