import ReviewWorkspace from "@/components/ReviewWorkspace";
import { loadCasePage, parseVersion } from "@/lib/casePage";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const { kase, history, pdf, access } = await loadCasePage(params);
  const { v } = await searchParams;
  return <ReviewWorkspace key={kase.id} kase={kase} initialHistory={history} pdf={pdf} viewVersion={parseVersion(v)} access={access} />;
}
