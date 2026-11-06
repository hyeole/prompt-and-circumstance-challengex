// All cases the workspace can open: read-only sample cases (data/cases; the evaluation sets only in the local tool)
// plus the cases this visitor entered in the app.
import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadCases } from "./cases";
import { publicDemo } from "./deploy";
import { getUserCase, listUserCases } from "./store";
import type { CaseRecord } from "./types";

/** Case sets that may be opened. The public demo serves only the sample cases, never the internal benchmark sets. */
const openableSets = () => (publicDemo() ? (["app"] as const) : (["app", "eval", "fresh", "dev"] as const));

export async function allCases(vid: string, set: "app" | "eval" = "app"): Promise<CaseRecord[]> {
  if (set === "eval") return publicDemo() ? [] : loadCases("eval");
  return [...(await listUserCases(vid)), ...loadCases("app")];
}

export function findBuiltInCase(id: string): CaseRecord | null {
  for (const set of openableSets()) {
    const c = loadCases(set).find((x) => x.id === id);
    if (c) return c;
  }
  return null;
}

export async function findCase(vid: string, id: string): Promise<CaseRecord | null> {
  return (await getUserCase(vid, id)) ?? findBuiltInCase(id);
}

/** The public CBP PDF is kept locally (never committed). Its page numbers match the sample cases' source pages. */
export function sourcePdfPath(): string | null {
  const p = process.env.NC_SOURCE_PDF ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "reference-materials", "Detroit Sector Forms I-213 and I-44 FY 2012 – 2019 Part 5_0.pdf");
  return existsSync(p) ? p : null;
}
