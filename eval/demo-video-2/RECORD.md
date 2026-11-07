# demo-video-2: second authorized live review on Production and the narrated walkthrough (2026-11-07)

**Scope (authorized by you):**
- one additional live review of a new **synthetic, fictional** case on https://project-7kvs7.vercel.app (Production, build `727e775`);
- a walkthrough video narrated in **your own recorded voice**.

**Not done:** no engine change, no tuning, no benchmark, no other review runs, no rehearsal against the live model, and no presentation changes. The previous video (`demo-video-1`) and your original audio are kept unchanged.

## Live review
**Case:** `U-faffb1cb41ac`, "SYNTHETIC DEMO – Grand Rapids visa overstay referral (fictional)". Interior encounter; charge INA 212(a)(6)(A)(i); two-page synthetic source PDF with the narrative on page 2.

| Item | Value |
|---|---|
| Review requests | **1**: one click, no retries; HTTP 200 |
| Completion | **complete**: no failed or unsupported checks |
| Model | ok: gpt-oss-20b, review-v1.4, 2 samples (both valid), facts-v2.0 |
| Calls | 3, all ok on the first attempt |
| Duration | **20.6 s** server-side (`latencyMs` 20637); 21.9 s from click to result in the browser |
| Saved | v1 (06:27:29Z). Survives reload; history shows v1 "Needs human review", 4 findings; the gap report matches |

**Planted errors** (in `LABELS.md`, last modified 06:24:32Z; the run started at 06:26:17Z):

| # | Planted | Result |
|---|---|---|
| P1 | Entry-place conflict: form "Miami International Airport", narrative "Orlando International Airport" | `I-1`, **model**, inconsistency, high. Only 1 of 2 samples reported it. The narrative sentence and the form field are both highlighted |
| P2 | Missing entry date: not in the narrative, blank on the form | `M-E1`, **model**, missing element, medium. Nothing to highlight |
| P3 | Charge 212(a)(6)(A)(i) contradicts an admitted B2 visitor | `C-1`, **rule-based** citation finding, high. Citation status "likely mismatch" |
| — | Noted before the run from the offline rehearsal: section named but not explained | `U-N5`, **rule-based**, unclear, low. Accurate |

- **Incorrect flags:** 0. Human review is required.
- **Checklist only, no finding:** the Elements checklist also lists "means and route of travel to the interior" as not stated. It was not planted.
- One run is a demonstration, not an accuracy measurement. The video makes no accuracy claim.

## Video
**File:** `~/Downloads/NarrativeCheck-demo-video-2/NarrativeCheck-walkthrough-U-faffb1cb41ac.mp4`

| Property | Value |
|---|---|
| Length and format | **132.6 s**, 1920×1080, 30 fps, H.264 + AAC |
| SHA-256 | `7ffa8a8be09b1b91f46e3dfbfc8638c636b7a5f5b8dba23b5b477a7a34eaff8e` |

**Narration:** your recording "NarrativeChecks Script.m4a" (151.1 s, kept unchanged).
- Long pauses were shortened to 0.6 s, with 10 ms fades at each cut.
- The volume was levelled from −30.8 to −17.1 LUFS (peak −1.5 dB).
- No words were removed, and there is no speed or pitch change: the reviewer correlated all 41 audio pieces at zero lag.
- Narration length: 131.5 s.

**Footage:** real frames from the live recording, placed under the matching words.
- There are no speed changes.
- Holds are frozen frames (the longest is 5.4 s).
- Two slow zooms on real captured frames: the charge field, and the fourth finding's card.
- The facts clip is shown before the context/charge clip so each appears as it is described.
- The only content cut is 9.7 s of the model wait, labelled; other cuts remove idle holds.

**On-screen notes (4):**
- the case is fictional;
- the file was set into Choose File by the recorder, and the system dialog is not shown;
- "Model wait shortened ⏩ actual review time 20.6 s (server) · status: complete";
- the print dialog was suppressed while recording, and the recorder saved the PDF with Chrome's print-to-PDF.

**Checks:**
- sync frames at every key spoken word;
- a 1-frame-per-3-seconds privacy scan;
- loudness, silences and cut-offs;
- a transcript comparison.

**Independent review:**
- First pass: **NEEDS CHANGES**. Two labels covered the content being described; "status: complete" ended before it was spoken; the charge was not on screen during "checks that charge"; and the transcript's first words needed correcting.
- All five were fixed by re-rendering.
- Re-check: **READY TO DELIVER**. Remaining note (accepted): because of the deliberate facts/charge reorder, the charge field is briefly visible already filled before it is shown being typed.
- Limits of the review: it could not listen (it used transcription and signal measurements), and it could not extract text from the PDFs (it checked them visually).

**Deliverables** (in `~/Downloads/NarrativeCheck-demo-video-2/`):
- the MP4;
- `narration-transcript-FINAL.txt`: exactly as spoken, with times. Includes "for the reference only" and "We have shortened"; "not explained" was heard by speech recognition as "no explain", and this is annotated;
- `NarrativeCheck-gap-report-U-faffb1cb41ac.pdf`;
- `synthetic-source-U-faffb1cb41ac.pdf`;
- `planted-errors-LABELS.md`;
- `narration-script-FINAL.md`: the script you read.

## Remaining issues
- The screen does not say which findings are rule-based and which come from the model; only the narration does (the source is under the collapsed "Technical details").
- Production storage now holds the synthetic cases `U-faffb1cb41ac`, `U-98df8507cc22` and `U-8095f1eee839`, which expire 30 days after their last change.
- Installed during this work: espeak-ng (Homebrew) and the Kokoro test environment in the scratchpad, from the voice search, which is no longer used. ffmpeg and whisper-cpp were installed earlier.
