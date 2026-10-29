import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CaseRecord } from "./types";

const DIR = path.join(process.cwd(), "data", "cases");

export function loadCases(): CaseRecord[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8")) as CaseRecord);
}
