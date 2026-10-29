// Measures model latency for one eval case at different reasoning_effort settings. The key is never printed.
// Usage: npx tsx scripts/probe-effort.ts C003-AMB
import { existsSync, readFileSync } from "node:fs";
import OpenAI from "openai";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const { SYSTEM_PROMPT, buildUserPrompt } = await import("../lib/review/prompt");
const { splitSentences } = await import("../lib/text");
const refs = JSON.parse(readFileSync("./config/references.json", "utf8"));
const c = JSON.parse(readFileSync(`./eval/cases/${process.argv[2] ?? "C003-AMB"}.json`, "utf8"));
const ss = splitSentences(c.narrative.text);
const user = buildUserPrompt(c, ss, refs.requiredElements.filter((e: any) => ["E6", "E7"].includes(e.id)), refs.charges[0], refs.formGlossary);
const client = new OpenAI({ baseURL: "https://challengex-ext2.unissantmissionworks.com/v1", apiKey: process.env.CHALLENGEX_API_KEY!, maxRetries: 0, timeout: 120000 });
for (const effort of ["low", "medium", "low"]) {
  const t0 = Date.now();
  try {
    const r: any = await client.chat.completions.create({ model: "gpt-oss-20b", temperature: 0, response_format: { type: "json_object" }, reasoning_effort: effort as any, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: user }] });
    const out = JSON.parse(r.choices[0].message.content);
    console.log(effort, ((Date.now() - t0) / 1000).toFixed(1) + "s", "tokens", JSON.stringify(r.usage), "| issues:", out.issues.map((i: any) => `${i.type}:${i.title}`).join(" / "), "| HR", out.human_review.required);
  } catch (e: any) { console.log(effort, "ERR", e.status, e.message.slice(0, 120)); }
}
