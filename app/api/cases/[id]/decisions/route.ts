import { z } from "zod";
import { findCase } from "@/lib/caseSource";
import { errorResponse, fail, is, json, sameOriginProblem } from "@/lib/http";
import { metered } from "@/lib/kv";
import { DecisionError, ID_RE, PART_RE, setDecision } from "@/lib/store";
import { clientIp, currentVisitor } from "@/lib/visitor";

export const runtime = "nodejs";

const Body = z.object({ reviewId: z.string().regex(PART_RE), findingId: z.string().regex(PART_RE), state: z.enum(["open", "acknowledged", "dismissed"]), note: z.string().max(1000).optional() });

/** Record an officer decision on one of this visitor's saved reviews. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const bad = sameOriginProblem(req.method, req.headers);
  if (bad) return fail(403, "origin", `Refused: ${bad}.`);
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!ID_RE.test(id) || !parsed.success) return fail(400, "invalid", "Invalid decision.");
  if (parsed.data.state === "dismissed" && !parsed.data.note?.trim()) return fail(400, "invalid", "A dismissal needs a reason.");
  try {
    const vid = await currentVisitor();
    return await metered(async () => {
      if (!(await findCase(vid, id))) return fail(404, "not_found", "Case not found.");
      return json(await setDecision({ vid, ip: clientIp(req.headers) }, id, parsed.data.reviewId, parsed.data.findingId, parsed.data));
    });
  } catch (e) {
    if (is<DecisionError>(e, "DecisionError")) return fail(404, "not_found", e.message);
    return errorResponse(e, "decision");
  }
}
