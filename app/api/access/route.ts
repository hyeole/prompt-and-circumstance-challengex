import { JUDGE_SESSION_SECONDS } from "@/lib/deploy";
import { errorResponse, fail, json, sameOriginProblem } from "@/lib/http";
import { accessRequired, codeMatches, countAttempt, endJudge, grantJudge, judgeCode, judgeSession } from "@/lib/judge";
import { metered } from "@/lib/kv";
import { JUDGE_COOKIE, clientIp, currentVisitor, judgeCookie } from "@/lib/visitor";

export const runtime = "nodejs";

const cookieOpts = (req: Request, maxAge: number) => ({
  httpOnly: true, sameSite: "strict" as const, path: "/", maxAge,
  secure: (req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "")) === "https",
});

/** Whether live reviews need the code here, whether it is configured, and whether this browser has a session. */
export async function GET() {
  try {
    if (!accessRequired()) return json({ required: false, configured: true, active: true });
    const vid = await currentVisitor();
    const active = await metered(async () => !!(await judgeSession(vid, await judgeCookie())));
    return json({ required: true, configured: !!judgeCode(), active });
  } catch (e) {
    return errorResponse(e, "access");
  }
}

/** Check a judge access code; on success start a 12-hour session bound to this browser's visitor id. */
export async function POST(req: Request) {
  const bad = sameOriginProblem(req.method, req.headers);
  if (bad) return fail(403, "origin", `Refused: ${bad}.`);
  if (!accessRequired()) return json({ active: true });
  const code = judgeCode();
  if (!code) return fail(503, "access_not_configured", "The judge access code is not configured on the server.");
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const input = typeof body?.code === "string" ? body.code.trim().slice(0, 200) : "";
  try {
    const vid = await currentVisitor();
    return await metered(async () => {
      await countAttempt(vid, clientIp(req.headers));
      if (!input || !codeMatches(input, code)) return fail(401, "wrong_code", "That access code is not correct.");
      const res = json({ active: true, expiresInSeconds: JUDGE_SESSION_SECONDS });
      res.cookies.set(JUDGE_COOKIE, await grantJudge(vid), cookieOpts(req, JUDGE_SESSION_SECONDS));
      return res;
    });
  } catch (e) {
    return errorResponse(e, "access");
  }
}

/** End this browser's judge session. */
export async function DELETE(req: Request) {
  const bad = sameOriginProblem(req.method, req.headers);
  if (bad) return fail(403, "origin", `Refused: ${bad}.`);
  try {
    const vid = await currentVisitor();
    if (accessRequired()) await metered(async () => endJudge(vid, await judgeCookie()));
    const res = json({ active: false });
    res.cookies.set(JUDGE_COOKIE, "", cookieOpts(req, 0));
    return res;
  } catch (e) {
    return errorResponse(e, "access");
  }
}
