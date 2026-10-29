/**
 * Build team test variants from eval/variants.json.
 *   eval/cases/<id>.json     runtime inputs (bases + variants). Contain no expected answers.
 *   eval/expected/<id>.json  expected findings, read only by the scorer.
 *   data/cases/<id>.json     copies of the variants listed under "demo", so they appear in the app.
 * Run: npx tsx scripts/build-variants.ts
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { splitSentences } from "../lib/text";
import type { CaseRecord, PageSpan } from "../lib/types";

type Op =
  | { op: "replace"; find: string; with: string }
  | { op: "insert_after"; find: string; text: string }
  | { op: "delete_sentence"; containing: string }
  | { op: "set_fact"; path: string; value: string; status: string }
  | { op: "set_charges"; charges: { citation: string; referenceId?: string }[] }
  | { op: "add_charge"; citation: string; referenceId?: string };

const spec = JSON.parse(readFileSync("eval/variants.json", "utf8"));
const base = (id: string) => JSON.parse(readFileSync(`data/cases/${id}.json`, "utf8")) as CaseRecord;

/** Replace text[a,b) and shift page spans so page references stay correct. */
function splice(c: CaseRecord, a: number, b: number, ins: string) {
  const t = c.narrative.text;
  const delta = ins.length - (b - a);
  c.narrative.text = t.slice(0, a) + ins + t.slice(b);
  c.narrative.pageSpans = c.narrative.pageSpans?.map((s): PageSpan => ({
    page: s.page,
    start: s.start >= b ? s.start + delta : s.start,
    end: s.end >= b ? s.end + delta : s.end > a ? Math.max(a, s.end + delta) : s.end,
  }));
}

function once(t: string, find: string, id: string) {
  const i = t.indexOf(find);
  if (i < 0 || t.indexOf(find, i + 1) >= 0) throw new Error(`${id}: "${find}" must occur exactly once`);
  return i;
}

function apply(c: CaseRecord, op: Op, id: string) {
  const t = c.narrative.text;
  switch (op.op) {
    case "replace": { const i = once(t, op.find, id); splice(c, i, i + op.find.length, op.with); break; }
    case "insert_after": { const i = once(t, op.find, id) + op.find.length; splice(c, i, i, op.text); break; }
    case "delete_sentence": {
      const hits = splitSentences(t).filter((s) => s.text.includes(op.containing));
      if (hits.length !== 1) throw new Error(`${id}: sentence containing "${op.containing}" found ${hits.length} times`);
      let end = hits[0].end; while (end < t.length && t[end] === " ") end++;
      splice(c, hits[0].start, end, "");
      break;
    }
    case "set_fact": {
      const f = c.facts.find((x) => x.path === op.path);
      if (!f) throw new Error(`${id}: no fact ${op.path}`);
      f.value = op.value; f.status = op.status as never; break;
    }
    case "set_charges": c.selectedCharges = op.charges.map((x) => ({ ...x, source: "team-assigned-for-testing", note: "Charge set by the team for this test variant." })); break;
    case "add_charge": c.selectedCharges.push({ citation: op.citation, referenceId: op.referenceId, source: "team-assigned-for-testing", note: "Second charge added by the team for this test variant." }); break;
  }
}

for (const d of ["eval/cases", "eval/expected"]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
for (const f of readdirSync("data/cases")) if (/^C\d{3}-/.test(f)) rmSync(`data/cases/${f}`);

const splitOf = (b: string) => (spec.splits.dev.includes(b) ? "dev" : "heldout");
let n = 0;
for (const b of [...spec.splits.dev, ...spec.splits.heldout]) {
  const c = base(b);
  writeFileSync(`eval/cases/${b}.json`, JSON.stringify({ ...c, split: splitOf(b) }, null, 2));
  writeFileSync(`eval/expected/${b}.json`, JSON.stringify({ id: b, base: b, split: splitOf(b), description: "Unmodified adapted public record. No planted issues. Findings here are unadjudicated observations.", plants: [] }, null, 2));
  n++;
}
for (const v of spec.variants) {
  const c = structuredClone(base(v.base));
  for (const op of v.ops as Op[]) apply(c, op, v.id);
  c.id = v.id;
  c.kind = "synthetic-variant";
  c.baseCaseId = v.base;
  c.split = splitOf(v.base);
  c.title = `${c.title} [test variant ${v.id.split("-")[1]}]`;
  c.provenance = { ...c.provenance, modifications: [v.description] };
  writeFileSync(`eval/cases/${v.id}.json`, JSON.stringify(c, null, 2));
  writeFileSync(`eval/expected/${v.id}.json`, JSON.stringify({ id: v.id, base: v.base, split: c.split, description: v.description, plants: v.plants }, null, 2));
  if (spec.demo.includes(v.id)) writeFileSync(`data/cases/${v.id}.json`, JSON.stringify({ ...c, split: "demo" }, null, 2));
  n++;
}
console.log(`built ${n} evaluation cases (${spec.variants.length} variants), demo copies: ${spec.demo.join(", ")}`);
