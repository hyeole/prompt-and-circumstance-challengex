import { readFileSync } from "node:fs";
const A = "http://localhost:3171", SHIM = "http://127.0.0.1:8079", tok = process.env.SHIM_TOKEN!;
const jar = new Map<string, string>();
const kv = (cmd: unknown[]) => fetch(SHIM, { method: "POST", headers: { Authorization: `Bearer ${tok}` }, body: JSON.stringify(cmd) }).then((r) => r.json() as Promise<{ result: unknown }>);
async function req(path: string, init: RequestInit = {}) {
  const h = new Headers(init.headers); h.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; ")); h.set("x-forwarded-for", "198.51.100.77");
  if (init.method && init.method !== "GET") h.set("origin", A);
  const r = await fetch(A + path, { ...init, headers: h });
  for (const c of r.headers.getSetCookie()) { const [kvp] = c.split(";"); const i = kvp.indexOf("="); jar.set(kvp.slice(0, i), kvp.slice(i + 1)); }
  return r;
}
const m = new Date().toISOString().slice(0, 7);
const reset = () => kv(["DEL", `budget:bytes:${m}`, `budget:cmds:${m}`]);
const read = async () => { const r = (await kv(["MGET", `budget:bytes:${m}`, `budget:cmds:${m}`])).result as string[]; return { bytes: Number(r[0] ?? 0), commands: Number(r[1] ?? 0) }; };
await req("/");
await req("/api/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: process.env.NC_JUDGE_CODE }) });
const c = JSON.parse(readFileSync("data/cases/C012-X1.json", "utf8"));
const out: Record<string, unknown> = {};
let reviewId = "";
for (const [name, fn] of [
  ["live review with save (C012-X1)", async () => { const r = await req("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case: c, save: true, requestId: crypto.randomUUID() }) }); reviewId = ((await r.clone().json()) as { reviewId: string }).reviewId; return r; }],
  ["review page load (1 saved version)", () => req("/review/C012-X1")],
  ["history page load (1 saved version)", () => req("/review/C012-X1/history")],
  ["workspace page load", () => req("/")],
  ["case list API", () => req("/api/cases")],
  ["decision", () => req("/api/cases/C012-X1/decisions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId, findingId: "F-ACCOUNT", state: "acknowledged" }) })],
] as [string, () => Promise<Response>][]) { await reset(); const r = await fn(); await r.text(); await new Promise((s) => setTimeout(s, 200)); out[name] = { status: r.status, ...(await read()) }; }
const vid = jar.get("nc_vid")!.split(".")[0];
out["stored visitor hash bytes (1 version)"] = (await kv(["MEMORY", "USAGE", `v:${vid}`])).result;
console.log(JSON.stringify(out, null, 1));
