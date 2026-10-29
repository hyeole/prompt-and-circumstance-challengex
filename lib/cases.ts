import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CaseRecord } from "./types";

/** "app" = data/cases (shown by default); "eval" = eval/cases (team test set, opened with ?set=eval). */
export function loadCases(set: "app" | "eval" = "app"): CaseRecord[] {
  const dir = set === "eval" ? path.join(process.cwd(), "eval", "cases") : path.join(process.cwd(), "data", "cases");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as CaseRecord);
}
