// The sentence splitter exactly as it was at df11086 (lib/text.ts), kept only to rebuild the sentence IDs of saved
// results that predate the stored "sentences" field. Not used by the app.
import type { Sentence, PageSpan } from "../lib/types";

const ABBREV = /\b(?:U\.S|Mr|Mrs|Ms|Dr|St|No|Jr|Sr|Inc|approx|vs|e\.g|i\.e|a\.m|p\.m|Ave|Rd|Hwy|Mt|Ft|Co)\.$/i;
const SINGLE_INITIAL = /(?:^|\s)[A-Z]\.$/;

/**
 * Split a narrative into sentences with stable character offsets.
 * Headings (ALL CAPS lines ending in ":") become their own segments.
 * The original text is never altered: offsets always index the exact reviewed string.
 */
export function legacySplitSentences(text: string, pageSpans?: PageSpan[]): Sentence[] {
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

