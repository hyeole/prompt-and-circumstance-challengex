import { NextResponse } from "next/server";
import { z } from "zod";
import { ID_RE, setDecision } from "@/lib/store";

export const runtime = "nodejs";

const Body = z.object({ reviewId: z.string().max(64), findingId: z.string().max(64), state: z.enum(["open", "acknowledged", "dismissed"]), note: z.string().max(1000).optional() });

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!ID_RE.test(id) || !parsed.success) return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  if (parsed.data.state === "dismissed" && !parsed.data.note?.trim()) return NextResponse.json({ error: "A dismissal needs a reason." }, { status: 400 });
  try {
    return NextResponse.json(setDecision(id, parsed.data.reviewId, parsed.data.findingId, parsed.data));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
