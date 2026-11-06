// Server-side loading shared by the case pages (Review, History, Report, Audit). Reads only the current visitor's data.
import "server-only";
import { notFound } from "next/navigation";
import { findCase, sourcePdfPath } from "./caseSource";
import { accessRequired, judgeCode, judgeSession } from "./judge";
import { metered } from "./kv";
import { ID_RE, getHistory, hasPdf } from "./store";
import { currentVisitor, judgeCookie } from "./visitor";

export type Access = { required: boolean; configured: boolean; active: boolean };

export async function loadCasePage(params: Promise<{ id: string }>) {
  const { id: raw } = await params;
  const id = decodeURIComponent(raw);
  if (!ID_RE.test(id)) notFound();
  const vid = await currentVisitor();
  return metered(async () => {
    const kase = await findCase(vid, id);
    if (!kase) notFound();
    const history = await getHistory(vid, id);
    const pdf = kase.kind === "user-case" ? ((await hasPdf(vid, id)) ? "uploaded" : null) : kase.provenance.pdfPages && sourcePdfPath() ? "public-source" : null;
    const access: Access = { required: accessRequired(), configured: !!judgeCode(), active: accessRequired() ? !!(await judgeSession(vid, await judgeCookie())) : true };
    return { id, kase, history, pdf, access };
  });
}

export const parseVersion = (v?: string) => (v && /^\d{1,5}$/.test(v) ? Number(v) : undefined);
