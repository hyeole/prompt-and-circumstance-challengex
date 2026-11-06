// Same-origin check for state-changing requests (hosting-free-1), shared by proxy.ts and the route handlers.
import { publicDemo } from "./deploy";

/**
 * A browser request must carry an Origin that matches this host, or Sec-Fetch-Site: same-origin. A request with
 * neither (a non-browser client) is accepted only by the local single-user tool, so the evaluation scripts keep
 * working; the public demo refuses it. Returns the reason for refusing, or null.
 */
export function sameOriginProblem(method: string, headers: Headers): string | null {
  if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) return null;
  const origin = headers.get("origin"), site = headers.get("sec-fetch-site"), host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (origin) {
    try { if (new URL(origin).host === host) return null; } catch { /* fall through */ }
    return "cross-origin request refused";
  }
  if (site) return site === "same-origin" ? null : "cross-site request refused";
  return publicDemo() ? "request without an origin refused" : null;
}
