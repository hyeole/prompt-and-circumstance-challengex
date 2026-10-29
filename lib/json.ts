/** Pull the first JSON object out of a response (tolerates code fences or stray text). */
export function extractJSON(text: string): unknown {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  throw new Error("No JSON object in model output");
}
