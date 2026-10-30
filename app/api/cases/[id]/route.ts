import { NextResponse } from "next/server";
import { findCase, sourcePdfPath } from "@/lib/caseSource";
import { ID_RE, getHistory, uploadedPdfPath } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Invalid case id." }, { status: 400 });
  const c = findCase(id);
  if (!c) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  const pdf = c.kind === "user-case" ? (uploadedPdfPath(id) ? "uploaded" : null) : c.provenance.pdfPages && sourcePdfPath() ? "public-source" : null;
  return NextResponse.json({ case: c, history: getHistory(id), pdf });
}
