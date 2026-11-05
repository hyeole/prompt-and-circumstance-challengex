# ex-1: bounded event-extraction experiment (team-authored cases, locked before any engine output)

**What this is:** one bounded experiment comparing the measured baseline `74e15fb` with an event-attribution extraction
candidate built from it on `improve/event-extraction-1`. **Not** independent validation; not combined with any other set.

## Cases (locked in this commit, before the extraction change was coded and before any engine output on them)
- 20 **team-authored development cases** (no independently authored cases of this kind are available), written
  2026-11-04 by the team, with expected answers set from the source text and `config/references.json`:
  - 8 established issues (XE01–XE08): entry date (3), manner category (1), place (1), crossing mode (1), executed
    prior removal against NEGATIVE (2). Each has an explicitly designated subject or only one person of interest.
  - 8 negative controls (XN01–XN08): first vs last entry, a companion's entry, a denied crossing, a relative's
    deportation, two admissions, month precision, travel inside Mexico, entry into Mexico.
  - 4 unresolved (XU01–XU04): several people with no designation of the subject, including a statement matching the
    form's date in full (identity is never inferred from matching values) and a role ("the driver") never tied to the subject.
- Multi-event narratives with varied wording. Files: `build-cases.py`, `cases/`, `expected/`, `checks.json`;
  anchors verified by `check-labels.ts` (all resolve to one sentence).
- Scorer: `score-ex1.ts` (the diag-2 check scorer, paths changed only). It reports checks; every finding and
  explanation is adjudicated by hand against the source, including extras in passing cases.

## Run (to be frozen in a later commit before any call)
- Two frozen builds: baseline `74e15fb` and the candidate commit; identical model and settings (`gpt-oss-20b`, low
  reasoning, 2 review samples, 55 s timeout, 1 retry, same stages).
- 20 cases × 2 engines = 40 reviews, each once, sequential; engine order alternates per case (odd cases baseline first).
- Budget: normally 120 model requests; hard maximum 240 attempts. Stop after 2 consecutive HTTP/server errors or 3
  consecutive reviews in which every model call failed. No reruns; no edits after live outputs are seen.

## Acceptance (fixed now)
The candidate is accepted only if, on these 20 cases, it has additional source-supported detections and **no**
additional incorrect findings, **no** lost established detection and **no** reduced completion compared with the
baseline. Otherwise the experiment is preserved and the measured baseline is retained.
