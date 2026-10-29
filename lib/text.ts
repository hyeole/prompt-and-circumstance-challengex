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
 * Find a quote inside a sentence and return absolute offsets in the narrative, or null.
 * Fallback: the model sometimes drops or rewords a redaction tag inside a quote. Then the longest run of consecutive
 * quoted words found in the sentence is used, if it covers at least half of the quote (and 4+ words), so evidence
 * still points only at real text.
 */
export function locateQuote(sentence: Sentence, quote: string): { start: number; end: number } | null {
  const exact = locateExact(sentence, quote);
  if (exact) return exact;
  const words = quote.replace(/\[[^\]]*\]?/g, " ").split(/\s+/).filter(Boolean);
  const total = quote.split(/\s+/).filter(Boolean).length;
  for (let len = words.length; len >= Math.max(4, Math.ceil(total / 2)); len--)
    for (let i = 0; i + len <= words.length; i++) {
      const hit = locateExact(sentence, words.slice(i, i + len).join(" "));
      if (hit) return hit;
    }
  return null;
}

function locateExact(sentence: Sentence, quote: string): { start: number; end: number } | null {
  const q = normalizeForMatch(quote);
  if (q.length < 3) return null;
  // Build a normalized copy of the sentence with an index map back to the original offsets.
  const src = sentence.text;
  let norm = "";
  const map: number[] = [];
  let lastSpace = true;
  for (let i = 0; i < src.length; i++) {
    let c = src[i];
    if (/\s/.test(c)) {
      if (lastSpace) continue;
      c = " ";
      lastSpace = true;
    } else {
      lastSpace = false;
      c = c.replace(/[‘’]/, "'").replace(/[“”]/, '"').toLowerCase();
    }
    norm += c;
    map.push(i);
  }
  const idx = norm.indexOf(q);
  if (idx < 0) return null;
  const s = map[idx];
  const e = map[idx + q.length - 1] + 1;
  return { start: sentence.start + s, end: sentence.start + e };
}
