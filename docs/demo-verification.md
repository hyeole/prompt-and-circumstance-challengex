# Demo verification

Live reviews against http://localhost:3000 on 2026-10-29T23:50:21.950Z (commit-level code as running). Every demo beat must pass before the video is recorded.

## PASS 1. Complete case (C037) (14.4s)
- ✓ model check completed
- ✓ no findings
- ✓ no human-review trigger
- ✓ citation consistent
- findings: none
- citation: consistent; human review: false

## PASS 2. Missing detail (C012-M2) (8.3s)
- ✓ model check completed
- ✓ place of entry (E2) reported absent
- ✓ missing finding has no invented text span
- findings: M-E2 Missing: place of last entry
- citation: consistent; human review: false

## PASS 3. Officer correction + fresh review (C012-M2 edited) (9.8s)
- ✓ model check completed
- ✓ place of entry no longer missing
- findings: none
- citation: consistent; human review: false

## PASS 4. Contradiction with both sources linked (C012-X1) (10.0s)
- ✓ model check completed
- ✓ conflict finding cites the tourist-visa sentence and another source
- ✓ routed to human review
- ✓ citation not shown as plainly consistent
- findings: F-ENTRY-MANNER Conflicting accounts of how the subject entered
- citation: needs_human_review; human review: true

## PASS 5. Ambiguous account routed to a person (C003-AMB) (19.9s)
- ✓ model check completed
- ✓ human review required
- ✓ a review-marked finding cites the border-crossing-card statement
- findings: R-TIME-MISMATCH Encounter time differs between form and narrative; F-ENTRY-MANNER Conflicting accounts of how the subject entered
- citation: needs_human_review; human review: true

## PASS 6. Multi-charge case (C001-MC) (10.0s)
- ✓ multi-charge rule fired
- ✓ human review required
- ✓ no charge chosen or suggested
- findings: R-MULTI-CHARGE Multiple charges selected; R-TIME-MISMATCH Encounter time differs between form and narrative
- citation: needs_human_review; human review: true

