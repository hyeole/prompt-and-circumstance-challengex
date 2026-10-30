# Alignment with Unissant's guidance

## What the sponsor said (2026-10-30)
The full text is preserved in [`config/sponsor/unissant-guidance-2026-10-30.json`](../config/sponsor/unissant-guidance-2026-10-30.json).

- **Test cases.** Teams may create their own test cases. The redacted CBP PDF is guidance on how narratives are written.
- **References.** Unissant will **not** provide a plain-English charge reference sheet or a required-elements checklist.
- **Guidance table.** Unissant supplied a "Core elements to cover" table with six categories (S1–S6). We treat it as **contextual guidance**: what a narrative should establish *where applicable*, not a rule that every detail must appear in every case.

Three kinds of reference material are kept apart, in the app and in these docs:

| Kind | Where | Status |
|---|---|---|
| Sponsor guidance | `config/sponsor/…` (the six categories, verbatim) | From Unissant. The citations shown in the table ("ecfr", "cbp+1") were not followed by the team |
| Team implementation choices | `config/references.json`: checklist items, applicability rules, form-code glossary | Ours. Provisional and not sponsor-approved |
| Supplementary statutory summaries | `config/references.json` → `charges` | Team paraphrases of public Title 8 text. **Not** sponsor-approved, not legal advice |

## Case contexts
The table mixes contexts, so each checklist item says where it applies:
- **Interior encounter:** found inside the U.S., for example by Border Patrol. All 37 legacy cases are this context.
- **Port of entry:** an application for admission at a port.
- **Expedited removal:** processing under the expedited-removal regulation. It may overlap the other two.

A case's context comes from the case data (`context`), or is inferred from narrative wording. If it cannot be determined, items that depend on it are reported as **applicability unclear**, never as missing.

## Traceability: checklist v1 (legacy, E1–E7) vs. Unissant categories

| Sponsor category | v1 checks | Evidence required | Legacy test cases | Gap found 2026-10-30 |
|---|---|---|---|---|
| S1 Identity and claimed status | E5 citizenship (form or narrative). Redacted names are unavailable | Form field or a narrative sentence | none planted | Identifying documents; claimed status/classification; status at entry not used |
| S2 Encounter and application for admission | E1–E3 entry, E4 encounter, E7 travel (advisory), encounter-time rule | Form fields; narrative sentences; both sources for conflicts | M2, M3 (missing place/manner), X1 (dates) | No context; port, documents presented and purpose of travel not modelled |
| S3 Facts developed during inspection | E6 basis; consistency issues; fact comparisons; code-side attribution | Exact quotes; two sources for conflicts | X1, AMB | Source of key facts (traveler statement vs officer finding) not checked |
| S4 Specific ground | Citation check of the officer-selected charge (model + requirement rules) | Verified evidence for a mismatch | CIT (7), MC (5) | Whether the narrative states the section and subsection and explains how the facts meet it |
| S5 Traveler's explanation or response | none (conflicts are routed to a person) | none | none | Explanations that resolve conflicts; expedited-removal advisal and opportunity to respond |
| S6 Disposition and procedural record | none | none | none | Action taken and documenting form; supervisory review and service |

## Checklist v2 (team-provisional-2026-10-31)
See `config/references.json` → `checklistV2`. It is a new version: legacy runs keep their v1 definitions and are never re-scored as v2.

| Item | Category | Applies in | If not found |
|---|---|---|---|
| C1 Citizenship or alienage | S1 | all | missing |
| C2 Identifying documents (or a statement that there are none) | S1 | all | missing (low) |
| C3 Status or classification claimed at entry or admission | S1 | port of entry: applies. Interior: covered by the status-at-entry field if recorded | missing (port of entry) / not applicable |
| C4 Encounter: date, time, place, how located | S2 | interior | missing |
| C5 Entry: date or time, place, manner | S2 | interior | missing (each part) |
| C6 Application for admission: port, documents presented, purpose of travel | S2 | port of entry | not applicable elsewhere |
| C7 Basis: lack of status or documents | S3 | all | missing |
| C8 Source of key facts named (traveler said / officer observed / records showed) | S3 | all | unclear (low) |
| C9 Specific ground stated with explanation | S4 | all | the officer-selected charge is still checked; missing ground statement is low severity |
| C10 Traveler's explanation or response to a conflict | S5 | only when a conflict is found; expedited removal: advisal and opportunity to respond | not applicable when there is no conflict |
| C11 Disposition and documenting form | S6 | all | missing (medium) |
| C12 Supervisory review, service or acknowledgment | S6 | expedited removal | applicability unclear elsewhere |
| C13 Travel to the interior | S2 | interior | advisory only (unchanged from E7) |

Form fields and narrative statements stay distinct. An item covered only by a form field shows "From the form". An item covered by a field recorded as unknown shows "Documented as unknown".

## Test-data plan
- **Legacy benchmark (unchanged):** 37 cases, `eval/variants.json` dataset v2, all historical runs and scores.
- **Development set (new, labelled synthetic):** `eval/dev-synthetic/`. Covers S1–S6 across the three contexts and includes clean cases. Every case records its provenance, intended edit, expected findings, evidence and applicability.
- **Fresh independent evaluation (new, separate):** `eval/fresh/`. Unused source incidents or independently written scenarios that are not rewrites of dev cases. Answers are written and reviewed before any run, ambiguous labels are recorded before the run, and everything is frozen before use. Reported as an internal evaluation.
