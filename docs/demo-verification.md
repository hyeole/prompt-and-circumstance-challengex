# Demo verification

Live reviews against http://localhost:3000 on 2026-10-30T16:33:51.306Z (commit-level code as running). Every demo beat must pass before the video is recorded.

## PASS 1. Complete case (C119) (10.3s)
- ✓ every required check completed
- ✓ no findings
- ✓ no human-review trigger
- ✓ citation consistent
- findings: none
- citation: consistent; human review: false

## PASS 2. Missing detail (C012-M2) (17.7s)
- ✓ every required check completed
- ✓ place of entry (E2) reported absent
- ✓ missing finding has no invented text span
- findings: M-E2 Missing: place of last entry; U-N1 Unclear: identifying documents
- citation: consistent; human review: false

## PASS 3. Officer correction + fresh review (C012-M2 edited) (36.9s)
- ✓ every required check completed
- ✓ place of entry no longer missing
- findings: U-N1 Unclear: identifying documents
- citation: consistent; human review: false

## PASS 4. Contradiction with both sources linked (C037-X1, one-person narrative) (45.8s)
- ✓ every required check completed
- ✓ conflict finding cites the changed 2012 sentence and the form's entry date
- ✓ routed to human review
- ✓ citation not shown as plainly consistent
- findings: U-N1 Unclear: identifying documents; F-ENTRY-DATE Entry date differs from the form
- citation: needs_human_review; human review: true

## PASS 5. Ambiguous account routed to a person (C003-AMB) (38.8s)
- ✓ every required check completed
- ✓ human review required
- ✓ the border-crossing-card statement is named in a review finding, routing reason or routing item
- findings: R-TIME-MISMATCH Encounter time differs between form and narrative
- citation: needs_human_review; human review: true

## PASS 6. Multi-charge case (C001-MC) (35.2s)
- ✓ multi-charge rule fired
- ✓ human review required
- ✓ no charge chosen or suggested
- findings: R-MULTI-CHARGE Multiple charges selected; R-TIME-MISMATCH Encounter time differs between form and narrative; M-N5 Missing: specific ground stated and explained
- citation: needs_human_review; human review: true


## Earlier attempt on the same build (kept for the record)
The first verification run on `7efb231` failed two beats; this run (above) is the second and last.
- **Beat 1 with C045:** C045 now has a U-N1 identity-document observation, in this run and in the final evaluation, so it is no longer a "no findings" example. The demo uses C119 instead, which was clean in the final evaluation run.
- **Beat 5 (C003-AMB):** the S42 border-crossing-card statement was not named in any finding, reason or routing item in that live review. The result was not stored, so the cause could not be diagnosed. In this run it is routed with S42 named.
  - In the final evaluation, C003-AMB was detected through the within-account check, but only because its fact call timed out. With a successful fact call it is routed, not detected (see `eval/EVALUATION-closeout-7efb231.md`, "Robustness caveat").

Demo behaviour is illustrative. Live model output varies between runs.
