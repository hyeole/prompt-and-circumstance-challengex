# Dataset v1 (as used by the internal held-out evaluation, commit ae55a38)

Exact copies of the evaluation definitions in force when run `2026-10-29T22-28-28` (internal held-out) was made.
Kept so that run can always be re-scored against the labels it was run with.

- `variants.json`: all variant definitions v1
- `C037-M3.case.json`, `C037-M3.expected.json`: the original C037-M3 input and expected label

## Change log
| Dataset version | Date | Change | Why |
|---|---|---|---|
| v1 | 2026-10-29 | initial 28 variants | |
| v2 | 2026-10-29 | C037-M3 also deletes "used the services of a local smuggler to help him safely cross the US/Mexico Border" | Error analysis of the internal held-out run showed that in v1 this sentence still implied the manner of entry, so the planted "missing manner" label was arguably wrong. Found by looking at held-out results, so v2 is a post-hoc correction. |
| v2 | 2026-10-29 | Human-review plants get a specific `reason` (multi_charge or ambiguity) and anchors | Scoring policy v2: generic routing is not counted as detection. Runtime inputs unchanged. |

The internal held-out run is scored against **v1 labels** for its headline number. A re-scoring against v2 labels is reported separately and marked post-hoc.
