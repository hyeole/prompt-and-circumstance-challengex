import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewCase } from "@/lib/review/review";
import type { CaseRecord } from "@/lib/types";
import { ID_RE, appendVersion } from "@/lib/store";

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
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
  const started = Date.now();
  try {
    const kase = parsed.data.case as unknown as CaseRecord;
    const result = await reviewCase(kase);
    let savedVersion: number | undefined;
    if (parsed.data.save && ID_RE.test(kase.id)) {
      savedVersion = appendVersion(kase.id, { narrative: kase.narrative, facts: kase.facts, selectedCharges: kase.selectedCharges }, result);
    }
    console.log(`[review] case=${result.caseId} model=${result.modelStatus} attempts=${result.modelAttempts} latencyMs=${result.latencyMs} findings=${result.findings.length}`);
    return NextResponse.json({ ...result, savedVersion });
  } catch (e) {
    console.error(`[review] unexpected failure after ${Date.now() - started}ms:`, (e as Error).message);
    return NextResponse.json({ error: "The review could not be completed." }, { status: 500 });
  }
}
