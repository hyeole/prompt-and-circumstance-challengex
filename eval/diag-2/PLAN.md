# diag-2: fresh bounded diagnostic of 44a1dae (team-authored development cases; NOT independent or unbiased validation)

**Purpose:** find remaining reasoning failures on cases that none of the fixes were written against.

**What this is not:**
- an accuracy measurement;
- independent validation;
- part of the historical 54-issue benchmark.

The datasets are never combined, and no overall percentage or target achievement will be claimed. Nothing is tuned after the results.

**Authorship and its limits:**
- **No independent cases exist.** The repository has none. The sponsor's guidance says teams create their own test cases, using the sample narratives as a guide to how narratives are written.
- **These 30 cases are team-authored:** written on 2026-11-04 by the same development effort, before any engine output on them existed. The authors know the engine's recent fixes, so the set may share their blind spots.
- **Mitigation:**
  - realistic narratives of varied length (104 to 317 words) and wording;
  - paraphrases ("removal flight", "coyote", "INE voter card", "gap in the border fence") rather than the regression tests' wording;
  - mixed-event context (earlier entries, entry into Mexico, later rides, companions, jail bookings, unrelated warrants).
- **Expected answers** come from the source text and `config/references.json`, not from what the engine recognises.

**Cases (30):**
- **12 established issues (EG01 to EG12):**
  - manner conflicts: category (EG01) and mode (EG02);
  - NEGATIVE-record conflicts: a completed removal (EG03), a prior apprehension and return (EG04);
  - entry-date conflicts: pronoun-linked (EG05), designated subject among three (EG06);
  - an entry-place conflict (EG07);
  - citation mismatches:
    - **EG08:** 8 U.S.C. 1326, where the removal order was **explicitly never executed** and the records show no removal;
    - **EG09:** a B1/B2 admission under 212(a)(6)(A)(i);
    - **EG10:** never admitted under 237(a)(1)(B);
  - missing elements: manner (EG11), disposition (EG12).
- **10 negative controls (NC01 to NC10):**
  - coyote assistance with EWI AFOOT;
  - a B2 overstay with a NEGATIVE record;
  - an **explicitly executed** order under 1326;
  - an identity-document paraphrase;
  - a statute citation inside a sentence;
  - a corrected entry year;
  - current removal proceedings;
  - an entry into Mexico before the U.S. entry;
  - a same-manner paraphrase;
  - a complete long case.
- **8 genuinely unresolved (UN01 to UN08):**
  - **UN01:** an order whose execution is **expressly unknown**;
  - **UN02:** an order plus an unrelated arrest warrant executed;
  - **UN03:** a relative's "he was deported";
  - **UN04:** two redacted men with different years;
  - **UN05:** two unexplained accounts by the same subject;
  - **UN06:** a redacted man's visa admission against EWI;
  - **UN07:** "one of them had been ordered removed";
  - **UN08:** a dated history list with no removal, under 1326.
- **Removal orders are not all unresolved:** explicitly never executed is a mismatch (EG08), executed is supported (NC03), and execution unknown is unresolved (UN01, UN02, UN07).

**Locked before any engine output** (`LOCK.json`, SHA-256, committed before the first call):
- the builder;
- the cases, expected answers and checks;
- the label checker;
- the scorer (`score-diag2.ts`: the diag-1 checks plus `noElementFlag`);
- this plan and the driver.

**Disputed expectations:** recorded additively in a separate file after the run. Cases, expected answers and checks are never edited.

**Engine and run:**
- **Engine:** `44a1dae`, frozen, built once. The driver checks the clean server tree and BUILD_ID before any call.
- **Settings:** unchanged: `gpt-oss-20b`, low reasoning, 2 samples, `facts-v2.0`, `review-v1.4`, references `team-provisional-2026-10-31.1`, existing timeout and retry limits.
- **Order:** 30 reviews, each case once, in ID order, concurrency 1, no reruns, no source edits.
- **Budget:** normally 90 model requests, **hard maximum 180 attempts**.
- **Stop rules:** 2 consecutive HTTP/server errors, or 3 consecutive reviews in which every model call failed.

**Afterwards:**
- Raw outputs (findings, extractions, calls, failures, timings) are preserved.
- Every finding is adjudicated against the source, including extra flags in cases that pass their checks.
- Reported separately: established-issue detections, false findings, negative controls, unresolved routing, completion and latency.
