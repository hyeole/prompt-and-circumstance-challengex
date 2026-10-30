import { readFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { findCase, sourcePdfPath } from "@/lib/caseSource";
import { ID_RE, getUserCase, saveUserCase, savePdf, uploadedPdfPath } from "@/lib/store";

export const runtime = "nodejs";
const MAX = 25 * 1024 * 1024;

/** Serve the case's source PDF for viewing: an uploaded file (user cases) or the local public CBP PDF (sample cases). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_RE.test(id)) return new NextResponse("Invalid case id.", { status: 400 });
  const c = findCase(id);
  const file = c?.kind === "user-case" ? uploadedPdfPath(id) : c?.provenance.pdfPages ? sourcePdfPath() : null;
  if (!file) return new NextResponse("No source PDF is available for this case on this computer.", { status: 404 });
  return new NextResponse(readFileSync(file), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}

/** Attach a PDF to a user-created case. The PDF is stored locally for viewing only; no text is extracted from it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = ID_RE.test(id) ? getUserCase(id) : null;
  if (!c) return NextResponse.json({ error: "PDFs can only be attached to cases created in the app." }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const f = form?.get("file");
  if (!(f instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (f.size > MAX) return NextResponse.json({ error: "The PDF is larger than 25 MB." }, { status: 413 });
  try {
    savePdf(id, Buffer.from(await f.arrayBuffer()));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  c.userCase = { ...(c.userCase ?? { createdAt: new Date().toISOString() }), sourcePdf: { originalName: f.name.slice(0, 120), size: f.size, pages: c.provenance.pdfPages } };
  saveUserCase(c);
  return NextResponse.json({ ok: true });
}
