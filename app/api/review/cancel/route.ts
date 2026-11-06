import { errorResponse, fail, json, sameOriginProblem } from "@/lib/http";
import { REQUEST_ID_RE, cancelRequest, cancelShared } from "@/lib/reviewRequests";
import { currentVisitor } from "@/lib/visitor";

export const runtime = "nodejs";

/**
 * Cancel an in-flight review of THIS visitor (any other visitor's request is reported as "unknown" and left alone).
 * Also accepts sendBeacon bodies (text/plain) sent when the page is left mid-review.
 */
export async function POST(req: Request) {
  const bad = sameOriginProblem(req.method, req.headers);
  if (bad) return fail(403, "origin", `Refused: ${bad}.`);
  const body = await req.text().then((t) => JSON.parse(t) as { requestId?: string }).catch(() => null);
  if (!body?.requestId || !REQUEST_ID_RE.test(body.requestId)) return fail(400, "invalid", "Invalid request.");
  try {
    const vid = await currentVisitor();
    const local = cancelRequest(body.requestId, vid); // aborts the model calls at once if the review runs here
    const shared = await cancelShared(vid, body.requestId); // prevents the save on any instance
    if (shared.status === "saved") return json(shared);
    if (shared.status === "cancelled" || local.status === "cancelled") return json({ status: "cancelled" });
    return json({ status: local.status === "unknown" ? "unknown" : local.status, version: local.version });
  } catch (e) {
    return errorResponse(e, "cancel");
  }
}
