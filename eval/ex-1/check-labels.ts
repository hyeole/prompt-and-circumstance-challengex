// Locked label check for ex-1: every anchor appears verbatim in exactly one sentence of its case. Run before any engine output.
//   npx tsx --conditions=react-server eval/ex-1/check-labels.ts
import { readFileSync } from "node:fs";
import { splitSentences } from "../../lib/text";
const checks = JSON.parse(readFileSync("eval/ex-1/checks.json", "utf8")) as Record<string, { checks: { anchor?: string }[] }>;
let bad = 0;
for (const [id, spec] of Object.entries(checks)) {
  const c = JSON.parse(readFileSync(`eval/ex-1/cases/${id}.json`, "utf8"));
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
  for (const k of spec.checks) if (k.anchor) {
    const hits = ss.filter((s) => s.text.includes(k.anchor!));
    if (hits.length !== 1) { bad++; console.log(id, "anchor in", hits.length, "sentences:", k.anchor); }
    else console.log(id, hits[0].id, "ok");
  }
}
console.log(bad ? `${bad} problems` : "all anchors resolve to one sentence");
process.exit(bad ? 1 : 0);
