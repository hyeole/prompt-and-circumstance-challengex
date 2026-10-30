// Claim support: an exact quote proves the text exists, not that it supports the claim. A claim that relies on a
// specific date, year or clock time must find that value in the evidence it cites.

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Dates (as m/d/yyyy), years, and 24-hour times (hhmm) mentioned in a text. */
export function temporalTokens(text: string) {
  const dates = new Set<string>();
  const years = new Set<string>();
  const times = new Set<string>();
  for (const m of text.matchAll(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/g)) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    dates.add(`${+m[1]}/${+m[2]}/${y}`);
    years.add(y);
  }
  for (const m of text.matchAll(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi)) {
    dates.add(`${MONTHS.indexOf(m[1].toLowerCase()) + 1}/${+m[2]}/${m[3]}`);
    years.add(m[3]);
  }
  for (const m of text.matchAll(/\b(19|20)\d{2}\b/g)) years.add(m[0]);
  for (const m of text.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)) times.add(`${m[1].padStart(2, "0")}${m[2]}`);
  for (const m of text.matchAll(/\b([01]\d|2[0-3])([0-5]\d)\b(?!\/)/g)) times.add(`${m[1]}${m[2]}`);
  return { dates, years, times };
}

/**
 * Returns the claimed values that do not appear in the evidence (empty when supported).
 * Only dates and clock times are checked strictly; a year counts as supported if any evidence mentions it.
 */
export function unsupportedValues(claim: string, evidenceTexts: string[]): string[] {
  const c = temporalTokens(claim);
  const e = temporalTokens(evidenceTexts.join(" \n "));
  const missing: string[] = [];
  for (const d of c.dates) if (!e.dates.has(d)) missing.push(d);
  for (const y of c.years) if (![...c.dates].some((d) => d.endsWith(y)) && !e.years.has(y)) missing.push(y);
  // Times written with a colon in the claim ("09:50") must match a time in the evidence ("0950").
  for (const m of claim.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)) {
    const t = `${m[1].padStart(2, "0")}${m[2]}`;
    if (!e.times.has(t)) missing.push(m[0]);
  }
  return missing;
}
