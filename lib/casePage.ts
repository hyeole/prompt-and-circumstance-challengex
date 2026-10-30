// Server-side loading shared by the case pages (Review, History, Report, Audit).
import "server-only";
import { notFound } from "next/navigation";
import { findCase, sourcePdfPath } from "./caseSource";
import { ID_RE, getHistory, uploadedPdfPath } from "./store";

export async function loadCasePage(params: Promise<{ id: string }>) {
  const { id: raw } = await params;
  const id = decodeURIComponent(raw);
  if (!ID_RE.test(id)) notFound();
  const kase = findCase(id);
  if (!kase) notFound();
  const history = getHistory(id);
  const pdf = kase.kind === "user-case" ? (uploadedPdfPath(id) ? "uploaded" : null) : kase.provenance.pdfPages && sourcePdfPath() ? "public-source" : null;
  return { id, kase, history, pdf };
}

export const parseVersion = (v?: string) => (v && /^\d{1,5}$/.test(v) ? Number(v) : undefined);
