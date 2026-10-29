// Server-only client for the Unissant-hosted model. The key never leaves the server.
import "server-only";
import OpenAI from "openai";

export const MODEL = process.env.CHALLENGEX_MODEL ?? "gpt-oss-20b";
const BASE_URL = process.env.CHALLENGEX_BASE_URL ?? "https://challengex-ext2.unissantmissionworks.com/v1";
const TIMEOUT_MS = Number(process.env.CHALLENGEX_TIMEOUT_MS ?? 55_000);
const MAX_RETRIES = Number(process.env.CHALLENGEX_MAX_RETRIES ?? 1);
const RESPONSE_FORMAT = (process.env.CHALLENGEX_RESPONSE_FORMAT ?? "json_object") as "json_object" | "none";

export class ModelError extends Error {
  constructor(message: string, public kind: "config" | "timeout" | "http" | "network" | "empty", public attempts: number) {
    super(message);
  }
}

let client: OpenAI | null = null;
function getClient() {
  const apiKey = process.env.CHALLENGEX_API_KEY;
  if (!apiKey || apiKey === "replace-with-your-key") throw new ModelError("CHALLENGEX_API_KEY is not configured on the server.", "config", 0);
  client ??= new OpenAI({ baseURL: BASE_URL, apiKey, maxRetries: 0 });
  return client;
}

/** One chat completion with a total time budget, bounded retries on transient errors, and no key in any message. */
export async function completeJSON(system: string, user: string, budgetMs = TIMEOUT_MS) {
  const c = getClient();
  const deadline = Date.now() + budgetMs;
  let attempts = 0;
  let lastErr: ModelError | null = null;
  while (attempts <= MAX_RETRIES) {
    const remaining = deadline - Date.now();
    if (remaining < 8_000) break; // not enough time for a useful attempt
    attempts++;
    try {
      const r = await c.chat.completions.create(
        {
          model: MODEL,
          temperature: 0,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          ...(RESPONSE_FORMAT === "json_object" ? { response_format: { type: "json_object" as const } } : {}),
        },
        { timeout: remaining }
      );
      const text = r.choices[0]?.message?.content ?? "";
      if (!text.trim()) throw new ModelError("The model returned an empty response.", "empty", attempts);
      return { text, attempts, usage: r.usage };
    } catch (e: unknown) {
      const err = e as { status?: number; name?: string; message?: string };
      if (e instanceof ModelError) lastErr = e;
      else if (err.name === "APIConnectionTimeoutError" || /timed? ?out/i.test(err.message ?? ""))
        lastErr = new ModelError("The model endpoint did not answer within the time limit.", "timeout", attempts);
      else if (err.status)
        lastErr = new ModelError(`The model endpoint returned HTTP ${err.status}.`, "http", attempts);
      else lastErr = new ModelError("Could not reach the model endpoint.", "network", attempts);
      const retryable = lastErr.kind === "timeout" || lastErr.kind === "network" || lastErr.kind === "empty" || (err.status ?? 0) >= 500 || err.status === 429;
      if (!retryable) break;
    }
  }
  throw lastErr ?? new ModelError("Not enough time remained to call the model.", "timeout", attempts);
}

/** Pull the first JSON object out of a response (tolerates code fences or stray text). */
export function extractJSON(text: string): unknown {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  throw new Error("No JSON object in model output");
}
