// All cases the workspace can open: read-only sample cases (data/cases or eval/cases) plus cases created in the app.
import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadCases } from "./cases";
import { getUserCase, listUserCases } from "./store";
import type { CaseRecord } from "./types";

export function allCases(set: "app" | "eval" = "app"): CaseRecord[] {
  return set === "eval" ? loadCases("eval") : [...listUserCases(), ...loadCases("app")];
}

export function findCase(id: string): CaseRecord | null {
  return getUserCase(id) ?? loadCases("app").find((c) => c.id === id) ?? loadCases("eval").find((c) => c.id === id) ?? null;
}

/** The public CBP PDF is kept locally (never committed). Its page numbers match the sample cases' source pages. */
export function sourcePdfPath(): string | null {
  const p = process.env.NC_SOURCE_PDF ?? path.join(process.cwd(), "reference-materials", "Detroit Sector Forms I-213 and I-44 FY 2012 – 2019 Part 5_0.pdf");
  return existsSync(p) ? p : null;
}
