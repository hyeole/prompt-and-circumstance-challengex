import { createHash } from "node:crypto";
import type { Sentence, PageSpan } from "./types";

export const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

/** Matches normalized redaction tokens such as "[REDACTED (b)(6), (b)(7)(C)]". */
export const REDACTION_RE = /\[REDACTED[^\]]*\]/g;

const ABBREV = /\b(?:U\.S|Mr|Mrs|Ms|Dr|St|No|Jr|Sr|Inc|approx|vs|e\.g|i\.e|a\.m|p\.m|Ave|Rd|Hwy|Mt|Ft|Co)\.$/i;
const SINGLE_INITIAL = /(?:^|\s)[A-Z]\.$/;

/**
 * Split a narrative into sentences with stable character offsets.
 * Headings (ALL CAPS lines ending in ":") become their own segments.
 * The original text is never altered: offsets always index the exact reviewed string.
 */
export function splitSentences(text: string, pageSpans?: PageSpan[]): Sentence[] {
  const out: Sentence[] = [];
  const push = (start: number, end: number) => {
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;
    if (end <= start) return;
    const page = pageSpans?.find((p) => start >= p.start && start < p.end)?.page;
    out.push({ id: `S${out.length + 1}`, start, end, text: text.slice(start, end), page });
  };
  // paragraph boundaries
  const paraRe = /\n\s*\n|\n(?=[A-Z][A-Z /&]+:)/g;
  let paraStart = 0;
  const paras: [number, number][] = [];
  for (const m of text.matchAll(paraRe)) {
    paras.push([paraStart, m.index!]);
    paraStart = m.index! + m[0].length;
  }
  paras.push([paraStart, text.length]);

  for (const [ps, pe] of paras) {
    let segStart = ps;
    // heading line, e.g. "TRAVEL:" at the start of a paragraph
    const head = /^\s*([A-Z][A-Z /&]+:)/.exec(text.slice(ps, pe));
    if (head) {
      const hEnd = ps + head.index + head[0].length;
      push(ps, hEnd);
      segStart = hEnd;
    }
    for (let i = segStart; i < pe; i++) {
      const ch = text[i];
      if (ch !== "." && ch !== "?" && ch !== "!") continue;
      const before = text.slice(Math.max(segStart, i - 12), i + 1);
      if (ABBREV.test(before) || SINGLE_INITIAL.test(before)) continue;
      const next = text.slice(i + 1, i + 3);
      if (i + 1 < pe && !/^\s/.test(next)) continue; // decimal, "1,339.00", etc.
      push(segStart, i + 1);
      segStart = i + 1;
    }
    push(segStart, pe);
  }
  return out;
}

/** Whitespace/quote-insensitive comparison used to verify model-quoted evidence. */
export function normalizeForMatch(s: string) {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Redaction markers in any form the model may write them ("[REDACTED]", "[REDACTED (b)(6), (b)(7)(C)]",
 * "(b)(6), (b)(7)(C)", "(b) (7)(E)", "REDACTED", "[UNREADABLE]") are compared as one canonical marker.
 */
const MARKER_RE = /\[\s*(?:REDACTED|UNREADABLE)[^\]]*\]|\(b\)\s*\(\d\)(?:\s*\([A-Z]\))?(?:\s*,\s*\(b\)\s*\(\d\)(?:\s*\([A-Z]\))?)*|\bREDACTED\b|\bUNREADABLE\b/gi;
const MARK = "\u0000"; // single canonical character for a redaction marker

/** Canonical view of a string with a map from each canonical character back to the original [start, end). */
function canonical(src: string) {
  let norm = "";
  const map: { s: number; e: number }[] = [];
  let lastSpace = true;
  let i = 0;
  MARKER_RE.lastIndex = 0;
  const markers = [...src.matchAll(MARKER_RE)].map((m) => ({ s: m.index!, e: m.index! + m[0].length }));
  let mi = 0;
  while (i < src.length) {
    if (mi < markers.length && markers[mi].s === i) {
      if (!lastSpace) { norm += " "; map.push({ s: i, e: i }); }
      norm += MARK; map.push(markers[mi]);
      norm += " "; map.push({ s: markers[mi].e, e: markers[mi].e });
      lastSpace = true;
      i = markers[mi].e; mi++;
      continue;
    }
    let c = src[i];
    if (/\s/.test(c)) {
      if (!lastSpace) { norm += " "; map.push({ s: i, e: i + 1 }); lastSpace = true; }
    } else {
      c = c.replace(/[‘’]/, "'").replace(/[“”]/, '"').toLowerCase();
      norm += c; map.push({ s: i, e: i + 1 }); lastSpace = false;
    }
    i++;
  }
  return { norm, map };
}

const canonicalQuote = (q: string) => canonical(q).norm.trim();

export type QuoteMatch = { start: number; end: number; match: "exact" | "partial" };

/**
 * Exact match after normalizing whitespace, quote marks, case, and redaction markers.
 * Offsets are into the narrative; the caller displays narrative.slice(start, end), i.e. the source text.
 */
export function locateQuote(sentence: Sentence, quote: string): QuoteMatch | null {
  const q = canonicalQuote(quote);
  if (q.replace(new RegExp(MARK, "g"), "").trim().length < 3) return null;
  const { norm, map } = canonical(sentence.text);
  const idx = norm.indexOf(q);
  if (idx < 0) return null;
  return { start: sentence.start + map[idx].s, end: sentence.start + map[idx + q.length - 1].e, match: "exact" };
}

/**
 * Partial match, used ONLY by the fact comparison: the longest run of the quote's words found in the sentence,
 * accepted only if that source fragment itself contains every material fact in `mustContain` (for example the year
 * being compared). Returned as match "partial" and never presented as exact verification.
 */
export function locatePartial(sentence: Sentence, quote: string, mustContain: string[]): QuoteMatch | null {
  const exact = locateQuote(sentence, quote);
  if (exact) return exact;
  if (!mustContain.length) return null;
  const words = canonicalQuote(quote).split(" ").filter((w) => w && w !== MARK);
  for (let len = words.length; len >= 4; len--)
    for (let i = 0; i + len <= words.length; i++) {
      const hit = locateQuote(sentence, words.slice(i, i + len).join(" "));
      if (!hit) continue;
      const text = sentence.text.slice(hit.start - sentence.start, hit.end - sentence.start);
      if (mustContain.every((m) => text.includes(m))) return { ...hit, match: "partial" };
    }
  return null;
}
