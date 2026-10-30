// Evidence packet for attribution-limited misses at checkpoint 4b10d72 (for independent review).
// Reads the case, its expected label and the checkpoint's raw output. Writes nothing except stdout.
import { readFileSync } from "node:fs";
import { splitSentences } from "../lib/text";
import { attribution } from "../lib/review/facts";

const CASES: [string, string, string][] = [
  ["F010-X", "eval/fresh", "2026-10-30T07-21-02"], ["F039-X", "eval/fresh", "2026-10-30T07-21-02"], ["F055-A", "eval/fresh", "2026-10-30T07-21-02"],
  ["F075-H", "eval/fresh", "2026-10-30T07-21-02"], ["F075-X", "eval/fresh", "2026-10-30T07-21-02"],
  ["C001-X1", "eval", "2026-10-30T07-32-13"], ["C003-AMB", "eval", "2026-10-30T07-32-13"], ["C012-X1", "eval", "2026-10-30T07-32-13"],
  ["C013-X1", "eval", "2026-10-30T07-32-13"], ["C045-X1", "eval", "2026-10-30T07-32-13"], ["C119-AMB", "eval", "2026-10-30T07-32-13"],
];
const GROUP = /\b(subjects|individuals|passengers|occupants|companions?|together|group|with (one|two|three|four|five|six|seven|eight|nine|\d+) other|(two|three|four|five|six|both) (subjects|individuals|people|persons|men|women|passengers|occupants|aliens)|all (subjects|three|four|five)|both of them)\b/i;
const ENTRYISH = /\b(entered|crossed|cross|entry|walked across|arrived|came to the United States|flew|flying|port of entry|removed|deported|removal|voluntary return|previously arrested)\b/i;
for (const [id, ds, run] of CASES) {
  const c = JSON.parse(readFileSync(`${ds === "eval" ? "eval/cases" : `${ds}/cases`}/${id}.json`, "utf8"));
  const e = JSON.parse(readFileSync(`${ds}/expected/${id}.json`, "utf8"));
  const r = JSON.parse(readFileSync(`eval/runs/${run}/raw/${id}.json`, "utf8"));
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
  const anchors: string[] = (e.planted ?? e.plants ?? []).flatMap((p: { anchors?: string[] }) => p.anchors ?? []);
  const planted = ss.filter((s) => anchors.some((a) => s.text.includes(a)));
  console.log(`\n### ${id}  (checkpoint run ${run})`);
  console.log(`plants: ${JSON.stringify((e.planted ?? e.plants ?? []).map((p: Record<string, unknown>) => ({ type: p.type, anchors: p.anchors, fields: p.fieldPaths })))}`);
  console.log(`form: ${c.facts.filter((f: { path: string }) => /^(entry|history)\./.test(f.path)).map((f: { path: string; status: string; value: string }) => `${f.path}=${f.status === "present" ? JSON.stringify(f.value) : `[${f.status}]`}`).join("; ")}`);
  for (const s of planted) console.log(`PLANTED ${s.id} [attribution: ${attribution(s, "unclear")}]: ${s.text}`);
  for (const s of ss.filter((x) => !planted.includes(x) && (GROUP.test(x.text) || ENTRYISH.test(x.text)))) console.log(`  context ${s.id} [${attribution(s, "unclear")}]${GROUP.test(s.text) ? " [group]" : ""}: ${s.text.slice(0, 220)}`);
  console.log(`completion: ${r.completion?.status}; citation: ${r.citation.status}`);
  for (const g of r.humanReview.accounts ?? []) console.log(`  ROUTED account ${g.fieldPath ?? "-"} ${g.sentenceIds.join(",")}: ${g.details.join(" / ").slice(0, 300)}`);
  for (const x of r.humanReview.reasons.filter((x: string) => planted.some((s) => x.includes(s.id)))) console.log(`  ROUTED reason: ${x.slice(0, 300)}`);
  for (const f of r.findings.filter((f: { evidence: { sentenceId?: string }[] }) => f.evidence.some((v) => planted.some((s) => s.id === v.sentenceId)))) console.log(`  FINDING ${f.id} ${f.category}: ${f.title}`);
  for (const d of (r.discarded ?? []).filter((d: { reason: string }) => /attribut|different people/.test(d.reason))) console.log(`  WITHHELD "${d.title}": ${d.reason.slice(0, 200)}`);
}
