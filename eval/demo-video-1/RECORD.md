# demo-video-1: one authorized live AI review on Production, and the demo video (2026-11-07)

**Scope (authorized by you):**
- one live review of a newly entered **synthetic, fictional** case on https://project-7kvs7.vercel.app (Production, build `727e775`), using the Production model configuration;
- a demo video made from that run.

**Not done:** no engine change, no tuning, no benchmark, no other review runs, and no presentation changes.

## Setup ($0, free tools only)
- **Recording:** Playwright (already in the project) drove a fresh Chrome profile and recorded only the page (1440×810). No browser bars, bookmarks, notifications or personal profile were captured.
- **Voice and editing:** voice-over with macOS `say` ("Samantha"). Editing with ffmpeg; label and card images rendered in Chrome.
- **Audio check:** whisper.cpp `base.en`, installed from Homebrew with its model from the official whisper.cpp source (checksum matched).
- **Judge unlock:** you typed the judge code in a separate, unrecorded Chrome window. Its session cookie went to a temporary file (mode 600), which was deleted straight after the run.
- **Rehearsal:** a full offline run on a local copy of the same code with **no model key**, so no model was called. It led to one change to the planted errors before the live run (see `LABELS`).

## Case and planted errors (fixed before the run)
Labels, case and source PDF were last modified at 05:32:57Z. The live run started at 05:36:47Z.

**Case:** "SYNTHETIC DEMO – Toledo traffic-stop referral (fictional)", interior encounter, INA 212(a)(6)(A)(i). Two-page synthetic source PDF, narrative on page 2.

| # | Planted | Result |
|---|---|---|
| P1 | Inconsistency: encounter date (form 03/14/2025 0715, narrative "March 15, 2025") | **Missed.** The consistency check completed with no findings |
| P2 | Inconsistency: citizenship (form GUATEMALA, narrative "Honduras") | **Missed** |
| P3 | Missing element E3, manner of last entry (not in the narrative, left blank on the form) | **Detected:** `M-E3`, source **model**, severity high. Checklist E3 "Not stated" |
| — | Pre-declared, not planted: INA section not cited (N5) | `M-N5`, source **rule**, low. Valid (the narrative contains no "INA"/"212") |

- **Incorrect flags:** 0.
- **Citation check:** `needs_human_review` ("no verified statement of the fact this charge depends on was found"). This is routing to a person, not an error flag; it is reasonable since the manner of entry is unstated.
- **Highlights:** both findings are missing elements (evidence kind `missing`), so there is no sentence highlight ("0 highlighted findings").

## Live review result (case `U-98df8507cc22`)
| Item | Value |
|---|---|
| Review requests | **1** (no retries; the script clicks once) |
| HTTP status | 200 |
| Completion | **complete**: no failed or unsupported checks |
| Model status | ok; `gpt-oss-20b`, `review-v1.4`, reasoning low, 2 samples (both valid), `facts-v2.0` |
| Model calls | facts, review-1, review-2: all ok, **1 attempt each**, real token counts |
| Duration | **14.8 s** server-side (`latencyMs` 14769); 15.9 s from click to response in the browser |
| Saved | version 1. After reload: "v1 of 1 · saved", same findings. History: v1 "Needs human review", 2 findings |
| Gap report | 1-page PDF; matches the saved review |

## Video
**File:** `~/Downloads/NarrativeCheck-demo-video/NarrativeCheck-demo.mp4`

| Property | Value |
|---|---|
| Length and format | **71.0 s**, 1920×1080, 30 fps, H.264 + AAC, about 8.1 MB |
| SHA-256 | `11c3bf76eea33b3dff37634772d9386e333de1db4e0784b44d01cf910838d76f` |
| Footage | Real footage from this run, in order, with no repeats |
| Cut | Only one: 12.2 s of the model wait, labelled "Model wait shortened ⏩ actual review time 14.8 s · status: complete" |
| Speed changes | Some segments play at 0.85–1.25×, disclosed on the title card |

**Covers:**
- new case with title and synthetic label;
- narrative, facts, context and charge;
- Choose File, narrative page 2, and opening the stored PDF;
- one Run review;
- findings, and the absence of highlights, with the reason;
- the Elements checklist;
- reload and history;
- the gap report and saving it as PDF.

**Disclosed on screen:**
- the system file dialog is not shown: the file was set into the field;
- the PDF is view-only and no text is extracted from it;
- the print dialog was suppressed while recording, and the recorder saved the PDF with Chrome's print-to-PDF.

**Narration:** English. Verified by transcription against the script. No accuracy claims; the end card states the result and the two misses.

**Other deliverables, in the same folder:**
- `NarrativeCheck-gap-report-U-98df8507cc22.pdf`
- `synthetic-demo-source.pdf`
- `voice-over-script.txt`
- `planted-errors-LABELS.md`

**Checks on the final file:**
- every second sampled: no credentials, judge code, cookies, login screens, notifications or personal content;
- loudness −16 dB mean, −1.5 dB peak;
- secret-pattern scan of the text files and PDFs: clean.

## Independent verification
**Reviewer:** a separate reviewer subagent with no credentials and no network access.

**Verdicts:**
- **Live check: VERIFIED WITH GAPS.** The only gap: that the site is the Production deployment of `727e775` cannot be confirmed offline. It is confirmed by `production-vercel-1`.
- **Video: READY TO DELIVER**, after the corrections below. No blockers.

**What the reviewer confirmed:**
- one request and a real model response, compared with the rehearsal's failed fixture-free run;
- results against the labels, and that M-N5 and the citation routing are fair;
- persistence;
- the cut contains only spinner frames;
- coverage, the absence of highlights, and no sensitive content.

**Corrections applied:**
- The transcript file now holds the exact voice-over script, not raw speech-recognition output.
- The print label now says the dialog was suppressed while recording.
- The speed changes are disclosed on the title card.
- The labels file was added to the deliverables.

**Known cosmetic issue:** the source PDF viewer's toolbar shows "about:blank", because the synthetic PDF has no title. Fixing it would need a new recording, so it was left.

## Limitations
- **One run is a demonstration, not an accuracy measurement.** It missed both planted conflicts (date and citizenship).
- The synthetic case `U-98df8507cc22` stays in Production storage under the recording's visitor and expires 30 days after its last change. The earlier smoke case `U-8095f1eee839` is also still there.
- Free tools installed with Homebrew remain on this computer: ffmpeg and whisper-cpp, plus the whisper model in the scratchpad.
