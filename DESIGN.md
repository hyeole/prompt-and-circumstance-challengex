# NarrativeCheck design rules (v2)

**Team:** Prompt & Circumstance.

**Starting points:**
- Color, type and spacing discipline from the IBM Carbon-based [DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/ibm/DESIGN.md) in VoltAgent's awesome-design-md collection.
- The interaction model of document-review tools such as Spellbook: the document in the middle, findings beside it, and evidence linked both ways.

We do not use either product's branding. We leave out marketing patterns and all drafting features.

## Principles
1. **The document is the focus.** The narrative is a white, highly readable page on a calm blue-grey workspace. Everything else supports reading it.
2. **Evidence before opinion.** Every finding shows where it came from (sentence and page, form field, or "not stated") before the reader acts.
3. **Never color alone.** Every highlight, badge and status has a text label and, for categories, an icon.
4. **Say what did not run, and what is not known.**
   - "Partial review", "Not checked" and "Unavailable" never look like a pass.
   - A populated field that records "unknown" is shown as *Recorded as unknown*, not as green "Present".
   - A charge that only fits one of two conflicting accounts is shown as *Needs human review*, not "Consistent".
5. **Calm by default.**
   - No decorative charts, invented scores, animated backgrounds or distracting imagery.
   - Motion is limited to a spinner dot and loading shimmer, both turned off when reduced motion is requested.

## Identity
- **Wordmark:** the "NC" mark (a teal-to-blue gradient tile) next to **Narrative**<span>**Check**</span>. "Check" is set in teal, with the tagline "Charge documentation review".
- **Credit:** "Built by Prompt & Circumstance" in the footer, "P&C" at the foot of the navigation rail, and the team name in every report footer.
- **Navigation rail:** 68px, navy gradient (#0f2240 → #08142a). Icon buttons with visible tooltips and aria-labels (Review workspace, Cases, References). The active item has a teal indicator bar.
- **Workspace background:** a very subtle blue-grey vertical gradient (#eef2f6 → #e6ebf1) with a faint inline-SVG grain at about 5% alpha. The document page stays pure white.

## Color tokens (`app/globals.css`)
| Token | Hex | Use |
|---|---|---|
| `--navy-900` | #0b1a30 | Rail, human-review summary card, report title |
| `--ink` / `--ink-2` / `--ink-3` | #18202e / #4a5568 / #6b7486 | Text. `--ink-3` is the lightest text color and still passes WCAG AA at the sizes used |
| `--teal` | #0e7c7b | **Main accent:** primary buttons, selected evidence, linked fields, active navigation |
| `--blue` | #2d5fd3 | Focus ring, citation category |
| `--warn` / `--warn-bg` | #8a5a00 / #fdf4e3 | **Amber, attention states only:** needs human review, partial review, outdated, partly unknown |
| `--line` | #dfe5ec | 1px hairlines |

**Finding categories.** Each has a soft tint, a 1.5px underline in the document, and an icon plus a label in the panel:
| Category | Color | Icon | Label |
|---|---|---|---|
| Inconsistency | #c0392b | warning triangle | Conflicts |
| Missing element | #6d4bc4 | document with minus | Missing |
| Unclear statement | #a86b00 | question mark | Unclear |
| Citation | #2d5fd3 | scales | Citation |
| Human review | #0e7c7b | person with check | Review |

**Field badges:** Present (green), Recorded as unknown / See narrative (slate), Partly unknown (amber), Redacted (dark slate), Absent (purple).

## Typography
- **Inter:** interface text.
- **Source Serif 4:** the narrative only, at 15.5px with a 1.78 line height. The serif page reads as "the document" and stays visually separate from the tool's own text.
- **IBM Plex Mono:** citations, case IDs, field paths, sentence IDs.

All three are free (SIL OFL). Header titles are 17px/600 and labels 11–12px.

## Layout
- **Desktop:** rail 68px | case facts 300px (collapsible to 52px) | document (flexible, page max 760px) | review panel 420px.
- **Under 1180px:** the columns stack.
- **Checked at 1280×800 and 1366×768:** no horizontal overflow, and each column scrolls on its own.
- **Header:** wordmark | breadcrumb (Cases › ID › type tag) and a **short title**, which opens a *Case details* panel with the full title, source pages, test edit and provenance | status pill | Run review | Export report.
- **Case facts:** grouped (Entry, Encounter, Subject, Status, History, Documents, Form). Technical field paths sit under "Details".
- **Review panel:**
  - Summary card: human-review status with reasons, finding counts by category, citation line, time and model.
  - Notes.
  - Tabs: Findings, Elements, Checks (with run details for each model request).
- **Finding card:** category icon tile, category label, severity badge, review badge, title, and a two-line preview. Expanding it shows the explanation, evidence chips ("S17 · p.53", "Form · p.51"), the human-review reason, Acknowledge / Dismiss with reason, and Technical details.

## States
| State | Treatment |
|---|---|
| Not reviewed | "Ready to review" card with a Run review button |
| Loading | Real elapsed seconds, skeleton tiles, and a note that no progress percentage exists |
| Reviewed | Green "Reviewed" pill, or amber "Needs human review" |
| Partial | Amber banner with the reason. Counts are labelled "rule-based checks only". The empty Findings state says "not a clean result" |
| Outdated | Amber banners in the canvas and panel, dimmed findings, highlights hidden, Export disabled |
| Error | Card with a Try again button. If an older review exists, a red strip says the findings shown are from the previous review |

## Interaction
- **Linking:**
  - Click a finding to highlight its evidence, scroll the document to it, and light up the linked form fields.
  - Click a highlight to select its finding. Overlapping highlights cycle on repeated clicks.
  - Highlights are focusable and open with Enter or Space.
- **Editing:**
  - Editing marks the review outdated, and a fresh review is required.
  - Dismissing a finding requires a reason and states that dismissal does not confirm a fix.

## Report (print)
- One US-letter page per case, with a navy title rule and a bold boxed human-review indicator.
- A boxed **PARTIAL REVIEW** notice appears when the model check did not complete.
- Contents: citation check, why a person should review, the required-elements table (with qualifiers), up to nine findings with evidence and pages, check statuses, versions and timing, and the disclaimer and team credit.
