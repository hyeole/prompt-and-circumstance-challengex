import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import HistoryView from "@/components/HistoryView";
import { loadCasePage } from "@/lib/casePage";

export const dynamic = "force-dynamic";

export default async function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id, kase, history } = await loadCasePage(params);
  return (
    <AppShell caseId={id} crumbs={[{ label: "Workspace", href: "/" }, { label: "Cases", href: "/cases" }, { label: id, href: `/review/${encodeURIComponent(id)}` }, { label: "Review history" }]}>
      <main className="page" id="main">
        <div className="page-inner">
          <h1 className="page-title">Review history <span className="mono small muted">{id}</span></h1>
          <p className="lede">Every review is saved as a version that is never changed: the narrative, facts and charge that were reviewed, the result, and the officer&apos;s decisions. {kase.title}.</p>
          <Suspense><HistoryView kase={kase} history={history} /></Suspense>
        </div>
      </main>
    </AppShell>
  );
}
