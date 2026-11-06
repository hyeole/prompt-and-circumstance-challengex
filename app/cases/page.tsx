import Link from "next/link";
import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import CaseLibrary from "@/components/CaseLibrary";
import Icon from "@/components/Icon";
import { caseRows } from "@/lib/workspaceData";
import { savedWhere } from "@/lib/deploy";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const rows = await caseRows("app");
  return (
    <AppShell crumbs={[{ label: "Workspace", href: "/" }, { label: "Cases" }]} actions={<Link className="btn btn-primary" href="/cases/new"><Icon name="plus" size={14} /> New case</Link>}>
      <main className="page" id="main">
        <div className="page-inner">
          <h1 className="page-title">Cases</h1>
          <p className="lede">
            <strong>Adapted source records</strong> come from the public, redacted CBP release. <strong>Synthetic test variants</strong> are team-made copies with one documented edit.
            <strong> Entered cases</strong> were typed or pasted into this app. Reviews and decisions are saved {savedWhere()}.
          </p>
          <Suspense><CaseLibrary rows={rows} /></Suspense>
        </div>
      </main>
    </AppShell>
  );
}
