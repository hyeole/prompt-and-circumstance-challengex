// Key-value storage (hosting-free-1). One interface, three backends:
// - UpstashKv: the Upstash Redis REST API (public demo; also a local Redis-compatible server behind a REST shim in tests).
// - MemoryKv: an in-process twin of the Redis commands this app uses, for unit tests.
// - FileKv: MemoryKv saved to one JSON file, for the local single-user tool (replaces the old data/local JSON files).
// Atomic multi-step operations are Lua scripts (lib/kvScripts.ts); MemoryKv runs each script's JavaScript twin, which
// is checked against a real Redis-compatible server by tests/kv-contract.test.ts.
// Every storage failure raises KvError; callers fail closed (HTTP 503, nothing saved, no model call).
import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { monthlyBudget, publicDemo, utcMonth } from "./deploy";
import { SCRIPT_TWINS } from "./kvScripts";

export type Arg = string | number;
export type Cmd = Arg[];

export class KvError extends Error {
  constructor(message: string) { super(message); this.name = "KvError"; }
}
export class BudgetError extends Error {
  constructor(message: string) { super(message); this.name = "BudgetError"; }
}

// ---------- metering: storage bandwidth and commands per request, for the monthly budget

type Meter = { bytes: number; commands: number };
const meterStore = new AsyncLocalStorage<Meter>();
/** Commands a script is charged as (the provider's per-script accounting is not documented; counted conservatively). */
const SCRIPT_COMMAND_WEIGHT = 10;
function meter(cmds: Cmd[], resultText: string) {
  const m = meterStore.getStore();
  if (!m) return;
  m.bytes += JSON.stringify(cmds).length + resultText.length;
  m.commands += cmds.reduce((n, c) => n + (String(c[0]).toUpperCase() === "EVAL" ? SCRIPT_COMMAND_WEIGHT : 1), 0);
}

export interface Kv {
  readonly kind: "upstash" | "memory" | "file";
  exec(cmd: Cmd): Promise<unknown>;
  pipeline(cmds: Cmd[]): Promise<unknown[]>;
}

// ---------- Upstash REST

export class UpstashKv implements Kv {
  readonly kind = "upstash" as const;
  constructor(private url: string, private token: string, private timeoutMs = 8_000) {}
  private async post(p: string, body: unknown, cmds: Cmd[]) {
    let res: Response;
    try {
      res = await fetch(this.url.replace(/\/$/, "") + p, {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(this.timeoutMs),
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } catch {
      throw new KvError("The storage service could not be reached.");
    }
    const text = await res.text().catch(() => "");
    meter(cmds, text);
    let json: unknown;
    try { json = JSON.parse(text); } catch { throw new KvError(`The storage service answered HTTP ${res.status}.`); }
    if (!res.ok && !Array.isArray(json)) throw new KvError(`The storage service refused the request (HTTP ${res.status}).`);
    return json;
  }
  async exec(cmd: Cmd) {
    const r = (await this.post("", cmd.map(String), [cmd])) as { result?: unknown; error?: string };
    if (r.error) throw new KvError(`Storage error: ${r.error}`);
    return r.result ?? null;
  }
  async pipeline(cmds: Cmd[]) {
    if (!cmds.length) return [];
    const r = (await this.post("/pipeline", cmds.map((c) => c.map(String)), cmds)) as { result?: unknown; error?: string }[];
    if (!Array.isArray(r)) throw new KvError("Unexpected storage response.");
    return r.map((x) => { if (x.error) throw new KvError(`Storage error: ${x.error}`); return x.result ?? null; });
  }
}

// ---------- in-process twin

type Entry = { t: "s"; v: string; exp?: number } | { t: "h"; v: Record<string, string>; exp?: number } | { t: "z"; v: Record<string, number>; exp?: number };
const glob = (pattern: string) => new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");

export class MemoryKv implements Kv {
  readonly kind: "memory" | "file" = "memory";
  protected data = new Map<string, Entry>();
  /** Set by tests to simulate an outage. */
  failing = false;
  constructor(private now: () => number = Date.now) {}

  private live(k: string): Entry | undefined {
    const e = this.data.get(k);
    if (e?.exp !== undefined && e.exp <= this.now()) { this.data.delete(k); return undefined; }
    return e;
  }
  private typed<T extends Entry["t"]>(k: string, t: T): Extract<Entry, { t: T }> | undefined {
    const e = this.live(k);
    if (e && e.t !== t) throw new KvError("WRONGTYPE Operation against a key holding the wrong kind of value");
    return e as Extract<Entry, { t: T }> | undefined;
  }
  private hash(k: string) { let e = this.typed(k, "h"); if (!e) { e = { t: "h", v: {} }; this.data.set(k, e); } return e; }
  private zset(k: string) { let e = this.typed(k, "z"); if (!e) { e = { t: "z", v: {} }; this.data.set(k, e); } return e; }
  private incrby(k: string, by: number) {
    const e = this.typed(k, "s");
    const n = (e ? Number(e.v) : 0) + by;
    if (!Number.isInteger(n)) throw new KvError("ERR value is not an integer or out of range");
    this.data.set(k, { t: "s", v: String(n), exp: e?.exp });
    return n;
  }

  /** Synchronous command execution (also used by the script twins, which therefore run atomically). */
  call(...a: Arg[]): unknown {
    const [name, ...r] = a.map(String);
    const c = name.toUpperCase();
    switch (c) {
      case "GET": return this.typed(r[0], "s")?.v ?? null;
      case "MGET": return r.map((k) => this.typed(k, "s")?.v ?? null);
      case "SET": {
        const [k, v, ...opt] = r;
        const o = opt.map((x) => x.toUpperCase());
        if (o.includes("NX") && this.live(k)) return null;
        const ex = o.indexOf("EX"), px = o.indexOf("PX");
        const exp = ex >= 0 ? this.now() + Number(opt[ex + 1]) * 1000 : px >= 0 ? this.now() + Number(opt[px + 1]) : undefined;
        this.data.set(k, { t: "s", v, exp });
        return "OK";
      }
      case "DEL": return r.reduce((n, k) => n + (this.live(k) && this.data.delete(k) ? 1 : 0), 0);
      case "EXISTS": return r.reduce((n, k) => n + (this.live(k) ? 1 : 0), 0);
      case "INCR": return this.incrby(r[0], 1);
      case "INCRBY": return this.incrby(r[0], Number(r[1]));
      case "EXPIRE": case "PEXPIRE": {
        const e = this.live(r[0]);
        if (!e) return 0;
        e.exp = this.now() + Number(r[1]) * (c === "EXPIRE" ? 1000 : 1);
        return 1;
      }
      case "TTL": { const e = this.live(r[0]); return !e ? -2 : e.exp === undefined ? -1 : Math.ceil((e.exp - this.now()) / 1000); }
      case "HGET": return this.typed(r[0], "h")?.v[r[1]] ?? null;
      case "HMGET": { const e = this.typed(r[0], "h"); return r.slice(1).map((f) => e?.v[f] ?? null); }
      case "HSET": { const e = this.hash(r[0]); let n = 0; for (let i = 1; i < r.length; i += 2) { if (!(r[i] in e.v)) n++; e.v[r[i]] = r[i + 1]; } return n; }
      case "HEXISTS": return this.typed(r[0], "h")?.v[r[1]] !== undefined ? 1 : 0;
      case "HDEL": { const e = this.typed(r[0], "h"); let n = 0; for (const f of r.slice(1)) if (e && f in e.v) { delete e.v[f]; n++; } return n; }
      case "HINCRBY": { const e = this.hash(r[0]); const n = Number(e.v[r[1]] ?? 0) + Number(r[2]); e.v[r[1]] = String(n); return n; }
      case "HKEYS": return Object.keys(this.typed(r[0], "h")?.v ?? {});
      case "HSCAN": {
        // Single pass (cursor always returns "0"), like a real server for a small hash with a large COUNT.
        const e = this.typed(r[0], "h");
        const mi = r.findIndex((x) => x.toUpperCase() === "MATCH");
        const re = mi >= 0 ? glob(r[mi + 1]) : null;
        const out: string[] = [];
        for (const [f, v] of Object.entries(e?.v ?? {})) if (!re || re.test(f)) out.push(f, v);
        return ["0", out];
      }
      case "ZADD": { const e = this.zset(r[0]); let n = 0; for (let i = 1; i < r.length; i += 2) { if (!(r[i + 1] in e.v)) n++; e.v[r[i + 1]] = Number(r[i]); } return n; }
      case "ZREM": { const e = this.typed(r[0], "z"); let n = 0; for (const m of r.slice(1)) if (e && m in e.v) { delete e.v[m]; n++; } return n; }
      case "ZCARD": return Object.keys(this.typed(r[0], "z")?.v ?? {}).length;
      case "ZSCORE": { const s = this.typed(r[0], "z")?.v[r[1]]; return s === undefined ? null : String(s); }
      case "ZREMRANGEBYSCORE": {
        const e = this.typed(r[0], "z");
        const lo = r[1] === "-inf" ? -Infinity : Number(r[1]), hi = r[2] === "+inf" ? Infinity : Number(r[2]);
        let n = 0;
        for (const [m, s] of Object.entries(e?.v ?? {})) if (s >= lo && s <= hi) { delete e!.v[m]; n++; }
        return n;
      }
      case "EVAL": {
        const [script, nk, ...rest] = r;
        const twin = SCRIPT_TWINS.get(script);
        if (!twin) throw new KvError("NOSCRIPT unknown script");
        const n = Number(nk);
        return twin((...x: Arg[]) => this.call(...x), rest.slice(0, n), rest.slice(n));
      }
      default: throw new KvError(`ERR unknown command '${name}'`);
    }
  }
  protected changed() {}
  async exec(cmd: Cmd) {
    if (this.failing) throw new KvError("The storage service could not be reached.");
    const out = this.call(...cmd);
    this.changed();
    meter([cmd], JSON.stringify(out) ?? "");
    return out;
  }
  async pipeline(cmds: Cmd[]) {
    if (this.failing) throw new KvError("The storage service could not be reached.");
    const out = cmds.map((c) => this.call(...c));
    this.changed();
    meter(cmds, JSON.stringify(out));
    return out;
  }
}

/** Local single-user storage: the in-process twin, saved to one JSON file after every command (atomic rename). */
export class FileKv extends MemoryKv {
  override readonly kind = "file" as const;
  constructor(private file: string) {
    super();
    if (existsSync(file)) this.data = new Map(Object.entries(JSON.parse(readFileSync(file, "utf8")) as Record<string, Entry>));
  }
  protected override changed() {
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.data)));
    renameSync(tmp, this.file);
  }
}

// ---------- selection

const g = globalThis as unknown as { __ncKv?: Kv };
export function setKvForTests(kv: Kv | undefined) { g.__ncKv = kv; }

/**
 * The storage backend. Public demo: Upstash only; if it is not configured every storage call fails (503), never a
 * silent fallback to local files or /tmp. Local tool: Upstash if configured, else NC_KV=memory, else a local file.
 */
export function getKv(): Kv {
  if (g.__ncKv) return g.__ncKv;
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return (g.__ncKv = new UpstashKv(url, token));
  if (publicDemo()) {
    if (process.env.NC_KV === "memory" && !process.env.VERCEL) return (g.__ncKv = new MemoryKv());
    throw new KvError("Storage is not configured on the server.");
  }
  if (process.env.NC_KV === "memory") return (g.__ncKv = new MemoryKv());
  const dir = process.env.NC_STORE_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "local");
  return (g.__ncKv = new FileKv(path.join(dir, "kv.json")));
}

/**
 * Run one request's storage work under the monthly budget (public demo only). The budget is checked before any work
 * and the request's measured bandwidth and commands are added afterwards, so it can be overshot by at most the
 * requests already in flight.
 */
export async function metered<T>(fn: () => Promise<T>): Promise<T> {
  if (!publicDemo()) return fn();
  const kv = getKv();
  const m = utcMonth(), bk = `budget:bytes:${m}`, ck = `budget:cmds:${m}`;
  const acc: Meter = { bytes: 0, commands: 0 };
  return meterStore.run(acc, async () => {
    const [b, c] = (await kv.exec(["MGET", bk, ck])) as (string | null)[];
    const budget = monthlyBudget();
    if (Number(b ?? 0) >= budget.bytes || Number(c ?? 0) >= budget.commands)
      throw new BudgetError("The demo's monthly storage allowance is used up, so the demo is paused until next month. Nothing was saved.");
    try {
      return await fn();
    } finally {
      const ttl = 40 * 86_400;
      await kv.pipeline([["INCRBY", bk, acc.bytes + 200], ["EXPIRE", bk, ttl], ["INCRBY", ck, acc.commands + 4], ["EXPIRE", ck, ttl]]).catch(() => {});
    }
  });
}
