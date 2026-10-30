# Attribution packet and label questions, re-examined against the records (reliability closeout)

**Inputs:**
- `ATTRIBUTION-REVIEW-PACKET-4b10d72.md`: the 14 attribution-limited misses at checkpoint `4b10d72`;
- `LABEL-REVIEW-2026-10-30.md`: the questions about expected labels.

Each case was re-read against its case file. **No label is changed.** Alternative readings are measured only in the separate sensitivity analysis, after the final evaluation.

## Confirmed implementation defects (fixed in the closeout, defect D)
In each of these, the planted statement continues the account of the single person introduced in the sentence before it. The continuing sentence's first reference to a person is "he". The two statements contradict each other. The earlier code had no notion of one person's continuous account, so it could only route the planted statement as unattributable to the form.

That routing is still correct for the *form* comparison. It missed the contradiction *within the narrative*. The new check (`accountConflicts`) reports such a contradiction:
- as a conflict within one account;
- with the explicit statement that the account is not established as this subject's;
- with no comparison to the form;
- routed to a person.

| Plant | Account | Contradiction |
|---|---|---|
| C003-AMB ×2 | S41 → S42 ("He later told agents…") | S41: crossed illegally at age five. S42: entered at the Nogales port with a border crossing card |
| F055-A ×2 | S3 → S4 ("During a later interview, he stated…") | S3: crossed the Rio Grande illegally. S4: entered through the Hidalgo port with a border crossing card |
| C012-X1 | S17 → S18 ("He stated…") | S17: flew into Chicago on a tourist visa. S18: did not cross through a port of entry and was not inspected or admitted |

**Controls (offline replay over all 77 cases in the three datasets):**
- the check produces exactly these three findings;
- it produces none on any unplanted base case or should-not-flag control.

The check was designed after inspecting these cases, so any credit for them is post-tuning.

## Genuinely unresolved evidence (routing remains the honest outcome)
| Plant | Why the record does not resolve it |
|---|---|
| F010-X | S34 itself says the person crossed "with eight other individuals", so the shared date cannot single out this subject. No other statement by the same account gives a date |
| F039-X | S3 ("February of 2004") has no continuing account with another date. S6, a group crossing, comes after an unrelated sentence |
| F075-X, F075-H | S22 and S16 to S21 name only a redacted person. S24, a different redacted person's group entry into El Paso, shares the place. Both subjects are Mexican |
| C001-X1 | S23 says the crossing was "with three other individuals". Only the manner matches the form |
| C013-X1 | The removal sentences name only a redacted person. All three people travelling together are Nicaraguan, and S29/S30 follow a different sentence |
| C045-X1 | S30 and S35 begin with separate redaction markers. Identical markers are not taken to identify one person, so they are not one continuous account. Whether they are the same person cannot be established |

**What did not resolve these:** section headings ("ENTRY:"), nationality and identical redaction markers were examined and are not used as proof of identity, per the review instruction.

The removal of the document-wide group-entry veto (defect D) does not link any of them. Each is blocked by its own sentence's group wording, by another account sharing the matched facts, or by fewer than two matching form facts.

## Questionable expected labels (unchanged; sensitivity analysis only)
| Case | Question |
|---|---|
| C119-AMB (inconsistency plant) | S15 says the person *first* entered by walking across the border. The form records the *last* entry (2004, by air), and S26 agrees with the form. A first entry without inspection does not contradict a later admission, so the plant's premise is doubtful. The ambiguity-routing plant is not in question |
| C045-X1 | The label treats S35 as this subject's. The record gives two separately introduced redacted persons |
| F051-C | Its own label note says routing is defensible: the removal belongs to an unidentified group member |
| C119-CIT | "POSITIVE - See Narrative" with no removal described. A mismatch cannot be established, so routing is the defensible outcome |
| F055-H | The label note says a finding citing the field counts. Policy v2.3/v2.4 requires a field-only finding to name the planted value, and the plant has no anchor |
