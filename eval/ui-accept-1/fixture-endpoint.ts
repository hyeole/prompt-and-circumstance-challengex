// OFFLINE FIXTURE ENDPOINT for the UI acceptance check (ui-accept-1). NOT the hosted model, and not live analysis.
// An OpenAI-compatible /v1/chat/completions server that REPLAYS RECORDED OUTPUTS of the d062b1d benchmark run
// (measure-d062b1d, 2026-11-06) for the 13 built-in demo cases: the saved fact extraction for the fact prompt, and the
// saved review rebuilt with the existing reconstruct() for the review prompt. A request is matched to its case by the
// narrative's sentence text; a narrative with no recording gets HTTP 503 ("no recorded output"), never an invented answer.
// Behaviour is switched at runtime (POST /__mode {"mode": ...}) to show the app's failure states:
//   replay (default) | fail-all (HTTP 500 for every call) | fail-facts (fact prompt HTTP 500; reviews replay) |
//   stall (never answers; the app's own deadline applies) | slow (replay after `delayMs`).
// Every request is logged (case matched, prompt kind, the "Officer-selected charge" text found in the prompt, mode,
// outcome); prompt text and outputs are not logged.
//   RECORDED=<measure-d062b1d dir> PORT=4555 npx tsx --conditions=react-server eval/ui-accept-1/fixture-endpoint.ts
import http from "node:http";
import { readFileSync, readdirSync, appendFileSync, existsSync } from "node:fs";
import path from "node:path";
import { FACTS_SYSTEM_PROMPT } from "../../lib/review/facts";
import { reconstruct } from "../../scripts/replay-reconstructed";
import { splitSentences } from "../../lib/text";
import type { CaseRecord, ReviewResult } from "../../lib/types";

const RECORDED = process.env.RECORDED!; const PORT = Number(process.env.PORT ?? 4555);
const LOG = process.env.FIXTURE_LOG ?? "eval/ui-accept-1/fixture-requests.jsonl";
const runs = JSON.parse(readFileSync(path.join(RECORDED, "eval/measure-d062b1d/driver-log.json"), "utf8")).runs as { case: string; run: string }[];
type Fx = { id: string; probes: string[]; charge: string; facts: string; review: string };
const fixtures: Fx[] = [];
for (const f of readdirSync("data/cases").filter((x) => x.endsWith(".json"))) {
  const c = JSON.parse(readFileSync(`data/cases/${f}`, "utf8")) as CaseRecord;
  const r = runs.find((x) => x.case === c.id); if (!r) continue;
  const raw = path.join(RECORDED, r.run, "raw", `${c.id}.json`); if (!existsSync(raw)) continue;
  const saved = JSON.parse(readFileSync(raw, "utf8")) as ReviewResult;
  if (saved.factsExtraction?.status !== "valid") continue;
  const ss = splitSentences(c.narrative.text, c.narrative.pageSpans).map((s) => s.text).filter((t) => t.length > 40);
  // Match on EVERY sentence (variants share most sentences) and, for review prompts, on the selected charge (C001 and
  // C001-MC have the same narrative and differ only in their charges). Corrected after the first C012-X1 request was
  // answered with C012-M2's recording when only three sample sentences were compared.
  fixtures.push({ id: c.id, probes: ss, charge: c.selectedCharges.map((s) => s.citation).join("; ") || "(none)", facts: JSON.stringify(saved.factsExtraction.output), review: reconstruct(saved) });
}
let mode = { mode: "replay", delayMs: 0 } as { mode: string; delayMs: number };
const log = (o: object) => appendFileSync(LOG, JSON.stringify({ t: new Date().toISOString(), ...o }) + "\n");
const reply = (res: http.ServerResponse, status: number, body: object) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
http.createServer((req, res) => {
  let data = ""; req.on("data", (d) => (data += d)); req.on("end", () => {
    if (req.url === "/__mode" && req.method === "POST") { mode = { mode: "replay", delayMs: 0, ...JSON.parse(data || "{}") }; log({ control: mode }); return reply(res, 200, mode); }
    if (req.url === "/__mode") return reply(res, 200, { ...mode, fixtures: fixtures.map((x) => x.id) });
    if (!req.url?.endsWith("/chat/completions")) return reply(res, 404, { error: "not found" });
    const body = JSON.parse(data); const system = body.messages[0].content as string; const user = body.messages[1].content as string;
    const kind = system === FACTS_SYSTEM_PROMPT ? "facts" : "review";
    const charge = kind === "review" ? (user.match(/Officer-selected charge[^:]*:\s*([^\n]*)/i)?.[1]?.trim() ?? null) : undefined;
    // Candidates: every sentence of the case's narrative is in the prompt; the most specific (most sentences) first.
    let cands = fixtures.filter((x) => x.probes.every((p) => user.includes(p))).sort((a, b) => b.probes.length - a.probes.length);
    cands = cands.filter((x) => x.probes.length === cands[0]?.probes.length);
    if (kind === "review") cands = cands.filter((x) => x.charge === charge);
    const fx = cands[0];
    // A facts prompt for a narrative shared by two cases (C001 / C001-MC) is the identical request for both: either
    // recording is a recorded answer to it; the candidates are logged.
    const entry = { kind, case: fx?.id ?? null, candidates: cands.map((x) => x.id), charge, mode: mode.mode, effort: body.reasoning_effort };
    const send = (status: number, content?: string) => { log({ ...entry, status }); if (content === undefined) return reply(res, status, { error: { message: status === 503 ? "offline fixture: no recorded output for this narrative" : "offline fixture: simulated failure" } });
      reply(res, 200, { id: "fixture", object: "chat.completion", created: Math.floor(Date.now() / 1000), model: "offline-fixture-replay", choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }], usage: { prompt_tokens: 0, completion_tokens: 0 } }); };
    if (mode.mode === "stall") { log({ ...entry, status: "stalled" }); return; }
    if (mode.mode === "fail-all" || (mode.mode === "fail-facts" && kind === "facts")) return send(500);
    if (!fx) return send(503);
    setTimeout(() => send(200, kind === "facts" ? fx.facts : fx.review), mode.mode === "slow" ? mode.delayMs : 300);
  });
}).listen(PORT, () => console.log(`offline fixture endpoint on ${PORT}; recorded fixtures: ${fixtures.map((x) => x.id).join(", ")}`));
