// Offline protection replay: the deterministic attribution, history, entry and account checks on every case of the
// four datasets (89 cases), with no extraction (the saved runs do not store extracted facts). Run before and after a
// change and diff the two outputs: every changed line is a behaviour change to explain.
// Usage: npx tsx --conditions=react-server scripts/replay-round3.ts > out.json
import { readFileSync, readdirSync } from "node:fs";
import { accountConflicts, attributeStatement, compareFacts, describesUsEntry, exactEntryLink, isPriorRemoval, EMPTY_FACTS } from "../lib/review/facts";
import { runRules } from "../lib/review/rules";
import { splitSentences } from "../lib/text";
import type { CaseRecord } from "../lib/types";

const dirs = ["eval/dev-synthetic/cases", "eval/fresh/cases", "eval/cases", "eval/gen-v1/cases"];
const out: Record<string, unknown> = {};
for (const d of dirs)
  for (const f of readdirSync(d).filter((x) => x.endsWith(".json")).sort()) {
    const c = JSON.parse(readFileSync(`${d}/${f}`, "utf8")) as CaseRecord;
    const s = splitSentences(c.narrative.text, c.narrative.pageSpans);
    const multi = runRules(c, s).notes.length > 0;
    const cmp = compareFacts(c, s, EMPTY_FACTS, multi);
    out[`${d.split("/")[1]}/${c.id}`] = {
      describesUsEntry: describesUsEntry(s),
      priorRemoval: s.filter((x) => isPriorRemoval(x.text)).map((x) => x.id),
      exactEntryLink: s.filter((x) => exactEntryLink(c, s, x.id)).map((x) => x.id),
      supported: multi ? s.filter((x) => attributeStatement(s, x.id, true, undefined, c).outcome === "supported").map((x) => x.id) : "single-person",
      other: s.filter((x) => attributeStatement(s, x.id, multi, undefined, c).outcome === "other").map((x) => x.id),
      accountConflicts: accountConflicts(s).map((x) => `${x.id}:${x.evidence.map((e) => e.sentenceId).join("+")}`),
      compareFacts: cmp.findings.map((x) => `${x.id}/${x.source}:${x.evidence.map((e) => e.sentenceId ?? e.fieldPath).join("+")}`),
      unattributed: cmp.unattributed.map((u) => `${u.fieldPath}:${u.sentenceId}`),
    };
  }
for (const [k, v] of Object.entries(out)) console.log(JSON.stringify({ case: k, ...(v as object) }));
