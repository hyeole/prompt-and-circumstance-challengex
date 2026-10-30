# Round 3 measured evaluation: frozen configuration

This record is written **before** the run. The evaluated build is the commit that contains this file (tag `rc-round3`). Nothing below changes until all four runs have finished.

## Code
| Item | Value |
|---|---|
| Evaluated server code | `3655aa9` = `1b5f59b` (evaluated round-2 candidate) + `033a102` (P1/P2) + `ccc60d7` (round-3 fixes) + `b66a8cc` (multi-person detection) + `3655aa9` (variant fixes). This commit adds only this document |
| Server code changed since `1b5f59b` | `lib/review/facts.ts`, `lib/review/review.ts`, `lib/review/rules.ts` |
| Baseline (accepted deliverable) | `7efb231` (tag `rc-closeout`), delivery `49a12be`. Unchanged |
| Earlier candidate | `1b5f59b` (tag `rc-round2`). Unchanged |

## Model and run settings
| Item | Value |
|---|---|
| Endpoint and model | Sponsor endpoint (default base URL in `lib/llm.ts`), `gpt-oss-20b` |
| Reasoning effort, response format | low, `json_object` |
| Review samples; grace after the first sample | 2; 12 s |
| Client timeout, retries | 55,000 ms, 1 |
| Fact extraction prompt, budget | `facts-v2.0`, 55 s |
| Review prompt | `review-v1.4` |
| References | `team-provisional-2026-10-31.1` (team provisional, not sponsor-verified) |
| Environment overrides | Only `CHALLENGEX_API_KEY` is set in `.env.local`, so every other setting is the code default above. The key is never printed or recorded |
| Concurrency | 1 (as in every earlier evaluation) |
| Runner | `scripts/run-eval.ts --split all --concurrency 1`, against `npm run build && npm start` |

All of these are unchanged since `1b5f59b`: the scoring scripts, references, review prompt, model client settings, datasets and expected labels.

## Datasets and scoring (fingerprints: SHA-256 of the concatenated JSON files, first 16 hex characters)
| Item | Files | Fingerprint |
|---|---|---|
| `eval/dev-synthetic` (12 cases) | 24 | `a1a0d4dff91950d9` |
| `eval/fresh` (28 cases) | 68 | `48f2f3ca7b42fa87` |
| `eval/cases` (legacy, 37) | 37 | `8278d27fe5a25033` |
| `eval/expected` (legacy labels) | 37 | `4dfc7aec1d3aeebc` |
| `eval/gen-v1` (12; locked before round 2; **not independently held out**) | 25 | `cb19c34e4e13cc0e` |
| `scripts/score-eval.ts` / `score-match.ts` / `finding-key.ts` (v2.4) | | `96c40b35b5be688d` / `105776984f7ce5f1` / `cc7e12d95f83fb25` |
| `eval/adjudications.json` / claim v2 migration (before this run) | | `84df9cf18b980f08` / `13db3784fb694383` |

## Plan
- Each of the 77 existing cases runs once, and each of the 12 gen-v1 cases runs once.
- No restarts of completed cases, and no reruns.
- Scoring uses v2.4 with both adjudication layers.
- New findings are adjudicated against the source evidence; labels and scoring are not changed.
- Partial-review credit that exists only through the round-3 provenance correction (`scripts/diag-provenance-credit.ts`) is reported separately from new detections.

## Known limitation, documented and not fixed
`describesUsEntry` (the extraction-completeness guard) recognises "entered the United States" but **not** "entered the U.S." or "entered the US":
- "He entered the U.S. on June 9, 2011." → not recognised;
- "He entered the United States on June 9, 2011." → recognised.

A valid but empty extraction for a narrative that uses only the abbreviation is therefore accepted as complete. The guard does not cover every wording, and no claim is made that it does.
