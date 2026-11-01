// Reporting only (not runtime): how the unchanged v2.4 matcher reads one replayed case's findings against its labels.
// Usage: RUNS_ROOT=<checkout> npx tsx --conditions=react-server scripts/score-one.ts <case-id> <run> <expectedDir>
import { readFileSync } from "node:fs";
import { FACTS_SYSTEM_PROMPT } from "../lib/review/facts";
import { reviewCase, type Complete } from "../lib/review/review";
import { matches, type Plant } from "./score-match";
import type { CaseRecord, ReviewResult } from "../lib/types";
const [id, run, expDir] = process.argv.slice(2);
const saved = JSON.parse(readFileSync(`${process.env.RUNS_ROOT}/eval/runs/${run}/raw/${id}.json`, "utf8")) as ReviewResult;
const REVIEW = JSON.stringify({ elements: [], issues: [], citation: { status: "consistent", explanation: "Supported.", evidence: [] }, human_review: { required: false, reasons: [] } });
const fake: Complete = async (s) => s === FACTS_SYSTEM_PROMPT && saved.factsExtraction?.status === "valid" ? { text: JSON.stringify(saved.factsExtraction.output), attempts: 1 } : { text: REVIEW, attempts: 1 };
const r = await reviewCase(JSON.parse(readFileSync(`eval/cases/${id}.json`, "utf8")) as CaseRecord, fake);
const plants = (JSON.parse(readFileSync(`${expDir}/${id}.json`, "utf8")) as { plants: Plant[] }).plants;
for (const p of plants) console.log(JSON.stringify({ plant: p, matchedBy: r.findings.filter((f) => matches(r, f, p)).map((f) => `${f.id}/${f.source}`), completion: r.completion?.status }));
