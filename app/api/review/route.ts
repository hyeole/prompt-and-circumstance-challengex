import { randomUUID } from "node:crypto";
import { z } from "zod";
import { reviewCase } from "@/lib/review/review";
import type { CaseRecord } from "@/lib/types";
import { findCase } from "@/lib/caseSource";
import { errorResponse, fail, is, json, sameOriginProblem } from "@/lib/http";
import { accessRequired, judgeCode, judgeSession } from "@/lib/judge";
import { metered } from "@/lib/kv";
import { ID_RE, VERSION_RESERVE_BYTES, appendVersion } from "@/lib/store";
import { REQUEST_ID_RE, RequestConflict, cancelledShared, finishRequest, isCancelled, markSaved, registerRequest, startRequest, watchSharedCancel } from "@/lib/reviewRequests";
import { admitReview, admitWrite } from "@/lib/usage";
import { clientIp, currentVisitor, judgeCookie } from "@/lib/visitor";

export const runtime = "nodejs";
export const maxDuration = 90;

const Body = z.object({
  case: z.object({
    id: z.string().max(64),
    narrative: z.object({ text: z.string().min(1).max(40_000) }).passthrough(),
    facts: z.array(z.object({ path: z.string(), label: z.string(), value: z.string().max(2_000), status: z.string() }).passthrough()).max(200),
    selectedCharges: z.array(z.object({ citation: z.string().max(200) }).passthrough()).max(5),
  }).passthrough(),
  /** Set by the review workspace: store this review as a new immutable version. Evaluation runs do not set it. */
  save: z.boolean().optional(),
  /** Client-generated id, so the workspace can cancel this request on the server (POST /api/review/cancel). */
  requestId: z.string().regex(REQUEST_ID_RE).optional(),
});

const CANCELLED = () => fail(409, "cancelled", "The review was cancelled; nothing was saved.", { cancelled: true });

/**
 * Run a review. Every refusal happens BEFORE any model call: origin, visitor, judge session (public demo), case
 * ownership, then the atomic write and review admissions (limits and this request's concurrency lease). The save is
 * atomic with the cancellation check, so a cancel received by any instance prevents it.
 */
export async function POST(req: Request) {
  const bad = sameOriginProblem(req.method, req.headers);
  if (bad) return fail(403, "origin", `Refused: ${bad}. Nothing was run.`);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid", "Invalid review request.");
  const kase = parsed.data.case as unknown as CaseRecord;
  const { requestId, save } = parsed.data;
  if (save && !ID_RE.test(kase.id)) return fail(400, "invalid", "Invalid case id.");
  const started = Date.now();
  let release = async () => {};
  let stopWatch = () => {};
  try {
    const vid = await currentVisitor();
    const ip = clientIp(req.headers);
    let judgeSid = "local";
    if (accessRequired()) {
      if (!judgeCode()) return fail(503, "access_not_configured", "Live reviews are not available: the judge access code is not configured on the server. Nothing was run.");
      if (!requestId) return fail(400, "invalid", "A request id is required.");
      const sid = await judgeSession(vid, await judgeCookie());
      if (!sid) return fail(403, "judge_required", "Live reviews need the judge access code. Nothing was run.");
      judgeSid = sid;
    }
    return await metered(async () => {
      if (save && !(await findCase(vid, kase.id))) return fail(404, "not_found", "Case not found. Nothing was run.");
      if (requestId) {
        await registerRequest(vid, requestId);
        if (await cancelledShared(requestId)) return CANCELLED(); // cancelled before it started
      }
      if (save) await admitWrite({ vid, ip }, "version", VERSION_RESERVE_BYTES);
      release = await admitReview({ vid, ip, judgeSid, requestId: requestId ?? `anon-${randomUUID()}` });

      // A cancel (from the workspace, or a beacon when the page is left; on this or another instance) or a dropped
      // connection stops the model calls and prevents saving.
      const shared = new AbortController();
      if (requestId) stopWatch = watchSharedCancel(requestId, shared);
      const signals = [req.signal, shared.signal, ...(requestId ? [startRequest(requestId, vid)] : [])];
      const result = await reviewCase(kase, undefined, AbortSignal.any(signals));
      stopWatch();
      if (isCancelled(requestId) || shared.signal.aborted || req.signal.aborted) {
        console.log(`[review] case=${kase.id} cancelled; not saved`);
        return CANCELLED();
      }
      let savedVersion: number | undefined;
      if (save) {
        const v = await appendVersion({ vid, ip }, kase.id, { narrative: kase.narrative, facts: kase.facts, selectedCharges: kase.selectedCharges }, result, { requestId, reserved: true });
        if (v === null) { console.log(`[review] case=${kase.id} cancelled before save; not saved`); return CANCELLED(); }
        markSaved(requestId, v);
        savedVersion = v;
      } else finishRequest(requestId);
      console.log(`[review] case=${result.caseId} model=${result.modelStatus} attempts=${result.modelAttempts} latencyMs=${result.latencyMs} findings=${result.findings.length}`);
      return json({ ...result, savedVersion });
    });
  } catch (e) {
    if (is<RequestConflict>(e, "RequestConflict")) return fail(409, "conflict", e.message);
    return errorResponse(e, `review after ${Date.now() - started}ms`);
  } finally {
    stopWatch();
    await release();
  }
}
