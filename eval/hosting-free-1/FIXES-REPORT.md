# hosting-free-1 fixes: the three blockers from the independent review of 5474b34

**Fix commit:** `641ec0f` (13 files, +579/−123). The diff is `git diff 5474b34..641ec0f -- lib app tests`.

**Evidence:** this file and the run outputs next to it, committed separately.

**What was not done:**
- no accounts, purchases, hosted-model calls, benchmark runs, push or deployment;
- no change to `lib/review`, `data` or `scripts`: the engine diff from `28ece07` is 0 lines;
- no change to prompts, model settings, labels, scorers, results or the mobile fix.

## Before and after, route level
**Setup:** two app instances sharing one Valkey store through the Upstash-REST shim, and the offline fixture endpoint. Each request reviews a sample case with `save: true`.

**Settings:** `NC_MAX_INFLIGHT=2`, `NC_RL_JUDGE_PER_HOUR=8`.

**Runs:** `fix-check.ts` against a demo build of `5474b34` (temporary detached worktree) and of `641ec0f`. Outputs: `fix-check-before-5474b34.json`, `fix-check-after.json`.

| Check | Before (5474b34) | After (641ec0f) |
|---|---|---|
| **1a.** Five simultaneous requests with **one request id**, plus one with another id | 5 reviews ran (15 fixture model calls) and **5 versions were saved** from the one id, exceeding the in-flight cap of 2 | **1 execution per id**: the 4 copies got 409 `conflict`. 2 reviews ran in total (6 calls), 2 versions saved |
| **1b.** The same id on instance A, then on B; the owner cancels after A saved | 0 leases existed while B was running; the cancel reply was "saved v1". In this run B was then cancelled; in the reviewer's run B saved v2 after the cancel | B is refused at start (409 `conflict`) and never runs. 1 version saved |
| **2.** A 3.5 MB extra field in the case, saved 5 times (12 MB visitor limit) | 4 saved; visitor bytes **14,092,088** (stored hash 14.16 MB) | All **413** before parsing. 0 bytes stored, 0 versions |
| **3.** 11 reviews from one judge (hourly limit 8), each saving | 8 saved, 3 refused, but **11** save-quota units used | 8 saved, 3 refused, **8** save-quota units used. Review allowance used: 8 |
| **Cancel route** (32 cancels, one visitor) | 32× 200, not metered | 30× 200, then 2× **429**. Metered (595 commands counted) |

**Unit level:** `tests/hosting-fixes.test.ts` has 13 tests. All **13 fail on `5474b34`** (`fixes-before-5474b34.txt`) and all **13 pass on `641ec0f`**:
- **Behavioural failures (10):** they fail on the old code with "Missing expected rejection" or wrong counts or values.
- **Missing modules (3):** these exercise modules that `5474b34` does not have. They fail on it with module-not-found or "not a function".
- **On real Valkey:** the 9 storage-dependent tests also pass on Valkey through the shim (`kv-contract-valkey.txt`: 38/38 together with the contract tests).

## Full checks on 641ec0f
| Check | Result |
|---|---|
| `tsc --noEmit` | Clean |
| Full test suite | **518/518** (`suite.txt`) |
| Contract and regression tests on Valkey 9.1.3 | **38/38** |
| The original end-to-end checks (two instances, daily cap 6, in-flight 2) | **28/28** (`e2e-output.txt`) |
| Production builds, local-tool and public-demo | Both clean (`build.txt`, `build-demo.txt`) |

**The 28 end-to-end checks include no regressions in:**
- visitor isolation;
- judge access: no code, a copied cookie, wrong codes, the attempt limit;
- cross-instance cancellation;
- fail-closed outages;
- upload limits;
- 429/503 messages;
- retention.

## What changed
1. **Duplicate request ids:**
   - **Claim (`lib/kvScripts.ts` CLAIM_REQUEST):** one atomic claim per request id, recorded as `"<visitor>|run"`, kept for 24 h. A second execution of a claimed, running or completed id is refused.
   - **Early cancel:** a cancel that arrives first claims the id as `"<visitor>|pre"`, so that visitor's request finds itself cancelled (409) and no other visitor can take the id.
   - **Admission (ADMIT_REVIEW):** refuses a second lease for the same request.
   - **Save (SAVE_VERSION):** refuses a second save of the same request.
2. **Oversized versions:**
   - **Bounded body:** the review body is read with a **200 KB** bound before parsing (`lib/reviewInput.ts readBodyLimited`).
   - **Supported fields only:** only the narrative (text, page spans), form fields and selected charges, each with its known properties, are taken from the client. Id, title, kind, provenance and context come from the server's record.
   - **Engine input unchanged:** a test confirms that every sample and benchmark case passes the strict schema unchanged.
   - **Byte check at save:** bytes beyond the admission reservation (snapshot ×2 + 80 KB) are checked against the visitor and global byte limits **inside the save script**. When either would be exceeded, nothing is saved.
3. **Refused reviews consuming quota:**
   - **One admission:** the review allowance and the save capacity are admitted in **one** script, all or nothing.
   - **Refund:** save capacity reserved for a review that saved nothing (cancelled, failed, or refused at save) is refunded.

**Limited corrections:**
- **Cancellation:** metered and rate-limited, 30 per 10 minutes per IP and per visitor. Cancelling your own request needs no judge session.
- **Metering:** the judge checks in the review and PDF routes now run inside the storage budget, and failed accounting writes are logged.
- **Placeholder values refused:** the `.env.example` placeholders are refused as the visitor secret or judge code. On Vercel, the offline test values in `local-test.env` are refused too.

## Monthly accounting: approximate, not a hard cap
This corrects `REPORT.md` §2.4, which said the budget "stops requests" at 8 GB and 400K commands. The budget is checked before each request and usage is added afterwards, so:
- **Concurrency overshoot:** requests already in flight when it runs out all complete. The review measured 33% overshoot with 60 parallel requests against a 200-command test budget.
- **Uncounted commands:** the single check command of a refused request, and failed accounting writes, are not counted.
- **Script weight:** a script is counted as 10 commands, because Upstash does not document how it counts them.
- **The hard stop:** Upstash Free's own limits. The app's budget keeps normal use well below them.

## Remaining, not changed here
- **Reservation size:** at ~92 KB per sample-case version against ~21 KB actually stored, the reservation over-counts. The global byte allowance is therefore used up sooner than the stored data alone would require. This is safe in direction; returning the difference after a save is a possible later refinement.
- **Hosting checks:** the items that need the real hosting environment are unchanged (see `REPORT.md` §4).
