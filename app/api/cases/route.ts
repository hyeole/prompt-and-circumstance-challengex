import { NextResponse } from "next/server";
import { z } from "zod";
import { allCases } from "@/lib/caseSource";
import { historySummary, newUserCaseId, saveUserCase } from "@/lib/store";
import type { CaseRecord } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const set = new URL(req.url).searchParams.get("set") === "eval" ? "eval" : "app";
  return NextResponse.json(allCases(set).map((c) => ({ id: c.id, title: c.title, kind: c.kind, summary: historySummary(c.id) })));
}

const FACT_PATHS = ["subject.citizenship", "subject.birthplace", "subject.age", "subject.us_address", "entry.date", "entry.place", "entry.manner",
  "status.at_entry", "status.when_found", "encounter.date_time", "encounter.location", "encounter.method", "history.immigration_record",
  "history.criminal_record", "form.charge_code", "documents.passport", "documents.visa_issued"] as const;

const NewCase = z.object({
  title: z.string().trim().min(3).max(160),
  narrative: z.string().trim().min(40).max(40_000),
  textOrigin: z.enum(["officer-entered", "transcribed-from-source", "synthetic-test"]),
  sourceDescription: z.string().max(300).optional(),
  pdfPages: z.array(z.number().int().min(1).max(5000)).max(50).optional(),
  facts: z.array(z.object({ path: z.enum(FACT_PATHS), label: z.string().max(80), value: z.string().max(500), status: z.enum(["present", "redacted", "absent", "unreadable", "not_applicable"]) })).max(40),
  charges: z.array(z.string().trim().min(3).max(100)).min(1).max(5),
});

export async function POST(req: Request) {
  const parsed = NewCase.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the case details.", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
  const d = parsed.data;
  const id = newUserCaseId();
  const origin = { "officer-entered": "Typed or pasted by the user as officer-written text", "transcribed-from-source": "Transcribed by the user from a source document", "synthetic-test": "Synthetic test text written by the user" }[d.textOrigin];
  const c: CaseRecord = {
    id, title: d.title, kind: "user-case",
    provenance: {
      source: d.sourceDescription?.trim() || "Entered in NarrativeCheck",
      pdfPages: d.pdfPages?.length ? d.pdfPages : undefined,
      extraction: `${origin}. NarrativeCheck did not read text from any attached PDF; the narrative is exactly what was entered.`,
      verification: "Entered by the user; not verified by NarrativeCheck.",
      replacements: [],
      textOrigin: d.textOrigin,
    },
    narrative: { text: d.narrative },
    facts: d.facts.map((f) => ({ ...f, value: f.status === "present" ? f.value.trim() : "" })),
    selectedCharges: d.charges.map((citation) => ({ citation, source: "officer-selected" as const })),
    userCase: { createdAt: new Date().toISOString() },
  };
  saveUserCase(c);
  return NextResponse.json({ id });
}
