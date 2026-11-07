// OFFLINE before/after check for the three blockers reproduced by the independent review (no hosted model: the
// fixture endpoint replays recorded d062b1d outputs). Two app instances (A, B) share one Valkey store via the
// Upstash-REST shim. Run once against a 5474b34 build and once against the fixed build, with the same settings:
// NC_MAX_INFLIGHT=2, NC_RL_JUDGE_PER_HOUR=8, NC_CAP_PER_DAY=1000.
// Usage: set -a; . eval/hosting-free-1/local-test.env; set +a; A=http://localhost:3171 B=http://localhost:3172 LABEL=after npx tsx eval/hosting-free-1/fix-check.ts
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const A = process.env.A!, B = process.env.B!, LABEL = process.env.LABEL ?? "run";
const SHIM = "http://127.0.0.1:8079", FIX = "http://localhost:4555", LOG = "eval/hosting-free-1/fixture-requests-fixcheck.jsonl";
const CODE = process.env.NC_JUDGE_CODE!, TOKEN = process.env.SHIM_TOKEN!;
const out: Record<string, unknown> = { label: LABEL, ranAt: new Date().toISOString() };
const kv = (cmd: unknown[]) => fetch(SHIM, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmd) }).then((r) => r.json() as Promise<{ result: unknown }>).then((r) => r.result);
const calls = () => (existsSync(LOG) ? readFileSync(LOG, "utf8").split("\n").filter((l) => l.includes('"kind"')).length : 0);
const mode = (m: string, delayMs = 0) => fetch(`${FIX}/__mode`, { method: "POST", body: JSON.stringify({ mode: m, delayMs }) });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const day = new Date().toISOString().slice(0, 10);

class Client {
  jar = new Map<string, string>();
  constructor(public ip: string) {}
  async req(base: string, path: string, init: RequestInit = {}) {
    const h = new Headers(init.headers);
    h.set("cookie", [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "));
    h.set("x-forwarded-for", this.ip);
    if (init.method && init.method !== "GET") h.set("origin", base);
    const r = await fetch(base + path, { ...init, headers: h });
    for (const c of r.headers.getSetCookie()) { const [p] = c.split(";"); const i = p.indexOf("="); this.jar.set(p.slice(0, i), p.slice(i + 1)); }
    return r;
  }
  async json(base: string, path: string, method = "GET", body?: unknown) {
    const r = await this.req(base, path, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : {}, body: body !== undefined ? JSON.stringify(body) : undefined });
    return { status: r.status, body: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  }
  vid() { return this.jar.get("nc_vid")!.split(".")[0]; }
  async judge(base: string) { await this.req(base, "/"); const r = await this.json(base, "/api/access", "POST", { code: CODE }); if (r.status !== 200) throw new Error(`unlock failed ${r.status}`); }
}
const C012 = JSON.parse(readFileSync("data/cases/C012-X1.json", "utf8"));
const C119 = JSON.parse(readFileSync("data/cases/C119.json", "utf8"));
const review = (c: Client, base: string, kase: unknown, requestId: string) => c.json(base, "/api/review", "POST", { case: kase, save: true, requestId });
const versions = async (c: Client, id: string) => ((await c.json(A, `/api/cases/${id}`)).body.history as { versions: unknown[] }).versions.length;

async function main() {
  await kv(["FLUSHDB"]);
  await mode("slow", 3000);

  // Issue 1a: five simultaneous requests with ONE request id (in-flight cap 2), plus one with another id.
  const J1 = new Client("198.51.100.1");
  await J1.judge(A);
  let before = calls();
  const rid = crypto.randomUUID();
  let peakLeases = 0;
  const watch = setInterval(async () => { peakLeases = Math.max(peakLeases, Number(await kv(["ZCARD", "cap:review:leases"]))); }, 200);
  const burst = await Promise.all([...Array.from({ length: 5 }, (_, i) => review(J1, i % 2 ? B : A, C012, rid)), review(J1, A, C012, crypto.randomUUID())]);
  clearInterval(watch);
  out.issue1_sameId = { statuses: burst.map((r) => `${r.status}${r.body.code ? ":" + r.body.code : ""}`), modelCalls: calls() - before, reviewsRun: (calls() - before) / 3, savedVersions: await versions(J1, "C012-X1"), peakLeases };

  // Issue 1b: same id started on A and again on B; owner cancels after the first finishes.
  const J2 = new Client("198.51.100.2");
  await J2.judge(A);
  const rid2 = crypto.randomUUID();
  const first = review(J2, A, C119, rid2);
  await sleep(500);
  const second = review(J2, B, C119, rid2);
  const r1 = await first;
  const leasesAfterFirst = Number(await kv(["ZCARD", "cap:review:leases"]));
  const cancel = await J2.json(B, "/api/review/cancel", "POST", { requestId: rid2 });
  const r2 = await second;
  out.issue1_crossInstance = { first: r1.status, leasesWhileSecondRuns: leasesAfterFirst, cancelReply: cancel.body, second: `${r2.status}${r2.body.code ? ":" + r2.body.code : ""}`, savedVersions: await versions(J2, "C119") };

  // Issue 2: oversized body (3.5 MB extra field) saved repeatedly; visitor byte limit 12 MB.
  await mode("replay");
  const J3 = new Client("198.51.100.3");
  await J3.judge(A);
  const big = { ...C119, narrative: { ...C119.narrative, pad: "x".repeat(3_500_000) } };
  const bigRes: string[] = [];
  for (let i = 0; i < 5; i++) { const r = await review(J3, A, big, crypto.randomUUID()); bigRes.push(`${r.status}${r.body.code ? ":" + r.body.code : ""}`); }
  out.issue2_oversized = { statuses: bigRes, visitorBytes: Number(await kv(["GET", `q:vb:${J3.vid()}`])), limit: 12 * 1024 * 1024, storedHashBytes: await kv(["MEMORY", "USAGE", `v:${J3.vid()}`]), savedVersions: await versions(J3, "C119") };

  // Issue 3: refused reviews (judge-hour limit 8) must not consume saving quota.
  const J4 = new Client("198.51.100.4");
  await J4.judge(A);
  const v0 = Number(await kv(["GET", `q:g:version:${day}`])), b0 = Number(await kv(["GET", "q:g:bytes:total"])), t0 = Number(await kv(["GET", "cap:review:total"]));
  const seq: string[] = [];
  for (let i = 0; i < 11; i++) { const r = await review(J4, A, C012, crypto.randomUUID()); seq.push(`${r.status}${r.body.code ? ":" + r.body.code : ""}`); }
  const saved = seq.filter((s) => s === "200").length, refused = seq.length - saved;
  out.issue3_refusedQuota = { statuses: seq, saved, refused, versionQuotaUsed: Number(await kv(["GET", `q:g:version:${day}`])) - v0, reviewAllowanceUsed: Number(await kv(["GET", "cap:review:total"])) - t0, bytesReserved: Number(await kv(["GET", "q:g:bytes:total"])) - b0 };

  // Cancel route: rate limit and metering.
  const m = new Date().toISOString().slice(0, 7);
  const c0 = Number(await kv(["GET", `budget:cmds:${m}`]));
  const V = new Client("198.51.100.5");
  await V.req(A, "/");
  const cs: number[] = [];
  for (let i = 0; i < 32; i++) cs.push((await V.json(A, "/api/review/cancel", "POST", { requestId: crypto.randomUUID() })).status);
  out.cancelRoute = { statuses: `${cs.filter((s) => s === 200).length}x200, ${cs.filter((s) => s === 429).length}x429`, budgetCommandsAdded: Number(await kv(["GET", `budget:cmds:${m}`])) - c0 };

  console.log(JSON.stringify(out, null, 1));
  writeFileSync(`eval/hosting-free-1/fix-check-${LABEL}.json`, JSON.stringify(out, null, 2));
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
