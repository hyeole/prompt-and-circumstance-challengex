# Routing reasons that survive a withheld claim; fact-call timeouts (post-tuning, after d95d075)

This is a source change with offline tests only. **No evaluation batch was run for it**, and the change has not been measured live. Labels, adjudications and scores are unchanged.

## 1. Routing reasons that outlive their claim

### What was found
Routing reasons come from six places:
- rules;
- kept findings;
- routed accounts;
- the citation check;
- partial completion;
- the model's own top-level `human_review.reasons`.

Only the last source was added without checking it against what the code had withheld. In the targeted verification (`TARGETED-VERIFICATION-d95d075.md`), three cases were routed by such reasons after the claim behind them had been withheld:

| Case | Withheld claim, and why | Model reason that still routed |
|---|---|---|
| C012 | "Entry manner conflict": the cited statement and PWA (AFOOT) are the same manner of entry | "Entry manner conflict between form and narrative"; "Potential impact on charge determination" |
| F036 | "Entry date and place mismatch": unattributed, against a form date recorded as unknown, so no account was routed. Also "Entry place mismatch": the cited sentence is about entry into another country | "Conflicting entry date and place information"; "Need to resolve which source is accurate for charge determination" |
| F055 | "Entry facts mismatch": the manner part misreads PWA, and the form's date and place are unknown, so nothing supported remains | "Conflicting entry date, place, and manner between narrative and form fields; need to determine which is accurate for charge determination" |

### Change (`lib/review/review.ts`, `modelRoutingReasons`)
**Shown invalid.** A withheld claim counts as *shown invalid* only when it was withheld because:
- the cited sentence is about entry into another country;
- the cited statement is the same manner category as the form, with nothing supported left;
- it is unattributed, against form values that are all unknown (no account to route);
- the time cited is a call or request time, not the encounter time;
- the claim relies on values its own evidence does not contain.

**Not shown invalid.** These withheld claims still leave their reasons in place:
- an unverifiable quote;
- a single source;
- a charge-fit statement;
- an unattributable account against a known value. That account is routed, which is genuine attribution uncertainty.

**When a model reason is removed.** All of these must hold:
- it describes a conflict;
- every fact it names (entry date, place, manner, encounter time, history) was the subject of an invalid withheld claim;
- no kept finding or routed account is about that fact;
- it does not refer to a person, subject or attribution.

**Generic follow-ons** ("which source is accurate", "impact on charge determination") are removed only when no conflict reason, finding or account remains at all.

**Kept as written:** every other reason, including multiple charges and anything about who a statement belongs to. Each removal is listed under "discarded" with the reason text, so it stays auditable.

### Tests (175 pass)
**Positive** (each fails without the change):
- the C012 pattern (manner plus follow-on);
- the F036 pattern (unknown date and place plus follow-on);
- the C012-M2 pattern (request time).

**Negative controls:**
- F010-X: genuine attribution uncertainty keeps the model's reason, and its account is still routed;
- independent reasons are kept: multiple charges, a reason naming a subject, and a fact (time) that was never withheld;
- a claim withheld only for an unverifiable quote keeps its reason;
- the generic follow-on stays while a real conflict finding remains.

### Expected effect, not measured
- C012 and F036 would no longer be routed by these reasons. F036 would still be routed only if the model raised something else.
- **F055 would still be routed.** Its citation reason ("The record states the core fact this charge depends on, but the model raised a concern …") comes from the citation check, not from a withheld claim, and this change deliberately leaves the citation check alone.
- The model's citation concern there rests on the same PWA misreading. That is a separate question for review.

## 2. Fact-call timeouts: diagnostics and hypotheses (no setting changed)

### What the saved results show
- **Each timeout was a single attempt that used the whole 55 s fact budget.** There was no retry, HTTP error or network error:
  - targeted run: C003, C013;
  - checkpoint: C013-CIT.
- **The same case varies widely between runs, even when the output is about the same length:**

  | Case | Fact call, checkpoint | Fact call, targeted run |
  |---|---|---|
  | C012-MC | 44 s, 666 characters | 18 s, 632 characters |
  | C003 | 15 s, 650 characters | timeout |
  | C013 | 28 s, 2,511 characters | timeout |
  | C013-CIT | timeout | 27 s, 2,368 characters |

- **Output length still correlates with duration across cases** (r 0.62–0.81 earlier). But C003's timeout came on a case whose checkpoint output was short.
- **In C013's timed-out run, one review sample was also slow** (cancelled at 19 s, where the checkpoint took 15 s and 23 s).
- **Calls are non-streaming, and a failed call records no output length or token usage.** The data therefore can't tell an endpoint delay (queueing) apart from an unusually long generation.

### Hypotheses (not established)
1. **Endpoint latency or queueing** varies over time. Supported by the same-case variance at similar output length, and by C013's slow review sample in the same run.
2. **Occasional long generation**, including hidden reasoning tokens, on some attempts. Consistent with the length correlation. Not testable from the saved data, because failed calls record no usage.
3. **Input length.** Weak: C013 (5,570 characters) completed in other runs.

### Diagnostics that would separate these (proposed; not done)
- Record `usage` (completion and reasoning tokens) for every successful call, and the time to first token if streaming is enabled.
- A fixed-case timing measurement: the same few cases repeated at different times. This needs your approval, because it calls the model.
