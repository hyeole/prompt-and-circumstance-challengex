// OFFLINE end-to-end check for hosting-free-1 (no hosted model: the fixture endpoint replays recorded d062b1d outputs).
// Two production-build app instances (A :3171, B :3172) share one Valkey store through the Upstash-REST shim
// (:8079); the fixture endpoint (:4555) logs every model request. Each client keeps its own cookie jar, like an
// independent browser session. Settings for the run: NC_CAP_PER_DAY=6, NC_MAX_INFLIGHT=2 (see .claude/launch.json).
// Usage: set -a; . eval/hosting-free-1/local-test.env; set +a; npx tsx eval/hosting-free-1/e2e-check.ts
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const A = "http://localhost:3171", B = "http://localhost:3172", SHIM = "http://127.0.0.1:8079", FIX = "http://localhost:4555";
const LOG = process.env.FIXTURE_LOG ?? "eval/hosting-free-1/fixture-requests.jsonl";
const CODE = process.env.NC_JUDGE_CODE!, SHIM_TOKEN = process.env.SHIM_TOKEN!;
const results: { check: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail = "") => { results.push({ check: name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`); };
const modelCalls = () => (existsSync(LOG) ? readFileSync(LOG, "utf8").split("\n").filter((l) => l.includes('"kind"')).length : 0);
const fixtureMode = (mode: string, delayMs = 0) => fetch(`${FIX}/__mode`, { method: "POST", body: JSON.stringify({ mode, delayMs }) });
const shimMode = (mode: string) => fetch(`${SHIM}/__mode`, { method: "POST", body: JSON.stringify({ mode }) });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Client {
  jar = new Map<string, string>();
  constructor(public name: string, public ip: string) {}
  async req(base: string, path: string, init: RequestInit & { origin?: string | null } = {}) {
    const headers = new Headers(init.headers);
    headers.set("cookie", [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "));
    headers.set("x-forwarded-for", this.ip);
    if (init.origin !== null && init.method && init.method !== "GET") headers.set("origin", init.origin ?? base);
    const res = await fetch(base + path, { ...init, headers, redirect: "manual" });
    for (const c of res.headers.getSetCookie()) { const [kv] = c.split(";"); const i = kv.indexOf("="); const v = kv.slice(i + 1); if (v) this.jar.set(kv.slice(0, i), v); else this.jar.delete(kv.slice(0, i)); }
    return res;
  }
  async json(base: string, path: string, method = "GET", body?: unknown, extra: { origin?: string | null } = {}) {
    const res = await this.req(base, path, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : {}, body: body !== undefined ? JSON.stringify(body) : undefined, ...extra });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, unknown>, headers: res.headers };
  }
  vid() { return this.jar.get("nc_vid")?.split(".")[0] ?? ""; }
}

const caseC012 = JSON.parse(readFileSync("data/cases/C012-X1.json", "utf8"));
const caseC119 = JSON.parse(readFileSync("data/cases/C119.json", "utf8"));
const review = (c: Client, base: string, kase: unknown, requestId = crypto.randomUUID()) => c.json(base, "/api/review", "POST", { case: kase, save: true, requestId });

async function main() {
  await fetch(SHIM, { method: "POST", headers: { Authorization: `Bearer ${SHIM_TOKEN}` }, body: JSON.stringify(["FLUSHDB"]) });
  await fixtureMode("replay");
  const X = new Client("judge X", "198.51.100.10"), Y = new Client("visitor Y", "198.51.100.20");

  // 1. Visitor cookies and private caching
  const page = await X.req(A, "/");
  await Y.req(B, "/");
  check("each browser gets its own signed visitor cookie", !!X.vid() && !!Y.vid() && X.vid() !== Y.vid(), `X=${X.vid().slice(0, 4)}…, Y=${Y.vid().slice(0, 4)}…`);
  check("pages are private and uncacheable", page.headers.get("cache-control") === "private, no-store", page.headers.get("cache-control") ?? "none");
  const apiList = await X.json(A, "/api/cases");
  check("API responses are private and uncacheable", (apiList.headers.get("cache-control") ?? "").includes("no-store") && (apiList.headers.get("cache-control") ?? "").includes("private"), apiList.headers.get("cache-control") ?? "");

  // 2. Unauthorized or cross-origin requests never call the model
  let before = modelCalls();
  const noJudge = await review(X, A, caseC012);
  const cross = await X.json(A, "/api/review", "POST", { case: caseC012, save: true, requestId: crypto.randomUUID() }, { origin: "https://evil.example" });
  const noOrigin = await X.json(A, "/api/review", "POST", { case: caseC012, save: true, requestId: crypto.randomUUID() }, { origin: null });
  check("review without the judge code: 403, no model call", noJudge.status === 403 && noJudge.body.code === "judge_required" && modelCalls() === before, `${noJudge.status} ${noJudge.body.code}`);
  check("cross-origin and origin-less writes: 403, no model call", cross.status === 403 && noOrigin.status === 403 && modelCalls() === before, `${cross.status}/${noOrigin.status}`);

  // 3. Judge code
  const wrong = await X.json(A, "/api/access", "POST", { code: "not-the-code-0000" });
  check("wrong access code: 401", wrong.status === 401, String(wrong.status));
  const ok = await X.json(A, "/api/access", "POST", { code: CODE });
  check("correct access code: session cookie set", ok.status === 200 && X.jar.has("nc_judge"), String(ok.status));
  const Ycopy = new Client("Y with X's judge cookie", Y.ip); Ycopy.jar = new Map(Y.jar); Ycopy.jar.set("nc_judge", X.jar.get("nc_judge")!);
  before = modelCalls();
  const stolen = await review(Ycopy, B, caseC012);
  check("judge cookie copied into another visitor's session is refused, no model call", stolen.status === 403 && modelCalls() === before, `${stolen.status} ${stolen.body.code}`);
  const Z = new Client("attempt flooder", "198.51.100.99");
  await Z.req(A, "/");
  const codes: number[] = [];
  for (let i = 0; i < 6; i++) codes.push((await Z.json(A, "/api/access", "POST", { code: `guess-${i}-0000000000` })).status);
  check("access attempts limited: 6th attempt in 15 min is 429", codes.slice(0, 5).every((s) => s === 401) && codes[5] === 429, codes.join(","));

  // 4. A live review on instance A; read from instance B (shared store)
  before = modelCalls();
  const r1 = await review(X, A, caseC012);
  check("authorized review runs and is saved (offline fixture replay)", r1.status === 200 && r1.body.savedVersion === 1 && modelCalls() > before, `${r1.status} v${r1.body.savedVersion}, ${modelCalls() - before} fixture requests`);
  const fromB = await X.json(B, "/api/cases/C012-X1");
  check("the saved version is visible to the same visitor on the other instance", (fromB.body.history as { versions: unknown[] })?.versions?.length === 1);

  // 5. Isolation between visitors
  const yView = await Y.json(B, "/api/cases/C012-X1");
  check("another visitor does not see X's saved review", (yView.body.history as { versions: unknown[] })?.versions?.length === 0);
  const yPage = await (await Y.req(A, "/review/C012-X1")).text();
  check("another visitor's review page shows no saved review", yPage.includes("No saved review") && !yPage.includes("v1 of 1"));
  const yCase = await Y.json(A, "/api/cases", "POST", { title: "Visitor Y private case", narrative: "Synthetic test narrative for the isolation check. The subject entered the United States without inspection near Brownsville, Texas.", textOrigin: "synthetic-test", facts: [], charges: ["INA 212(a)(6)(A)(i)"] });
  const yId = String(yCase.body.id);
  const xRead = await X.json(B, `/api/cases/${yId}`);
  const xDecide = await X.json(A, `/api/cases/${yId}/decisions`, "PUT", { reviewId: "R-x", findingId: "F-x", state: "acknowledged" });
  const xPdf = await X.req(A, `/api/cases/${yId}/pdf`);
  const xList = await X.json(A, "/api/cases");
  check("another visitor's case: not listed, not readable, no decision, no PDF (404)", yCase.status === 200 && xRead.status === 404 && xDecide.status === 404 && xPdf.status === 404 && !(xList.body as unknown as { id: string }[]).some((c) => c.id === yId), `${xRead.status}/${xDecide.status}/${xPdf.status}`);
  const xDecOnY = await Y.json(B, "/api/cases/C012-X1/decisions", "PUT", { reviewId: String(r1.body.reviewId), findingId: "F-ACCOUNT", state: "acknowledged" });
  check("a visitor cannot record a decision on another visitor's review", xDecOnY.status === 404, String(xDecOnY.status));

  // 6. Cancellation across instances: started on A, cancelled through B; another visitor cannot cancel
  await fixtureMode("slow", 8000);
  const rid = crypto.randomUUID();
  before = modelCalls();
  const t0 = Date.now();
  const running = review(X, A, caseC119, rid);
  await sleep(1500);
  const intruder = await Y.json(B, "/api/review/cancel", "POST", { requestId: rid });
  const cancel = await X.json(B, "/api/review/cancel", "POST", { requestId: rid });
  const done = await running;
  const ms = Date.now() - t0;
  const hist119 = await X.json(A, "/api/cases/C119");
  check("another visitor's cancel is ignored (reported unknown)", intruder.body.status === "unknown", String(intruder.body.status));
  check("cancel through instance B stops the review on instance A and nothing is saved", cancel.body.status === "cancelled" && done.status === 409 && (hist119.body.history as { versions: unknown[] }).versions.length === 0, `cancel=${cancel.body.status}, review=${done.status}, ${ms} ms (fixture delay 8000 ms)`);

  // 7. Concurrency cap (NC_MAX_INFLIGHT=2) across both instances, and no lost versions
  await fixtureMode("slow", 3000);
  before = modelCalls();
  const burst = await Promise.all(Array.from({ length: 5 }, (_, i) => review(X, i % 2 ? B : A, caseC012)));
  const admitted = burst.filter((r) => r.status === 200), busy = burst.filter((r) => r.status === 429 && r.body.code === "busy");
  const histAfter = await X.json(A, "/api/cases/C012-X1");
  const versions = (histAfter.body.history as { versions: { version: number }[] }).versions.map((v) => v.version);
  check("5 simultaneous reviews on two instances: exactly 2 run (in-flight cap), 3 refused with 429", admitted.length === 2 && busy.length === 3, burst.map((r) => r.status).join(","));
  check("refused reviews made no model calls (3 fixture requests per admitted review)", modelCalls() - before === admitted.length * 3, `${modelCalls() - before} fixture requests`);
  check("simultaneous saves: versions 1..3 with none lost or reused", JSON.stringify(versions) === "[1,2,3]", JSON.stringify(versions));

  // 8. Daily cap (NC_CAP_PER_DAY=6): used so far = 1 + 1 (cancelled) + 2 = 4
  await fixtureMode("replay");
  const seq = [await review(X, A, caseC012), await review(X, B, caseC012), await review(X, A, caseC012)];
  check("daily cap: 2 more run, then 429 day_limit with a clear message", seq[0].status === 200 && seq[1].status === 200 && seq[2].status === 429 && seq[2].body.code === "day_limit", `${seq.map((r) => r.status).join(",")}: ${seq[2].body.error}`);

  // 9. Storage outages fail closed (no model call, clear 503)
  for (const mode of ["down", "http500"]) {
    await shimMode(mode);
    before = modelCalls();
    const r = await review(X, A, caseC012);
    const create = await Y.json(B, "/api/cases", "POST", { title: "During outage", narrative: "Synthetic test narrative written during a simulated storage outage, at least forty characters long.", textOrigin: "synthetic-test", facts: [], charges: ["INA 212(a)(6)(A)(i)"] });
    const pg = await Y.req(A, "/");
    check(`storage ${mode}: review 503 without a model call; case creation 503; pages error out`, r.status === 503 && r.body.code === "storage_unavailable" && modelCalls() === before && create.status === 503 && pg.status >= 500, `review ${r.status} ${r.body.code}; create ${create.status}; page ${pg.status}`);
  }
  await shimMode("ok");

  // 10. Uploads: judge only, 3 MB, PDFs only
  const xCase = await X.json(A, "/api/cases", "POST", { title: "Judge X upload check", narrative: "Synthetic test narrative for the upload check. The subject entered the United States without inspection near Laredo, Texas.", textOrigin: "synthetic-test", facts: [], charges: ["INA 212(a)(6)(A)(i)"] });
  const up = async (c: Client, id: string, data: Buffer, name = "f.pdf") => { const fd = new FormData(); fd.append("file", new Blob([new Uint8Array(data)], { type: "application/pdf" }), name); const res = await c.req(A, `/api/cases/${id}/pdf`, { method: "POST", body: fd }); return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, unknown> }; };
  const big = await up(X, String(xCase.body.id), Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(3 * 1024 * 1024)]));
  const notPdf = await up(X, String(xCase.body.id), Buffer.from("hello, not a pdf"));
  const good = await up(X, String(xCase.body.id), Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(200 * 1024)]));
  const back = await X.req(B, `/api/cases/${xCase.body.id}/pdf`);
  const yUp = await up(Y, yId, Buffer.from("%PDF-1.4\n small"));
  check("upload over 3 MB: 413; not a PDF: 400; valid PDF: stored and served", big.status === 413 && notPdf.status === 400 && good.status === 200 && back.status === 200 && back.headers.get("content-type") === "application/pdf", `${big.status}/${notPdf.status}/${good.status}/${back.status}`);
  check("upload without the judge code: 403", yUp.status === 403 && yUp.body.code === "judge_required", `${yUp.status} ${yUp.body.code}`);

  // 11. Case-creation limits: per visitor (10), then per IP per day (20) even with a fresh cookie
  const mk = (c: Client, i: number) => c.json(A, "/api/cases", "POST", { title: `Limit check ${i}`, narrative: "Synthetic test narrative used only to check the case-creation limits of the public demo.", textOrigin: "synthetic-test", facts: [], charges: ["INA 212(a)(6)(A)(i)"] });
  const W1 = new Client("same network, cookie 1", "198.51.100.50");
  const w1: number[] = []; for (let i = 0; i < 11; i++) w1.push((await mk(W1, i)).status);
  const W2 = new Client("same network, cleared cookies", "198.51.100.50");
  const w2: number[] = []; for (let i = 0; i < 10; i++) w2.push((await mk(W2, i)).status);
  const W3 = new Client("same network, cleared cookies again", "198.51.100.50");
  const w3 = await mk(W3, 0);
  check("per-visitor case limit: 10 created, the 11th refused (429 visitor_limit)", w1.slice(0, 10).every((s) => s === 200) && w1[10] === 429, w1.join(","));
  check("clearing cookies does not bypass the per-IP daily limit (20): a third cookie gets 429 ip_day_limit", w2.every((s) => s === 200) && w3.status === 429 && w3.body.code === "ip_day_limit", `${w2.join(",")} then ${w3.status} ${w3.body.code}`);

  // 12. Retention: visitor data expires 30 days after the last change
  const ttl = await fetch(SHIM, { method: "POST", headers: { Authorization: `Bearer ${SHIM_TOKEN}` }, body: JSON.stringify(["TTL", `v:${X.vid()}`]) }).then((r) => r.json() as Promise<{ result: number }>);
  check("visitor data expiry is 30 days, renewed on each change", ttl.result > 30 * 86_400 - 120 && ttl.result <= 30 * 86_400, `TTL ${ttl.result} s`);

  writeFileSync("eval/hosting-free-1/e2e-results.json", JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
