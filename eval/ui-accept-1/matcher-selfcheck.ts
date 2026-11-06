// Offline self-check of the fixture endpoint's case matching: each demo case (including the variant pairs) sends its
// own facts prompt and a review-style prompt carrying its officer-selected charge line; the endpoint log shows which
// recording answered.   npx tsx --conditions=react-server eval/ui-accept-1/matcher-selfcheck.ts
import { readFileSync } from "node:fs";
import { splitSentences } from "../../lib/text";
import { buildFactsPrompt, FACTS_SYSTEM_PROMPT } from "../../lib/review/facts";
(async () => {
  for (const id of ["C001", "C001-MC", "C003", "C003-AMB", "C012", "C012-M2", "C012-X1", "C119"]) {
    const c = JSON.parse(readFileSync(`data/cases/${id}.json`, "utf8"));
    const ss = splitSentences(c.narrative.text, c.narrative.pageSpans);
    const sel = c.selectedCharges.map((s: { citation: string }) => s.citation).join("; ");
    for (const [sys, user] of [[FACTS_SYSTEM_PROMPT, buildFactsPrompt(ss)], ["review", `${buildFactsPrompt(ss)}\nOFFICER-SELECTED CHARGE: ${sel}\n`]]) {
      const r = await fetch("http://localhost:4555/v1/chat/completions", { method: "POST", body: JSON.stringify({ messages: [{ role: "system", content: sys }, { role: "user", content: user }] }) });
      console.log(id, sys === FACTS_SYSTEM_PROMPT ? "facts" : "review", r.status); await r.text();
    }
  }
})();
