import { readFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { MAX_PDF_BYTES } from "@/lib/deploy";
import { findCase, sourcePdfPath } from "@/lib/caseSource";
import { PRIVATE, errorResponse, fail, is, json, sameOriginProblem } from "@/lib/http";
import { accessRequired, judgeCode, judgeSession } from "@/lib/judge";
import { metered } from "@/lib/kv";
import { ID_RE, UploadError, getPdf, getUserCase, savePdf, saveUserCase } from "@/lib/store";
import { clientIp, currentVisitor, judgeCookie } from "@/lib/visitor";

export const runtime = "nodejs";

/** Serve the case's source PDF for viewing: this visitor's upload (entered cases) or the local public CBP PDF. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_RE.test(id)) return new NextResponse("Invalid case id.", { status: 400, headers: PRIVATE });
  try {
    const vid = await currentVisitor();
    return await metered(async () => {
      const c = await findCase(vid, id);
      const data = c?.kind === "user-case" ? await getPdf(vid, id) : c?.provenance.pdfPages && sourcePdfPath() ? readFileSync(sourcePdfPath()!) : null;
      if (!data) return new NextResponse("No source PDF is available for this case.", { status: 404, headers: PRIVATE });
      return new NextResponse(new Uint8Array(data), { headers: { ...PRIVATE, "Content-Type": "application/pdf", "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff" } });
    });
  } catch (e) {
    return errorResponse(e, "pdf");
  }
}

/**
 * Attach a PDF (at most 3 MB) to a case this visitor entered. Stored for viewing only; no text is extracted from it.
 * Public demo: needs the judge access code and passes the upload limits.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const bad = sameOriginProblem(req.method, req.headers);
  if (bad) return fail(403, "origin", `Refused: ${bad}.`);
  const { id } = await params;
  if (!ID_RE.test(id)) return fail(400, "invalid", "Invalid case id.");
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_PDF_BYTES + 64 * 1024) return fail(413, "too_large", `The PDF is larger than ${MAX_PDF_BYTES / 1024 / 1024} MB.`);
  try {
    const vid = await currentVisitor();
    return await metered(async () => {
      if (accessRequired()) {
        if (!judgeCode()) return fail(503, "access_not_configured", "PDF upload is not available: the judge access code is not configured on the server.");
        if (!(await judgeSession(vid, await judgeCookie()))) return fail(403, "judge_required", "PDF upload needs the judge access code.");
      }
      const c = await getUserCase(vid, id);
      if (!c) return fail(404, "not_found", "PDFs can only be attached to cases created in the app.");
      const form = await req.formData().catch(() => null);
      const f = form?.get("file");
      if (!(f instanceof File)) return fail(400, "invalid", "No file received.");
      if (f.size > MAX_PDF_BYTES) return fail(413, "too_large", `The PDF is larger than ${MAX_PDF_BYTES / 1024 / 1024} MB.`);
      const who = { vid, ip: clientIp(req.headers) };
      c.userCase = { ...(c.userCase ?? { createdAt: new Date().toISOString() }), sourcePdf: { originalName: f.name.slice(0, 120), size: f.size, pages: c.provenance.pdfPages } };
      await savePdf(who, id, Buffer.from(await f.arrayBuffer()), Buffer.byteLength(JSON.stringify(c)));
      await saveUserCase(who, c, null);
      return json({ ok: true });
    });
  } catch (e) {
    if (is<UploadError>(e, "UploadError")) return fail(e.status, e.status === 413 ? "too_large" : "invalid", e.message);
    return errorResponse(e, "pdf");
  }
}
