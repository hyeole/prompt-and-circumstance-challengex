/**
 * Records a captioned browser walkthrough of the multi-page app with Playwright + the installed Google Chrome.
 * Every review shown is a real live call; waiting time is shown in real time with a caption saying so.
 * Reviews run here are saved to the local store like any officer's review.
 *
 * Usage:  npm run build && npm start (key configured), then
 *         node scripts/record-demo.mjs [--clean C045]
 * Output: recordings/narrativecheck-demo-<timestamp>.webm (git-ignored), and a log of what each live review returned.
 * Needs once: npx playwright-core install ffmpeg
 */
import { chromium } from "playwright-core";
import { mkdirSync, renameSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const CLEAN = arg("clean", "C045");
const OUT = "recordings";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: OUT, size: { width: 1440, height: 900 } } });
const page = await ctx.newPage();
const pause = (s) => page.waitForTimeout(s * 1000);
const log = []; // what each live review actually returned

async function caption(text, secs = 3) {
  await page.evaluate((t) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      el.style.cssText = "position:fixed;left:50%;bottom:44px;transform:translateX(-50%);max-width:880px;background:rgba(11,26,48,.94);color:#fff;font:500 17px/1.4 Inter,Arial,sans-serif;padding:12px 20px;border-radius:8px;z-index:9999;text-align:center;pointer-events:none";
      document.body.appendChild(el);
    }
    el.textContent = t;
    el.style.display = t ? "block" : "none";
  }, text);
  if (secs) await pause(secs);
}
const go = async (path, text) => { await page.goto(BASE + path); await page.waitForSelector(".header"); if (text) await caption(text, 3.5); };

async function runReview() {
  await page.locator(".header .btn-primary").click();
  await caption("Live review running on the Unissant-hosted gpt-oss-20b. Waiting time is shown in real time.", 0);
  await page.waitForFunction(() => !/Reviewing/.test(document.querySelector(".header .pill")?.textContent ?? ""), null, { timeout: 120_000 });
  const status = await page.locator(".header .pill").textContent();
  const titles = await page.locator(".finding-title").allTextContents();
  const cit = await page.locator(".citation-line .pill").textContent().catch(() => "");
  log.push(`${page.url().split("/review/")[1]}: ${status} | citation: ${cit} | findings: ${titles.join("; ") || "none"}`);
  await caption(`Review finished: ${status}. It is saved as a new version.`, 3);
}
async function openFinding(re) {
  const head = page.locator(".finding-head", { hasText: re }).first();
  if (await head.count()) { await head.click(); await pause(1.5); return true; }
  return false;
}

// 0. Workspace and Cases
await go("/", "NarrativeCheck reviews an officer's narrative, the case facts and the selected charge. It never rewrites the narrative or picks the charge.");
await caption("The Workspace shows real saved statuses and the officer actions still pending.", 4);
await page.getByRole("link", { name: "Cases", exact: true }).first().click();
await page.waitForURL("**/cases");
await caption("The case library separates adapted source records, synthetic test variants and cases entered in the app.", 4);
await page.fill("#case-search", CLEAN);
await pause(1.5);

// 1. Complete case
await page.locator("tbody a", { hasText: /./ }).first().click();
await page.waitForURL(`**/review/${CLEAN}`);
await caption(`Case ${CLEAN}: an adapted public record. Form facts on the left, the original narrative in the middle, the review on the right.`, 4);
await runReview();
await page.getByRole("tab", { name: /elements/i }).click();
await caption("The checklist follows Unissant's core-elements guidance. Items for other contexts show as not applicable, never as missing.", 5);
await page.getByRole("tab", { name: /findings/i }).click();

// 2. Missing detail, correction, fresh review, history
await go("/review/C012-M2", "Test variant C012-M2: the team removed the place of entry from the narrative and the form.");
await runReview();
await openFinding(/place of last entry|Missing/i);
await caption("A missing fact has no text to highlight, so the evidence says 'Not stated'.", 4);
await caption("The officer adds the missing detail in their own words.", 2.5);
await page.getByRole("button", { name: "Edit narrative" }).click();
const ta = page.locator("#narrative-edit");
await ta.fill((await ta.inputValue()).replace("via a river.", "via a river near Laredo, Texas."));
await page.fill("#fact-entry\\.place", "0 mile(s) of LAR");
await page.getByRole("button", { name: "Done editing" }).click();
await caption("After an edit, the saved review is marked outdated until a fresh review runs. The edit is kept for this session.", 4.5);
await runReview();
await page.getByRole("link", { name: "History", exact: true }).click();
await page.waitForURL("**/history");
await caption("Review history keeps every version. The officer's edit is shown word by word, and the missing-place finding is listed as resolved.", 6);

// 3. Contradiction, evidence explorer, officer decision
await go("/review/C012-X1", "Test variant C012-X1: the narrative now says he flew in on a tourist visa, which conflicts with the next sentence and the form.");
await runReview();
(await openFinding(/conflict|manner|entered/i)) || (await page.locator(".finding-head").first().click());
await caption("The evidence explorer shows both statements side by side, with exact quotes, who each is about, and the linked form field.", 6);
const note = page.locator('input[id^="note-"]').first();
if (await note.count()) {
  await note.fill("Will confirm the manner of entry with the subject.");
  await page.getByRole("button", { name: "Acknowledged" }).first().click();
  await caption("The officer's decision and note are saved separately; the finding itself is never changed.", 4);
}

// 4. Ambiguity and multi-charge
await go("/review/C003-AMB", "Test variant C003-AMB: a second, conflicting account of how the subject entered.");
await runReview();
await caption("Ambiguous facts are routed to a person, with the reason shown.", 4);
await go("/review/C001-MC", "Test variant C001-MC: two charges are selected.");
await runReview();
await caption("Multi-charge cases always go to human review. The tool does not choose between the charges.", 4);

// 5. Reports and references
await go("/report/C001-MC", "Each review exports a one-page gap report with evidence, page numbers, versions and completion status.");
await pause(2);
await go("/audit/C012-X1", "The detailed audit export includes every finding, full evidence, officer decisions and notes, and every model request.");
await page.mouse.wheel(0, 900); await pause(2.5);
await go("/references", "References keep Unissant's guidance, the team's checklist and the team's statute summaries visibly apart.");
await page.mouse.wheel(0, 700); await pause(3);
await caption("Decision support only. Built by Prompt & Circumstance.", 4);

const tmp = await page.video().path();
await ctx.close();
await browser.close();
const out = `${OUT}/narrativecheck-demo-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.webm`;
renameSync(tmp, out);
console.log("Saved", out);
for (const l of log) console.log("  " + l);
