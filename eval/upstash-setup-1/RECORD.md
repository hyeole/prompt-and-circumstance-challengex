# upstash-setup-1: one claimed Free Redis database (2026-11-06)

**Scope:** Upstash setup only. No push, merge, deployment, model calls, data deletion, payment or plan change.

## Plan and acceptance criteria
1. Sign in (done by the user). Check for existing databases; reuse one only if it is a Free database dedicated to this project.
2. Otherwise create **exactly one** Redis database:
   - **Free** plan;
   - **US-East** region;
   - claimed by the user's account.
3. **$0:**
   - no payment card;
   - no paid plan, upgrade or trial;
   - stop if payment is required.
4. Keep the REST credentials out of chat, screenshots, logs and Git.
5. Verify: claimed, region, Free plan, no paid upgrade. A separate reviewer checks the non-secret evidence.

## What was done
- **Before:** the account had no Redis databases and no credit card (billing: "No credit card added yet").
- **Created:** `narrativecheck-demo`, with these settings:

  | Setting | Value |
  |---|---|
  | Provider and region | AWS, N. Virginia (us-east-1), the location of Vercel's default region |
  | Read regions | None (paid plans only) |
  | Eviction | **Off**: at the size limit writes fail instead of deleting saved data, matching the app's fail-closed design |
  | Plan | **Free** ("Free forever for hobbyists": 250 MB data, 10 GB monthly bandwidth) |
  | Final summary | **Monthly: $0** |

  Pay as You Go and Fixed were unavailable without a payment method.
- **After:**
  - **Databases:** exactly one database, shown as **Free Tier**, AWS US-EAST-1.
  - **Billing:** still no credit card, and no invoices.
  - **Audit log:** one entry, "Created DB" for `narrativecheck-demo` by the user's account.
  - **Teams:** the account has only the "Personal" team.
- **Credentials:** the database's details page, which shows the connection credentials, was **not** read or captured. The REST URL and token were not copied anywhere.

## Independent verification
**Reviewer:** a separate reviewer subagent, given only 9 non-secret screenshots. It had no account access, login, session or credentials, and made no network calls.

**Verdict: VERIFIED (evidence-based).**

| Criterion | Reviewer result |
|---|---|
| No database existed before | PASS (indirect: the "before" list screenshot is cropped; supported by the empty list behind the create dialog and the single audit entry) |
| Exactly one database afterwards, `narrativecheck-demo` | PASS |
| Region AWS US-EAST-1 | PASS |
| Free plan, $0 monthly | PASS |
| No payment method before or after; no invoices or charges | PASS (the invoice table before creation was out of frame) |
| Claimed by a signed-in account | PASS (audit log actor is the account; team "Personal") |
| Eviction off at creation | PASS |
| No secrets in any screenshot | PASS |
| Account has only one team | PASS (as of the screenshot) |

**Not verifiable from the evidence:**
- that the plan stays Free and no card is added later (the "Upgrade…" and "Add new card" options exist);
- that eviction is still off after creation (the settings page was not opened, because it holds credentials);
- that the audit log is complete;
- future usage against the 250 MB and 10 GB limits.

**Evidence handling:** the screenshots are kept outside Git, because two show the account email and IP address. Redact those before sharing them.

## Where the REST credentials go (later stage, separate authorization)
1. Stop recording.
2. In the Upstash console, open `narrativecheck-demo` and find "REST API". Copy the REST URL and the REST token.
3. Paste them only into a password manager entry, or straight into Vercel's environment variables marked "Secret" (Production).
4. Never into chat, screenshots, Git or repository files. A local test copy belongs only in `.env.local`, which Git ignores.

## Keeping it at $0
- **Plan and payment:**
  - never click "Upgrade…" or "Add new card";
  - never choose Pay as You Go or Fixed.
- **No second database:** do not create one.
- **Inactivity:** Upstash archives free databases after at least 30 days without activity. Use the demo regularly until judging ends.
