// Runs before every page and API request (Next 16 "proxy", formerly middleware; Node.js runtime). hosting-free-1:
// 1. Refuses cross-origin state-changing API requests (route handlers check again).
// 2. Gives each browser a signed visitor id cookie (nc_vid) and passes it to this same request; refreshes it on every
//    visit so it outlives the data it points to.
// 3. Marks every response private and uncacheable, so pages and API responses with a visitor's data never enter a
//    shared (CDN or proxy) cache.
// Authorization is NOT decided here: every route handler and server page verifies the visitor and judge session itself.
import { NextResponse, type NextRequest } from "next/server";
import { sameOriginProblem } from "./lib/originCheck";
import { VID_COOKIE, VID_RE, newVisitorId, sign, verify, visitorCookieOptions, visitorSecret } from "./lib/visitor";

export function proxy(req: NextRequest) {
  const isApi = req.nextUrl.pathname.startsWith("/api/");
  if (isApi) {
    const bad = sameOriginProblem(req.method, req.headers);
    if (bad) return NextResponse.json({ code: "origin", error: `Refused: ${bad}.` }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  }
  const secret = visitorSecret();
  if (!secret) {
    return new NextResponse("The server is not configured (visitor secret missing).", { status: 503, headers: { "Cache-Control": "private, no-store", "Content-Type": "text/plain" } });
  }
  const existing = verify(req.cookies.get(VID_COOKIE)?.value, "vid", secret);
  const vid = existing && VID_RE.test(existing) ? existing : newVisitorId();
  const token = sign(vid, "vid", secret);
  let res: NextResponse;
  if (existing === vid) {
    res = NextResponse.next();
  } else {
    // Pass the new cookie to this request too, so a first visit already has a visitor id.
    const headers = new Headers(req.headers);
    const others = (req.headers.get("cookie") ?? "").split(/;\s*/).filter((c) => c && !c.startsWith(`${VID_COOKIE}=`));
    headers.set("cookie", [...others, `${VID_COOKIE}=${token}`].join("; "));
    res = NextResponse.next({ request: { headers } });
  }
  const secure = (req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")) === "https";
  res.cookies.set(VID_COOKIE, token, visitorCookieOptions(secure));
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Vary", "Cookie");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
