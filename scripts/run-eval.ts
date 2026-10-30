/**
 * Run every case in eval/cases through the live app (POST /api/review) and save the results.
 * Expected answers are NOT read here. Score afterwards with scripts/score-eval.ts.
 *
 * Usage: npm run dev   (in another terminal)
 *        npm run eval -- [--split dev|heldout|all] [--only C001,C012-M2] [--concurrency 2]
 * Output: eval/runs/<timestamp>/raw/<id>.json (git-ignored) and eval/runs/<timestamp>/latency.json
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const arg = (k: string, d?: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const split = arg("split", "all")!;
const only = arg("only")?.split(",");
const conc = Number(arg("concurrency", "2"));
const dataset = arg("dataset", "eval")!.replace(/\/$/, ""); // "eval" = legacy benchmark (eval/cases); or e.g. eval/dev-synthetic
const casesDir = dataset === "eval" ? "eval/cases" : `${dataset}/cases`;

const cases = readdirSync(casesDir).sort().map((f) => JSON.parse(readFileSync(`${casesDir}/${f}`, "utf8")))
  .filter((c) => (split === "all" || c.split === split || dataset !== "eval") && (!only || only.includes(c.id)));
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dir = `eval/runs/${stamp}`;
mkdirSync(`${dir}/raw`, { recursive: true });
const sh = (cmd: string) => { try { return execSync(cmd, { encoding: "utf8" }).trim(); } catch { return "unknown"; } };
const label = arg("label", "post-tuning")!; // "official-heldout" only for a first, blind run of a frozen commit
writeFileSync(`${dir}/run-info.json`, JSON.stringify({
  label, dataset, split, only: only ?? null, concurrency: conc, startedAt: new Date().toISOString(),
  commit: sh("git rev-parse --short HEAD"), uncommittedServerChanges: sh("git status --porcelain -- lib app components config") || "none",
  // Server-side model settings come from the app's environment; recorded per review in raw results as modelConfig.
  note: "Model settings (reasoning effort, samples, prompt versions) are recorded in every raw result.",
}, null, 2));
console.log(`Running ${cases.length} cases against ${BASE} (concurrency ${conc}) -> ${dir}`);

const latency: { id: string; ms: number; ok: boolean; modelStatus?: string; error?: string }[] = [];
let next = 0;
async function worker() {
  while (next < cases.length) {
    const c = cases[next++];
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE}/api/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case: c }), signal: AbortSignal.timeout(120_000) });
      const body = await res.json();
      const ms = Date.now() - t0;
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      writeFileSync(`${dir}/raw/${c.id}.json`, JSON.stringify(body, null, 2));
      latency.push({ id: c.id, ms, ok: true, modelStatus: body.modelStatus });
      console.log(`${c.id.padEnd(10)} ${(ms / 1000).toFixed(1).padStart(5)}s  model=${body.modelStatus}  findings=${body.findings.length}  citation=${body.citation.status}  humanReview=${body.humanReview.required}`);
    } catch (e) {
      const ms = Date.now() - t0;
      latency.push({ id: c.id, ms, ok: false, error: (e as Error).message });
      console.log(`${c.id.padEnd(10)} ${(ms / 1000).toFixed(1).padStart(5)}s  FAILED: ${(e as Error).message}`);
    }
  }
}
await Promise.all(Array.from({ length: conc }, worker));
writeFileSync(`${dir}/latency.json`, JSON.stringify(latency.sort((a, b) => a.id.localeCompare(b.id)), null, 2));
console.log(`\nDone. Score with: npx tsx scripts/score-eval.ts ${dir}`);
