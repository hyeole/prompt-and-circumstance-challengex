import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewCase } from "@/lib/review/review";
import type { CaseRecord } from "@/lib/types";
import { ID_RE, appendVersion } from "@/lib/store";
import { REQUEST_ID_RE, finishRequest, isCancelled, saveUnlessCancelled, startRequest } from "@/lib/reviewRequests";

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

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
  const started = Date.now();
  try {
    const kase = parsed.data.case as unknown as CaseRecord;
    const { requestId } = parsed.data;
    // A cancel (from the workspace, or a beacon when the page is left) or a dropped connection stops the model calls
    // and prevents saving.
    const signals = [req.signal, ...(requestId ? [startRequest(requestId)] : [])];
    const result = await reviewCase(kase, undefined, AbortSignal.any(signals));
    if (isCancelled(requestId) || req.signal.aborted) {
      console.log(`[review] case=${kase.id} cancelled; not saved`);
      return NextResponse.json({ cancelled: true, error: "The review was cancelled; nothing was saved." }, { status: 409 });
    }
    let savedVersion: number | undefined;
    if (parsed.data.save && ID_RE.test(kase.id)) {
      const v = saveUnlessCancelled(requestId, () => appendVersion(kase.id, { narrative: kase.narrative, facts: kase.facts, selectedCharges: kase.selectedCharges }, result));
      if (v === null) return NextResponse.json({ cancelled: true, error: "The review was cancelled; nothing was saved." }, { status: 409 });
      savedVersion = v;
    } else finishRequest(requestId);
    console.log(`[review] case=${result.caseId} model=${result.modelStatus} attempts=${result.modelAttempts} latencyMs=${result.latencyMs} findings=${result.findings.length}`);
    return NextResponse.json({ ...result, savedVersion });
  } catch (e) {
    console.error(`[review] unexpected failure after ${Date.now() - started}ms:`, (e as Error).message);
    return NextResponse.json({ error: "The review could not be completed." }, { status: 500 });
  }
}
