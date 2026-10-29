import { loadCases } from "@/lib/cases";
import { REFERENCES } from "@/lib/references";
import Workspace from "@/components/Workspace";

export const dynamic = "force-dynamic";

export default function Page() {
  const cases = loadCases();
  return <Workspace cases={cases} elements={REFERENCES.requiredElements.map((e) => ({ id: e.id, label: e.label }))} referenceVersion={REFERENCES.version} referenceNotice={REFERENCES.notice} />;
}
