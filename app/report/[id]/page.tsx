import Link from "next/link";
import AppShell from "@/components/AppShell";
import PrintReport from "@/components/PrintReport";
import PrintButton from "@/components/PrintButton";
import { loadCasePage, parseVersion } from "@/lib/casePage";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const { id, kase, history } = await loadCasePage(params);
  const want = parseVersion((await searchParams).v);
  const ver = want ? history.versions.find((v) => v.version === want) : history.versions.at(-1);
  return (
    <AppShell caseId={id} crumbs={[{ label: "Workspace", href: "/" }, { label: "Cases", href: "/cases" }, { label: id, href: `/review/${encodeURIComponent(id)}` }, { label: "Report" }]}
      actions={ver ? <PrintButton label="Print or save as PDF" /> : undefined}>
      <main className="page" id="main">
        {ver ? (
          <>
            <p className="small muted no-print" style={{ maxWidth: "8.5in", margin: "0 auto 10px" }}>One-page gap report for saved version {ver.version} of {history.versions.length}{ver.version !== history.versions.length ? " (an older version)" : ""}. For every finding, full evidence and all officer notes, use the <Link href={`/audit/${encodeURIComponent(id)}?v=${ver.version}`}>detailed audit export</Link>.</p>
            <PrintReport screen kase={{ ...kase, ...ver.snapshot }} review={ver.review} decisions={history.decisions[ver.review.reviewId] ?? {}} edited={JSON.stringify(ver.snapshot.narrative.text) !== JSON.stringify(kase.narrative.text)} version={ver.version} />
          </>
        ) : (
          <div className="page-inner"><p className="empty-note">This case has no saved review yet. <Link href={`/review/${encodeURIComponent(id)}`}>Open it for review</Link>.</p></div>
        )}
      </main>
    </AppShell>
  );
}
