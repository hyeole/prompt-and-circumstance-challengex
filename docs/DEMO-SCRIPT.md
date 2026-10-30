# Demo script

## Final demo video (recorded 2026-10-30 16:59 UTC, closeout build) — illustrative
- **File:** `recordings/narrativecheck-demo-2026-10-30T16-59-37.webm`. It is kept out of Git; share it via Google Drive or YouTube.
- **How it was recorded:** `node scripts/record-demo.mjs --clean C119` (Playwright + Chrome) against the **production build** of `7efb231` (tag `rc-closeout`, the evaluated build).
  - Every review is a live `gpt-oss-20b` call, and waiting time is shown in real time.
  - Captions describe only what each live review returned. The opening caption says the demo is illustrative and that live output varies.
- **Before recording**, all six beats passed `scripts/verify-demo.ts` on its second run. The first run's two failures are recorded in `docs/demo-verification.md`.
- **What the recorded reviews returned:**
  - C119: reviewed, no findings, citation consistent.
  - C012-M2: "Missing: place of last entry". After the officer's correction and a fresh review, the place finding is resolved; the identity-document observation remains.
  - C037-X1: this live review was **partial** (a required check did not finish). The video says so instead of showing the date conflict that the evaluation run found.
  - C003-AMB: "One person's account of the entry contradicts itself (manner)", routed to a person, plus C003's real time discrepancy.
  - C001-MC: multiple charges selected, routed to a person.
- **Earlier recordings** are kept on disk and not delivered. One earlier recording (`NarrativeCheck-demo-final.webm`) predates the closeout build. Three other closeout recordings had captions that assumed results, or started from an edited case. See `eval/EVALUATION-closeout-7efb231.md`.
- The video has captions and no voice. To add narration, use the table below as a voice-over.

There are two kinds of video:
1. **Development recordings.** These are your own learning clips. Optional; they are not submitted.
2. **Final demo.** Recorded automatically with `npm run demo:record`, as a captioned `.webm` of the real app with live model calls. You can also record it yourself with the shot list below and add your voice.

## Before recording
- Run `npm run dev`. The key must already be set up; never show `.env.local` or the Terminal command that sets it.
- Close other browser tabs and turn on Do Not Disturb.
- Use Chrome at full screen, 1440×900 or larger.
- Warm up: run one review first so the dev server has compiled everything.

## Shot list and narration (about 3 to 4 minutes)

| # | On screen | Say |
|---|---|---|
| 1 | Workspace with C119 open | "This is NarrativeCheck, built by Prompt and Circumstance. It reviews an officer's charge narrative, the case facts, and the charge the officer selected. It points out gaps. It never rewrites the narrative and never picks a charge." |
| 2 | Point to the three panels | "Case facts from Form I-213 are on the left, the original narrative is in the middle, and findings are on the right. Gray chips are redactions from the public record. We treat redacted information as unavailable, not as a mistake." |
| 3 | Click **Run review**, wait | "The review runs live on the Unissant-hosted gpt-oss-20b. The timer shows real seconds. We don't fake a progress bar." |
| 4 | Result: checklist and citation | "Every required element is present, and the selected charge is consistent with the facts. When a check finds nothing, it says so. When a check could not run, it says that too." |
| 5 | Switch to C012-M2, run | "This is a team test copy where we removed the place of entry. It shows up in the missing-elements checklist. Nothing is highlighted, because there is no text to point to." |
| 6 | Edit narrative, add "near Laredo, Texas", fill the field, Done | "The officer fixes it in their own words. The old findings are now marked outdated, and the app asks for a fresh review." |
| 7 | Run fresh review | "The new review checks the corrected text." |
| 8 | Switch to C012-X1, run, click the conflict finding | "Here we planted a contradiction. Clicking the finding highlights both sources, and the form field lights up on the left. Clicking a highlight opens its explanation." |
| 9 | Switch to C003-AMB, run, show the banner | "When the facts are ambiguous, the case goes to a person, with the reason." |
| 10 | Switch to C001-MC, run | "With two charges selected, the case always goes to human review. The tool does not choose between them." |
| 11 | Export report | "Each review exports a one-page gap report with evidence, page numbers, and the model and reference versions." |
| 12 | Back to the workspace | "Our references are provisional until Unissant's reference sheet arrives, and our scores come from team-made test cases. Thank you." |

Only show what actually happens on screen. If the live endpoint is slow or fails during recording, say so. Don't edit in results from another run.
