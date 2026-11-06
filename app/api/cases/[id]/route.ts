import { findCase, sourcePdfPath } from "@/lib/caseSource";
import { errorResponse, fail, json } from "@/lib/http";
import { metered } from "@/lib/kv";
import { ID_RE, getHistory, hasPdf } from "@/lib/store";
import { currentVisitor } from "@/lib/visitor";

export const runtime = "nodejs";

/** One case with this visitor's history. Another visitor's entered case is "not found", not "forbidden". */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_RE.test(id)) return fail(400, "invalid", "Invalid case id.");
  try {
    const vid = await currentVisitor();
    return await metered(async () => {
      const c = await findCase(vid, id);
      if (!c) return fail(404, "not_found", "Case not found.");
      const pdf = c.kind === "user-case" ? ((await hasPdf(vid, id)) ? "uploaded" : null) : c.provenance.pdfPages && sourcePdfPath() ? "public-source" : null;
      return json({ case: c, history: await getHistory(vid, id), pdf });
    });
  } catch (e) {
    return errorResponse(e, "case");
  }
}
