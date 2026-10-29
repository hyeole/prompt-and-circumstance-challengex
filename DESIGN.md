# NarrativeCheck design rules

Our own rules for the review workspace. They adapt the color, type and spacing approach in the IBM Carbon-based
[DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/ibm/DESIGN.md) from VoltAgent's
awesome-design-md collection, and borrow the interaction model (document in the middle, findings beside it) from
document-review tools such as Spellbook. We do not use either product's branding, and we leave out marketing
patterns (display type, hero bands, inverse footers) and any drafting features.

## Principles
1. **The document comes first.** The narrative sits on a white page with generous line height. Everything else supports reading it.
2. **Evidence before opinion.** Each finding shows where it came from (sentence, form field, or missing element) before the reader acts on it.
3. **Never color alone.** Every highlight and status has a text label or icon too.
4. **Say what did not run.** "Unavailable", "Partial" and "Not checked" look different from "No findings".
5. **Calm by default.** No decorative animation, gradients, or dashboards. The only motion is a spinner while waiting, and it slows down when reduced motion is requested.

## Color tokens (`app/globals.css`)
| Token | Hex | Use |
|---|---|---|
| `--text` | #161616 | Body and headings |
| `--text-2` | #525252 | Secondary text |
| `--text-3` | #6f6f6f | Captions and meta. We use #6f6f6f instead of IBM's #8c8c8c so small text still passes WCAG AA |
| `--surface` | #ffffff | Document page, side panels |
| `--bg` | #f4f4f4 | Surrounding app surface |
| `--border` | #e0e0e0 | 1px hairlines |
| `--accent` | #0f62fe | Primary actions, focus, selected finding |
| `--accent-hover` | #0050e6 | Primary hover |

Finding categories (tinted background plus a 2px underline, always paired with a label chip):

| Category | Line color | Label |
|---|---|---|
| Missing element | #8a3ffc purple | "Missing" |
| Inconsistency | #da1e28 red | "Conflict" |
| Unclear statement | #f1c21b yellow | "Unclear" |
| Citation | #0043ce blue | "Citation" |
| Human review | #009d9a teal | "Review" |

Redactions appear as small dark chips reading "redacted" or "unreadable". This keeps them from looking like officer text or like findings.

## Typography
- **IBM Plex Sans** for the interface. **IBM Plex Serif** for the narrative only, because a serif page reads as "the document" and keeps it visually separate from the tool's own text. **IBM Plex Mono** for citations, field paths and IDs. All three are free (SIL OFL).
- Sizes: narrative 15.5px with 1.75 line height. Interface body 14px. Labels and meta 12px. Document title 18px/500. No display sizes.

## Spacing and shape
- 4px grid: 4, 8, 12, 16, 24, 32.
- **Deviation:** IBM uses square corners. We use a 4px radius on controls and cards because it reads softer in a dense review panel. Chips are pill-shaped.
- No elevation except a faint shadow under the document page, to separate the paper from the gray surface.

## Layout
- Desktop: three columns. Case facts 300px (collapsible to 44px), document flexible with a 760px page width, findings 400px.
- Under 1100px the columns stack.
- Top bar: product name, case selector, case-type tag, status pill, Run review, Export report.
- Footer: a one-line disclaimer, and "Built by Prompt & Circumstance".

## Interaction
- Click a finding to expand it, highlight its evidence, and scroll the document to it. Click a highlight to select its finding. Overlapping highlights cycle on repeated clicks.
- Linked form fields light up in the facts panel when their finding is selected.
- When the narrative, facts, or charge are edited, findings dim, are labelled "Outdated", and highlights are hidden until a fresh review runs. Export is disabled while outdated.
- Dismissing a finding requires a reason. The record says dismissal does not confirm the issue is fixed.

## Accessibility
- Visible 2px blue focus outline on every interactive element.
- Highlights are focusable and open with Enter or Space. Each has an aria-label naming its category and finding.
- The status pill uses `role="status"`, and errors use `role="alert"`.
- Text contrast meets WCAG AA.
