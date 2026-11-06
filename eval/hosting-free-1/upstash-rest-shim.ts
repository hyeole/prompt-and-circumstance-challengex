// OFFLINE TEST BACKEND for hosting-free-1. NOT Upstash and not used in any deployment.
// A local HTTP server speaking the Upstash Redis REST protocol (POST / with one command, POST /pipeline with several)
// in front of a local Valkey (Redis-compatible) server, so the app's real UpstashKv code path, including the Lua
// scripts, runs against a real Redis-compatible engine offline.
// Failure modes for fail-closed checks: POST /__mode {"mode":"ok"|"down"|"http500"}
//   down    - the connection is dropped (as if the service were unreachable)
//   http500 - every command gets HTTP 500
// Usage: VALKEY_PORT=6390 PORT=8079 SHIM_TOKEN=<test token> npx tsx eval/hosting-free-1/upstash-rest-shim.ts
import http from "node:http";
import net from "node:net";

const VALKEY_PORT = Number(process.env.VALKEY_PORT ?? 6390);
const PORT = Number(process.env.PORT ?? 8079);
const TOKEN = process.env.SHIM_TOKEN ?? "local-shim-token";
let mode = "ok";
let commands = 0;

type Resp = string | number | null | Resp[] | { error: string };

function encode(args: string[]) {
  return Buffer.concat([Buffer.from(`*${args.length}\r\n`), ...args.map((a) => { const b = Buffer.from(a); return Buffer.concat([Buffer.from(`$${b.length}\r\n`), b, Buffer.from("\r\n")]); })]);
}

function parse(buf: Buffer, at: number): [Resp, number] | null {
  if (at >= buf.length) return null;
  const end = buf.indexOf("\r\n", at);
  if (end < 0) return null;
  const type = String.fromCharCode(buf[at]), line = buf.toString("utf8", at + 1, end);
  if (type === "+") return [line, end + 2];
  if (type === "-") return [{ error: line }, end + 2];
  if (type === ":") return [Number(line), end + 2];
  if (type === "$") {
    const n = Number(line);
    if (n < 0) return [null, end + 2];
    if (buf.length < end + 2 + n + 2) return null;
    return [buf.toString("utf8", end + 2, end + 2 + n), end + 2 + n + 2];
  }
  if (type === "*") {
    const n = Number(line);
    if (n < 0) return [null, end + 2];
    const out: Resp[] = [];
    let p = end + 2;
    for (let i = 0; i < n; i++) { const r = parse(buf, p); if (!r) return null; out.push(r[0]); p = r[1]; }
    return [out, p];
  }
  throw new Error(`unexpected RESP type ${type}`);
}

function send(cmds: string[][]): Promise<Resp[]> {
  return new Promise((resolve, reject) => {
    const sock = net.connect(VALKEY_PORT, "127.0.0.1");
    let buf = Buffer.alloc(0);
    sock.on("connect", () => sock.write(Buffer.concat(cmds.map(encode))));
    sock.on("data", (d: Buffer) => {
      buf = Buffer.concat([buf, d]);
      const out: Resp[] = [];
      let p = 0;
      for (let i = 0; i < cmds.length; i++) { const r = parse(buf, p); if (!r) return; out.push(r[0]); p = r[1]; }
      sock.end();
      resolve(out);
    });
    sock.on("error", reject);
  });
}

const wrap = (r: Resp) => (r && typeof r === "object" && !Array.isArray(r) && "error" in r ? { error: r.error } : { result: r });

http.createServer((req, res) => {
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", async () => {
    const reply = (status: number, v: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(v)); };
    if (req.url === "/__mode") { if (req.method === "POST") mode = (JSON.parse(body || "{}") as { mode?: string }).mode ?? "ok"; return reply(200, { mode, commands }); }
    if (mode === "down") { req.socket.destroy(); return; }
    if (mode === "http500") return reply(500, { error: "simulated outage" });
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return reply(401, { error: "Unauthorized" });
    try {
      const parsed = JSON.parse(body) as unknown;
      if (req.url === "/pipeline") {
        const cmds = (parsed as unknown[][]).map((c) => c.map(String));
        commands += cmds.length;
        return reply(200, (await send(cmds)).map(wrap));
      }
      const cmd = (parsed as unknown[]).map(String);
      commands += 1;
      const [r] = await send([cmd]);
      const w = wrap(r);
      return reply("error" in w ? 400 : 200, w);
    } catch (e) {
      return reply(500, { error: (e as Error).message });
    }
  });
}).listen(PORT, "127.0.0.1", () => console.log(`upstash-rest shim on ${PORT} -> valkey ${VALKEY_PORT}`));
