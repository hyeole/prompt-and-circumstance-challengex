import Link from "next/link";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import { GroupTag, StatePill, fmtDate } from "@/components/StateTag";
import { caseRows } from "@/lib/workspaceData";
import { savedWhere } from "@/lib/deploy";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ case?: string; set?: string }> }) {
  // Old links (/?case=ID) still open the review page.
  const { case: legacy, set } = await searchParams;
  if (legacy) {
    const { redirect } = await import("next/navigation");
    redirect(`/review/${encodeURIComponent(legacy)}${set === "eval" ? "?set=eval" : ""}`);
  }
  const rows = await caseRows("app");
  const recent = rows.filter((r) => r.lastReviewedAt).sort((a, b) => b.lastReviewedAt!.localeCompare(a.lastReviewedAt!)).slice(0, 8);
  // Every case whose latest review is incomplete or has any finding without an officer decision (audit item 8),
  // whether or not that review required human review.
  const pending = rows.filter((r) => r.state === "incomplete" || (r.openDecisions ?? 0) > 0);
  const count = (s: string) => rows.filter((r) => r.state === s).length;

  return (
    <AppShell crumbs={[{ label: "Workspace" }]} actions={<Link className="btn btn-primary" href="/cases/new"><Icon name="plus" size={14} /> New case</Link>}>
      <main className="page" id="main">
        <div className="page-inner">
          <h1 className="page-title">Workspace</h1>
          <p className="lede">Review officer-written narratives against the case facts and the selected charge. Everything shown here is saved {savedWhere()}.</p>

          <div className="stat-row" aria-label="Cases by review status">
            <Link className="stat" href="/cases?state=not_reviewed"><div className="n">{count("not_reviewed")}</div><div className="l">Not reviewed</div></Link>
            <Link className="stat" href="/cases?state=incomplete"><div className="n">{count("incomplete")}</div><div className="l">Review incomplete</div></Link>
            <Link className="stat" href="/cases?state=needs_human_review"><div className="n">{count("needs_human_review")}</div><div className="l">Needs human review</div></Link>
            <Link className="stat" href="/cases?state=reviewed"><div className="n">{count("reviewed")}</div><div className="l">Reviewed</div></Link>
          </div>

          <div className="grid-2">
            <section className="panel" aria-labelledby="pending-h">
              <h2 id="pending-h">Pending officer actions <span className="count">{pending.length}</span></h2>
              {pending.length === 0 ? (
                <p className="empty-note">Nothing pending. Cases appear here when a review is incomplete or has findings without an officer decision.</p>
              ) : (
                <ul className="list-plain">
                  {pending.map((r) => (
                    <li key={r.id}>
                      <Link className="row-link" href={`/review/${encodeURIComponent(r.id)}`}>
                        <span className="t">{r.title}</span>
                        <StatePill state={r.state} />
                        <span className="s">
                          <span className="mono">{r.id}</span> · {r.state === "incomplete" ? "the last review did not complete; run a fresh review" : `${r.openDecisions} of ${r.findings} finding(s) without an officer decision`} · {fmtDate(r.lastReviewedAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel" aria-labelledby="recent-h">
              <h2 id="recent-h">Recently reviewed <Link href="/cases" className="btn btn-ghost btn-sm">All cases</Link></h2>
              {recent.length === 0 ? (
                <p className="empty-note">No saved reviews yet. Open a case and run a review, or <Link href="/cases/new">enter a new case</Link>.</p>
              ) : (
                <ul className="list-plain">
                  {recent.map((r) => (
                    <li key={r.id}>
                      <Link className="row-link" href={`/review/${encodeURIComponent(r.id)}`}>
                        <span className="t">{r.title}</span>
                        <StatePill state={r.state} />
                        <span className="s"><span className="mono">{r.id}</span> · <GroupTag group={r.group} /> · version {r.versions} · {r.findings} finding(s) · {fmtDate(r.lastReviewedAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
