import Link from "next/link";
import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import CaseLibrary from "@/components/CaseLibrary";
import Icon from "@/components/Icon";
import { caseRows } from "@/lib/workspaceData";

export const dynamic = "force-dynamic";

export default function CasesPage() {
  const rows = caseRows("app");
  return (
    <AppShell crumbs={[{ label: "Workspace", href: "/" }, { label: "Cases" }]} actions={<Link className="btn btn-primary" href="/cases/new"><Icon name="plus" size={14} /> New case</Link>}>
      <main className="page" id="main">
        <div className="page-inner">
          <h1 className="page-title">Cases</h1>
          <p className="lede">
            <strong>Adapted source records</strong> come from the public, redacted CBP release. <strong>Synthetic test variants</strong> are team-made copies with one documented edit.
            <strong> Entered cases</strong> were typed or pasted into this app. Reviews and decisions are saved on this computer.
          </p>
          <Suspense><CaseLibrary rows={rows} /></Suspense>
        </div>
      </main>
    </AppShell>
  );
}
