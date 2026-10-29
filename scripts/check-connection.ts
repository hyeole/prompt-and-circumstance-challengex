/**
 * Minimal connection check for the Unissant-hosted gpt-oss-20b endpoint.
 * Reads CHALLENGEX_API_KEY from the environment or .env.local. Never prints the key.
 * Run: npm run check:api
 */
import { existsSync } from "node:fs";
import OpenAI from "openai";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const baseURL = process.env.CHALLENGEX_BASE_URL ?? "https://challengex-ext2.unissantmissionworks.com/v1";
const model = process.env.CHALLENGEX_MODEL ?? "gpt-oss-20b";
const apiKey = process.env.CHALLENGEX_API_KEY;

if (!apiKey || apiKey === "replace-with-your-key") {
  console.error("CHALLENGEX_API_KEY is not set. See docs/SETUP.md, step 'Configure the key'.");
  process.exit(1);
}
console.log(`Key found (length ${apiKey.length}, value hidden). Endpoint: ${baseURL}  Model: ${model}`);

const client = new OpenAI({ baseURL, apiKey, timeout: 90_000, maxRetries: 0 });

async function step(name: string, fn: () => Promise<string>) {
  const t0 = Date.now();
  try {
    const out = await fn();
    console.log(`PASS  ${name}  (${((Date.now() - t0) / 1000).toFixed(1)}s)  ${out}`);
    return true;
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    console.log(`FAIL  ${name}  (${((Date.now() - t0) / 1000).toFixed(1)}s)  status=${err.status ?? "n/a"}  ${String(err.message ?? e).slice(0, 300)}`);
    return false;
  }
}

await step("1. plain chat completion", async () => {
  const r = await client.chat.completions.create({ model, messages: [{ role: "user", content: "Say hello in five words." }] });
  return JSON.stringify(r.choices[0]?.message?.content ?? null);
});

await step("2. JSON mode (response_format json_object)", async () => {
  const r = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Reply with a JSON object only." },
      { role: "user", content: 'Return {"ok": true, "n": 3}.' },
    ],
  });
  const text = r.choices[0]?.message?.content ?? "";
  JSON.parse(text);
  return `parsed OK: ${text.slice(0, 80)}`;
});

await step("3. JSON schema (response_format json_schema, strict)", async () => {
  const r = await client.chat.completions.create({
    model,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "probe",
        strict: true,
        schema: { type: "object", additionalProperties: false, required: ["color"], properties: { color: { type: "string", enum: ["red", "blue"] } } },
      },
    },
    messages: [{ role: "user", content: "Pick a color: red or blue." }],
  });
  const text = r.choices[0]?.message?.content ?? "";
  JSON.parse(text);
  return `parsed OK: ${text.slice(0, 80)}`;
});

await step("4. list models", async () => {
  const list = await client.models.list();
  return list.data.map((m) => m.id).join(", ");
});
