import { NextResponse } from "next/server";
import { REQUEST_ID_RE, cancelRequest } from "@/lib/reviewRequests";

export const runtime = "nodejs";

/** Cancel an in-flight review. Also accepts sendBeacon bodies (text/plain) sent when the page is left mid-review. */
export async function POST(req: Request) {
  const body = await req.text().then((t) => JSON.parse(t) as { requestId?: string }).catch(() => null);
  if (!body?.requestId || !REQUEST_ID_RE.test(body.requestId)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  return NextResponse.json(cancelRequest(body.requestId));
}
