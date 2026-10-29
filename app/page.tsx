import { loadCases } from "@/lib/cases";
import { REFERENCES } from "@/lib/references";
import Workspace from "@/components/Workspace";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ set?: string; case?: string }> }) {
  const { set, case: initial } = await searchParams;
  const cases = loadCases(set === "eval" ? "eval" : "app");
  return (
    <Workspace
      cases={cases}
      initialCaseId={cases.some((c) => c.id === initial) ? initial : undefined}
      caseSet={set === "eval" ? "eval" : "app"}
      elements={REFERENCES.requiredElements.map((e) => ({ id: e.id, label: e.label }))}
      referenceVersion={REFERENCES.version}
      referenceNotice={REFERENCES.notice}
    />
  );
}
