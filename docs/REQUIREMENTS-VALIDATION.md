# Requirements to validation

**Sources:**
- Unissant use-case deck (`reference-materials/…GenAI-Assisted Gap Analysis….pptx`, slides 2–6; kept local);
- the Unissant guidance reply of 2026-10-30 (`config/sponsor/unissant-guidance-2026-10-30.json`);
- the student quickstart.

Each row says where it comes from and how it is validated.

## Explicit sponsor requirements and targets
| # | Requirement (source) | How it is validated | Current status (build `7efb231`) |
|---|---|---|---|
| R1 | Point out what is **missing, inconsistent or unclear**, tied to the sentence or field it came from (deck s3, s5) | Planted missing-element and inconsistency plants. Every finding's evidence is checked against the source offsets | Missing elements 16/16; inconsistencies 8/17; evidence quotes match the source 100% |
| R2 | **Check the officer-selected charge** (Title 8 / INA) against the narrative facts and the I-213/I-44 structure; flag likely mismatches with a plain-language reason (deck s3, s5) | Citation plants; the citation check's verdict and its verified evidence | Citation 9/11 |
| R3 | **Never write the narrative or pick the charge**; the officer stays in charge (deck s3, s4, s5) | `stripChargeAdvice` tests; no narrative rewriting anywhere; officer decisions stored apart from output | Enforced by tests |
| R4 | **Ambiguous or multi-charge cases go to a person**, 100% (deck s4, s6) | Multi-charge and ambiguity plants | Multi-charge 6/6. Ambiguity 3/4 under strict scoring (the 4th is routed with the statement named but has no finding) |
| R5 | Outputs: a **gap report** and a **citation check**, with a plain-language reason for every flag; a **one-page gap report** per case (deck s4, s5) | `tools/verify_reports.py`: one page, every finding's evidence reference shown, partial notice when due | 77/77 reports pass |
| R6 | Catch **≥90% of planted gaps and citation errors** (deck s6) | Strict detection under scoring v2.4 | 78% (42/54), **not met** |
| R7 | **No more than 1 in 10 flags wrong** (deck s6) | Hand-adjudicated incorrect flags (claim-aware and original-record layers) | 2/100 and 4/100, **met** |
| R8 | Each review **under 60 seconds** (deck s6) | End-to-end latency per case | Max 55 s, **met**. 2/77 partial reviews from fact-call timeouts |
| R9 | **Every flag points to the exact sentence or field** (deck s6) | Evidence validity | 100% |
| R10 | Narrative elements per the **"Core elements to cover"** table, which is guidance and contextual, not a universal checklist (guidance 2026-10-30) | Checklist v2 items map to S1–S6; context-dependent items are not applicable outside their context | Implemented; see `docs/SPONSOR-ALIGNMENT.md` |
| R11 | Test data is synthetic, and **teams may create their own test cases**; the public PDF is guidance on how narratives are written (deck s5; guidance) | Team-made datasets with locked labels | dev-synthetic, fresh-v1, legacy |
| R12 | Key handling: https, exact model name, key from an environment variable, never in the repository (quickstart) | Server-side only; secret scans before every push | Enforced |

## Our implementation choices (not sponsor requirements)
- **Charge references:** `config/references.json` (`team-provisional-2026-10-31.1`) holds team paraphrases of public statutory text. They are **not sponsor-verified**: Unissant said it will not provide a charge reference sheet. They are labelled provisional everywhere they are shown.
- **Attribution:** in multi-person narratives with redacted names, a statement counts against this subject only when attributable to them. Otherwise it is routed with the statement named, and no contradiction is claimed.
- **Completion:** a review is *partial* when any required check does not run (model review, fact extraction, element outputs, citation check), and is reported as partial, never as "no findings".
- **Scoring:** policy v2.4 (strict matching of the planted fact and event), with a claim-aware adjudication layer and manual adjudication of every non-planted flag. A routing item is not counted as detection.
- **Model:** `gpt-oss-20b`, reasoning effort low, 2 review samples, separate fact extraction, 55 s budget.

## Requirements that remain unclear
- **Unissant's own test set.** The deck says Unissant provides synthetic narratives, an answer key and a reference sheet; the 2026-10-30 reply says teams create their own test cases. Whether Unissant will score submissions on a hidden set is not stated.
- **What counts as "catching" an ambiguous case:** routing it to a person, or a finding that names the conflict. Our scoring uses the stricter reading.
- **Whose account counts.** For statements whose person cannot be identified in a redacted multi-person narrative, the deck's "send ambiguous fact patterns to human review" supports routing. Whether such a routing counts toward the 90% detection target is not stated.
- **How "false alarms" are counted:** for example, whether real documentation gaps outside the planted issue (identity-document observations) count. We count them as flags and report them separately.
- **The required elements for each charge.** Without a sponsor reference sheet, charge-specific elements are team provisional.
