/**
 * Export the one-page report for every case in an evaluation run, as PDF, from the saved live results.
 * No new model calls: the app's /api/review request is answered with the recorded result for that case.
 *
 * Usage: npm run dev, then  node scripts/export-reports.mjs eval/runs/<timestamp> [--only C001,C012-X1]
 * Output: <run>/reports/<case>.pdf (PDFs are git-ignored; regenerate them from the saved results)
 */
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";

const run = process.argv[2];
if (!run) throw new Error("usage: export-reports.mjs eval/runs/<timestamp>");
const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const out = `${run}/reports`;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let current = null;
let currentCase = null;
// Same semantics as lib/completion.ts: a failed fact call or omitted element output also makes a review partial.
const completionStatus = (r) => r.completion?.status ?? (r.modelStatus === "ok" && !(r.calls ?? []).some((c) => c.role === "facts" && c.status !== "ok") ? "complete" : "partial");
await page.route("**/api/review", (route) => route.fulfill({ status: 200, contentType: "application/json", body: current }));
// The Review page reloads the saved history after a review; answer with a one-version history built from the saved
// result, so nothing is written to the local store and no new model call is made.
await page.route(/\/api\/cases\/[^/]+$/, (route) => {
  const review = JSON.parse(current);
  const history = { caseId: currentCase.id, decisions: {}, versions: [{ version: 1, savedAt: review.createdAt, snapshotHash: "", completion: completionStatus(review),
    snapshot: { narrative: currentCase.narrative, facts: currentCase.facts, selectedCharges: currentCase.selectedCharges }, review }] };
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ case: currentCase, history, pdf: null }) });
});

const onlyIdx = process.argv.indexOf("--only");
const only = onlyIdx > 0 ? process.argv[onlyIdx + 1].split(",") : null;
const ids = readdirSync(`${run}/raw`).map((f) => f.replace(/\.json$/, "")).sort().filter((id) => !only || only.includes(id));
for (const id of ids) {
  current = readFileSync(`${run}/raw/${id}.json`, "utf8");
  let dataset = "eval";
  try { dataset = JSON.parse(readFileSync(`${run}/run-info.json`, "utf8")).dataset ?? "eval"; } catch { /* legacy run */ }
  currentCase = JSON.parse(readFileSync(`${dataset === "eval" ? "eval/cases" : `${dataset}/cases`}/${id}.json`, "utf8"));
  await page.goto(`${BASE}/review/${encodeURIComponent(id)}`);
  await page.locator(".header .btn-primary").click();
  await page.waitForSelector(".print-only.report", { state: "attached" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: `${out}/${id}.pdf`, format: "Letter", printBackground: true, margin: { top: "0.4in", bottom: "0.4in", left: "0.45in", right: "0.45in" } });
  await page.emulateMedia({ media: "screen" });
  // one-page check
  const pages = (readFileSync(`${out}/${id}.pdf`, "latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`${id.padEnd(10)} ${pages === 1 ? "1 page" : `${pages} PAGES (over one page)`}`);
}
await browser.close();
console.log(`Saved ${ids.length} reports to ${out}`);
