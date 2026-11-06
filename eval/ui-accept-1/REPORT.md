# ui-accept-1: end-to-end browser acceptance check of NarrativeCheck (d062b1d → dc239ab)

**Result:** **pass, with one wording defect fixed and one known limitation.**
- **Every workflow passes:** intake, editing, charges, review states, routing, evidence, decisions, history, reports
  and isolation.
- **Fixed:** one demonstrated UI defect, a wrong partial-review message (`dc239ab`).
- **Unresolved, not fixed:** the review workspace is **unreadable at phone width** (desktop tool; a fix would be a
  responsive redesign).

## How it was run (no hosted-model calls)
**App:**
- **Build:** the production build of `d062b1d`, later `dc239ab` with the fix, from a clean tree. BUILD_IDs
  `GEBczFgK2OrwRJtYdvKIJ`, then `603gzxsUWn--tVzGg9uNo`.
- **Settings:** `CHALLENGEX_API_KEY` set to a non-secret placeholder; `CHALLENGEX_BASE_URL` pointing at a local
  fixture endpoint; an isolated store (`NC_STORE_DIR` = `eval/ui-accept-1/store`). No real key was linked or used.

**The fixture endpoint** (`fixture-endpoint.ts`): **it replays recorded outputs; it does not perform analysis.**
- **What it answers with:** an OpenAI-compatible endpoint answering with the **recorded outputs of the d062b1d
  benchmark run** (measure-d062b1d, 2026-11-06): the saved fact extraction and the saved review rebuilt with the
  existing `reconstruct()`.
- **How it matches:** on every sentence of the narrative and, for review prompts, on the officer-selected charge.
  A narrative or charge with no recording gets HTTP 503, never an invented answer.
- **Runtime modes:** `slow`, `fail-all`, `fail-facts` and `stall` show the app's loading, failure, partial and cancel
  states.
- **Logging:** every request is logged (case, prompt kind, charge text found, outcome) in `fixture-requests.jsonl`.

**Screenshot labelling:**
- **What the results are:** recorded outputs replayed offline, not live analysis.
- **What the screen says:** the app shows its configured model name ("gpt-oss-20b") and timings of about 0.3 s. Both
  come from the replay setup.

**Fixture defect found and corrected during the check (mine, not the app's):**
- **What happened:** my first C012-X1 review was answered with **C012-M2's** recording. The variants share most
  sentences, and the first version matched on only three sample sentences.
- **Correction:** matching now uses every sentence plus the charge. `matcher-selfcheck.ts` confirms correct matches
  for C001/C001-MC, C003/C003-AMB, C012/C012-M2/C012-X1 and C119.
- **Remaining overlap:** C001's fact prompt is byte-identical to C001-MC's, so either recording answers it.
- **Affected result:** C012-X1 version 1 in the test store came from the mis-match. It is **not** used as evidence.
  C012-X1 was re-run as version 2, which is correct.

## Pass/fail checklist
| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Narrative input (typed/pasted, origin label, exact text, `[REDACTED]` chips) | **Pass** | 17, 18 |
| 2 | Source-PDF upload (stored for viewing only; served back; nothing read from it) | **Pass** | PDF route 200, 412 bytes; preview text |
| 3 | Structured-fact entry with status per field (recorded / not recorded / redacted / unreadable / n.a.) | **Pass** | 17, 18 |
| 4 | Editing facts, charge or narrative marks the review **Outdated**, hides highlights, and **disables Report**; "Discard edits" offered | **Pass** | 14 |
| 5 | Officer-selected charge reaches the review (request log shows the exact charge text, including an edited one and two charges) | **Pass** | `fixture-requests.jsonl`; 9, 15 |
| 6 | Loading state: elapsed timer, honest note (no fake progress), Cancel, editing disabled | **Pass** | 3 |
| 7 | Cancel: "Review cancelled. Nothing was saved"; no history written | **Pass** | 13; store has no C037 file |
| 8 | Normal result ("No findings"; routed for a real time discrepancy) | **Pass** | 4 |
| 9 | Failed review (every call HTTP 500): "Review incomplete", banner naming each check, charge "Not checked", only rule findings | **Pass** | 10 |
| 10 | Partial review (fact extraction only failed): marked incomplete and routed | **Pass after fix** | 11 (before), 12 (after) |
| 11 | Unrecorded input (new case): honest failure, not an invented result | **Pass** | 19 |
| 12 | Empty states (empty workspace; "No findings"; empty partial card) | **Pass** (partial card wording fixed) | 1, 4, 12 |
| 13 | Finding categories (Conflicts / Missing / Citation / Unclear counts; category and severity kickers) | **Pass** | 6, 8 |
| 14 | Exact evidence navigation: clicking a finding scrolls to and highlights the exact sentences; card shows "Exact quote", page, attribution status | **Pass** | 5, 8 |
| 15 | Ambiguity routing (C003-AMB: a person must decide which account is correct and whose it is) | **Pass** | 7 |
| 16 | Multi-charge routing (C001-MC: "Multiple charges are selected"; both charges reach the review) | **Pass** | 9 |
| 17 | Report export matches the screen (version, routing, charge verdict, findings and evidence, completion; partial reports say PARTIAL) | **Pass** | 16; C135 report text |
| 18 | Officer decisions: Dismiss without a note refused; Acknowledge saved with a timestamp; pending count updates (7 → 6); the finding itself unchanged | **Pass** | 8, 20 |
| 19 | Case creation (preview before saving; nothing saved until confirmed) | **Pass** | 17, 18 |
| 20 | Reopening and version history (immutable versions; compare: new / persisting / resolved; per-version reports) | **Pass** | history page text |
| 21 | Isolation: each case keeps its own status and versions; variants and the base case are independent; the entered case is separate; the cancelled case stays unreviewed | **Pass** | case list text; 20 |
| 22 | No misleading accuracy or confidence claims; "consistent" is "Consistent with facts", never approval; "Decision support only… not legal determinations" on every page and report | **Pass** | UI text grep; footer; report footer |
| 23 | No broken routes or console errors (all pages 200; unknown case 404; no console errors) | **Pass** | route sweep |
| 24 | Readable at laptop sizes (1280×800, 1366×768: no horizontal overflow) | **Pass** | 21 |
| 25 | Readable at phone width (375 px) | **Fail (unresolved)** | 22 |

## The change (`dc239ab`, `components/FindingsPanel.tsx` only; 6 lines)
**Defect (shown in 11):** for **every** partial review the findings panel said "Findings from completed checks only.
The model checks did not run", and its empty-state card said "…but the model checks did not run".
- **Why it misleads:** with only fact extraction failed (C021), both review samples **had** run and supplied the charge
  verdict, so the sentence was false. It would lead a reviewer to distrust results that did run.

**Fix:** both places now name the checks that actually did not complete, from the same completion data the
partial-review banner already uses:
- "Not completed: fact extraction." (C021);
- "Not completed: model review, fact extraction, citation check." (C135, U001).

**Scope:** no engine, detection, prompt, setting, scoring or layout change.

**Checks:**
- **Tests:** 484/484 (`suite.txt`); `tsc --noEmit` clean.
- **Build:** production build clean (`build.txt`).
- **Re-verified in the browser** on the rebuilt app (screenshot 12).

## Unresolved
- **Phone-width layout** (22): at 375 px the three-column review workspace overlaps and the header is clipped. The app
  is designed and checked for desktop. Making it responsive is a redesign, which is outside this step.
- **Display of model metadata under the fixture:** the screen shows the configured model name, and the very short
  latencies come from the replay. In live use these reflect the real endpoint. Not a defect, but **these screenshots
  must not be shown as live analysis**.
- **Not exercised:** the hosted model itself (by design); the PDF page viewer inside a finding for built-in cases (no
  source PDF is configured for them, and the PDF route returns 404 as intended); printing to paper (the print button
  opens the browser's print dialog).

## Files
- **Fixtures:** `fixture-endpoint.ts`, `matcher-selfcheck.ts`.
- **Logs:** `fixture-requests.jsonl`, `suite.txt`, `build.txt`.
- **Screenshots:** `screenshots/` (22, labelled).
- **Test store:** `store/` (isolated; disposable test data, including the invalid C012-X1 v1).
