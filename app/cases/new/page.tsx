import AppShell from "@/components/AppShell";
import IntakeForm from "@/components/IntakeForm";

export default function NewCasePage() {
  return (
    <AppShell crumbs={[{ label: "Workspace", href: "/" }, { label: "Cases", href: "/cases" }, { label: "New case" }]}>
      <main className="page" id="main">
        <div className="page-inner" style={{ maxWidth: 900 }}>
          <h1 className="page-title">New case</h1>
          <p className="lede">Enter an officer-written narrative, the form fields as recorded, and the officer-selected charge. You will see a preview before anything is saved.</p>
          <IntakeForm />
        </div>
      </main>
    </AppShell>
  );
}
