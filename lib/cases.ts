import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CaseRecord } from "./types";

const DIRS = { app: ["data", "cases"], eval: ["eval", "cases"], fresh: ["eval", "fresh", "cases"], dev: ["eval", "dev-synthetic", "cases"] } as const;

/** "app" = data/cases (shown by default); "eval" = eval/cases (legacy benchmark); "fresh" and "dev" = the fresh-v1 and
 *  dev-synthetic evaluation inputs (opened by id only, e.g. for report exports; never listed in the case library). */
export function loadCases(set: keyof typeof DIRS = "app"): CaseRecord[] {
  const dir = path.join(process.cwd(), ...DIRS[set]);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as CaseRecord);
}
