# diag-1: fresh bounded diagnostic of df11086 (team-authored development cases; NOT an evaluation)

**Purpose:** find substantive reasoning failures worth implementing. This is not an accuracy measurement and not independent validation; it is kept separate from the historical 54-issue benchmark. No overall percentage and no target achievement will be claimed. No tuning after the results.

**Cases (20, written and locked before any engine output on them was inspected):**
- **10 established issues (DG01–DG10):** each expected finding is stated in the source about this subject.
  - **DG01:** a pronoun-linked entry date.
  - **DG02:** a last entry without inspection, while the form records an earlier visa entry's manner.
  - **DG03:** an explicit negation of admission under INA 237(a)(1)(B).
  - **DG04:** an explicit completed removal against a NEGATIVE record.
  - **DG05:** a missing manner of entry (E3).
  - **DG06:** a missing disposition (N7).
  - **DG07:** an explicit no-removal record and denial under 8 U.S.C. 1326.
  - **DG08:** an explicit B2 admission under INA 212(a)(6)(A)(i).
  - **DG09:** a designated subject among three people.
  - **DG10:** a place-of-entry conflict.
- **6 matched negative controls (DN01–DN06):**
  - **DN01:** DG01 with the date agreeing.
  - **DN02:** DG02 with the form agreeing.
  - **DN03:** explicit negations consistent with the charge and record.
  - **DN04:** current removal proceedings, not a prior removal.
  - **DN05:** an explained correction of the entry year.
  - **DN06:** a complete case in paraphrased wording.
- **4 genuinely unresolved (DU01–DU04):**
  - **DU01:** two redacted people with different entry years.
  - **DU02:** a relayed "he was deported" with two possible referents.
  - **DU03:** a removal order without documented execution, under 8 U.S.C. 1326.
  - **DU04:** two unexplained accounts of the same entry, with the form's manner UNKNOWN.

**Coverage:** cross-sentence attribution, multiple entries and corrections, negation, removal versus processing, missing required information, and selected-charge requirements.

**What the labels are not:** team-authored development cases, not independent validation. Expected answers were checked against `config/references.json` (`check-labels.py`). Absence of evidence is kept distinct from explicit contradiction (DG05, DU03).

**Locked before the run:** cases, expected answers (`expected/`), scoring checks (`checks.json`, `score-diag.ts`), this plan, the builder, the label checker and the driver (`LOCK.json`, SHA-256).

**Engine and run:**
- **Engine:** `df11086`, frozen, with the build mapping verified (server code = `df11086`, BUILD_ID recorded).
- **Settings:** unchanged model settings and retry limits.
- **Order:** each case once, sequentially, concurrency 1, no reruns.
- **Budget:** 20 reviews, normally 60 model requests, **hard maximum 120 attempts**.
- **Stop rules:** 2 consecutive HTTP/server errors, or 3 consecutive reviews in which every model call failed.

**Afterwards:**
- Raw outputs (including extractions, failures and timing) are preserved.
- Every finding is adjudicated against the source, including extra flags in cases that otherwise pass.
- Reported separately: source-supported detections, incorrect flags, unresolved routing, and completion.
