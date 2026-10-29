// Prints the fact extraction and the deterministic comparison for one eval case. The key is never printed.
// Usage: npx tsx scripts/probe-facts.ts C012-X1 [runs]
import { existsSync, readFileSync } from "node:fs";
import OpenAI from "openai";
import { FACTS_SYSTEM_PROMPT, FactsOutput, buildFactsPrompt, compareFacts } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
import { extractJSON } from "../lib/json";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const id = process.argv[2] ?? "C012-X1";
const runs = Number(process.argv[3] ?? 1);
const c = JSON.parse(readFileSync(`eval/cases/${id}.json`, "utf8"));
const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
const client = new OpenAI({ baseURL: process.env.CHALLENGEX_BASE_URL ?? "https://challengex-ext2.unissantmissionworks.com/v1", apiKey: process.env.CHALLENGEX_API_KEY!, maxRetries: 0, timeout: 90_000 });
for (let i = 0; i < runs; i++) {
  const t0 = Date.now();
  const r = await client.chat.completions.create({ model: "gpt-oss-20b", temperature: 0, reasoning_effort: "low", response_format: { type: "json_object" }, messages: [{ role: "system", content: FACTS_SYSTEM_PROMPT }, { role: "user", content: buildFactsPrompt(ss) }] });
  const raw = r.choices[0].message.content ?? "";
  if (process.env.RAW) console.log(raw);
  const f = FactsOutput.parse(extractJSON(raw));
  console.log(`--- run ${i + 1} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  for (const e of f.entry_statements) console.log(`  entry ${e.sentence_id} year=${e.year} manner=${e.manner} person=${e.person} "${e.quote}"`);
  for (const e of f.removal_statements) console.log(`  removal ${e.sentence_id} person=${e.person} "${e.quote}"`);
  console.log("  findings:", compareFacts(c, ss, f).findings.map((x) => `${x.id}: ${x.explanation}`));
}
