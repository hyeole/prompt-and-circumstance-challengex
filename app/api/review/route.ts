import { randomUUID } from "node:crypto";
import { z } from "zod";
import { reviewCase } from "@/lib/review/review";
import type { CaseRecord } from "@/lib/types";
import { findCase } from "@/lib/caseSource";
import { publicDemo } from "@/lib/deploy";
import { errorResponse, fail, is, json, sameOriginProblem } from "@/lib/http";
import { accessRequired, judgeCode, judgeSession } from "@/lib/judge";
import { metered } from "@/lib/kv";
import { BodyTooLarge, EditableCase, MAX_REVIEW_BODY_BYTES, mergeEdits, readBodyLimited } from "@/lib/reviewInput";
import { ID_RE, SaveRefused, appendVersion, versionReserveBytes } from "@/lib/store";
import { REQUEST_ID_RE, RequestConflict, cancelledShared, finishRequest, isCancelled, markSaved, registerRequest, startRequest, watchSharedCancel } from "@/lib/reviewRequests";
import { admitReview, type Admission } from "@/lib/usage";
import { clientIp, currentVisitor, judgeCookie } from "@/lib/visitor";

export const runtime = "nodejs";
export const maxDuration = 90;

/** Local evaluation runs (save unset, local tool only) still post a whole case; validated as before. */
const LegacyCase = z.object({
  id: z.string().max(64),
  narrative: z.object({ text: z.string().min(1).max(40_000) }).passthrough(),
  facts: z.array(z.object({ path: z.string(), label: z.string(), value: z.string().max(2_000), status: z.string() }).passthrough()).max(200),
  selectedCharges: z.array(z.object({ citation: z.string().max(200) }).passthrough()).max(5),
}).passthrough();

const Body = z.object({
  case: z.object({ id: z.string().max(64) }).passthrough(),
  /** Set by the review workspace: store this review as a new immutable version. Evaluation runs do not set it. */
  save: z.boolean().optional(),
  /** Client-generated id, so the workspace can cancel this request on the server (POST /api/review/cancel). */
  requestId: z.string().regex(REQUEST_ID_RE).optional(),
});

const CANCELLED = () => fail(409, "cancelled", "The review was cancelled; nothing was saved.", { cancelled: true });

/**
 * Run a review. Every refusal happens BEFORE any model call: body size, origin, visitor, judge session (public demo),
 * case ownership, the one-execution claim on the request id, then ONE atomic admission of the review and the capacity
 * to save it. The save is atomic with the cancellation, duplicate and byte-limit checks, so a cancel received by any
 * instance prevents it, a request id saves at most once, and byte limits are never exceeded.
 */
export async function POST(req: Request) {
  const bad = sameOriginProblem(req.method, req.headers);
  if (bad) return fail(403, "origin", `Refused: ${bad}. Nothing was run.`);
  let raw: unknown;
  try {
    raw = JSON.parse(await readBodyLimited(req));
  } catch (e) {
    if (is<BodyTooLarge>(e, "BodyTooLarge")) return fail(413, "too_large", `The review request is larger than ${MAX_REVIEW_BODY_BYTES / 1000} KB. Nothing was run.`);
    return fail(400, "invalid", "Invalid review request.");
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return fail(400, "invalid", "Invalid review request.");
  const { requestId, save } = parsed.data;
  const caseId = parsed.data.case.id;
  if (save && !ID_RE.test(caseId)) return fail(400, "invalid", "Invalid case id.");
  const started = Date.now();
  let admission: Admission | null = null;
  let saved = false;
  let stopWatch = () => {};
  try {
    const vid = await currentVisitor();
    const ip = clientIp(req.headers);
    return await metered(async () => {
      let judgeSid = "local";
      if (accessRequired()) {
        if (!judgeCode()) return fail(503, "access_not_configured", "Live reviews are not available: the judge access code is not configured on the server. Nothing was run.");
        if (!requestId) return fail(400, "invalid", "A request id is required.");
        const sid = await judgeSession(vid, await judgeCookie());
        if (!sid) return fail(403, "judge_required", "Live reviews need the judge access code. Nothing was run.");
        judgeSid = sid;
      }

      // The case under review: in the public demo, and whenever the result is saved, the server's own record with the
      // client's edits to the editable fields only. Local evaluation runs (no save) keep posting a whole case.
      let kase: CaseRecord;
      if (save || publicDemo()) {
        const edits = EditableCase.safeParse(parsed.data.case);
        if (!edits.success) return fail(400, "invalid", "Invalid review request.");
        const server = ID_RE.test(caseId) ? await findCase(vid, caseId) : null;
        if (!server) return fail(404, "not_found", "Case not found. Nothing was run.");
        kase = mergeEdits(server, edits.data);
      } else {
        const legacy = LegacyCase.safeParse(parsed.data.case);
        if (!legacy.success) return fail(400, "invalid", "Invalid review request.");
        kase = legacy.data as unknown as CaseRecord;
      }
      const snapshot = { narrative: kase.narrative, facts: kase.facts, selectedCharges: kase.selectedCharges };

      if (requestId && (await registerRequest(vid, requestId)) === "cancelled") return CANCELLED(); // cancelled before it started
      const reservedBytes = save ? versionReserveBytes(snapshot) : undefined;
      admission = await admitReview({ vid, ip, judgeSid, requestId: requestId ?? `anon-${randomUUID()}`, saveBytes: reservedBytes });

      // A cancel (from the workspace, or a beacon when the page is left; on this or another instance) or a dropped
      // connection stops the model calls and prevents saving.
      const shared = new AbortController();
      if (requestId) stopWatch = watchSharedCancel(requestId, shared);
      const signals = [req.signal, shared.signal, ...(requestId ? [startRequest(requestId, vid)] : [])];
      const result = await reviewCase(kase, undefined, AbortSignal.any(signals));
      stopWatch();
      if (isCancelled(requestId) || shared.signal.aborted || req.signal.aborted || (requestId && (await cancelledShared(requestId)))) {
        console.log(`[review] case=${kase.id} cancelled; not saved`);
        return CANCELLED();
      }
      let savedVersion: number | undefined;
      if (save) {
        const v = await appendVersion({ vid, ip }, kase.id, snapshot, result, { requestId, reservedBytes });
        if (v === null) { console.log(`[review] case=${kase.id} cancelled before save; not saved`); return CANCELLED(); }
        saved = true;
        markSaved(requestId, v);
        savedVersion = v;
      } else finishRequest(requestId);
      console.log(`[review] case=${result.caseId} model=${result.modelStatus} attempts=${result.modelAttempts} latencyMs=${result.latencyMs} findings=${result.findings.length}`);
      return json({ ...result, savedVersion });
    });
  } catch (e) {
    if (is<RequestConflict>(e, "RequestConflict")) return fail(409, "conflict", e.message);
    if (is<SaveRefused>(e, "SaveRefused")) return fail(409, e.code, e.message);
    return errorResponse(e, `review after ${Date.now() - started}ms`);
  } finally {
    stopWatch();
    const a = admission as Admission | null;
    if (a) {
      if (save && !saved) await a.refundSave(); // the review ran but nothing was saved: return the save capacity
      await a.release();
    }
  }
}
