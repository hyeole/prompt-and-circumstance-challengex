/**
 * Records a captioned browser walkthrough of the live app with Playwright + the installed Google Chrome.
 * Every review shown is a real live call; waiting time is shown in real time with a caption saying so.
 *
 * Usage:  npm run dev   (key configured), then
 *         node scripts/record-demo.mjs [--clean C037]
 * Output: recordings/narrativecheck-demo-<timestamp>.webm   (git-ignored; open in Chrome, or upload to Drive/YouTube)
 * Needs once: npx playwright-core install ffmpeg
 */
import { chromium } from "playwright-core";
import { mkdirSync, renameSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const CLEAN = arg("clean", "C037"); // a case whose live review showed no unnecessary findings
const OUT = "recordings";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: OUT, size: { width: 1440, height: 900 } } });
const page = await ctx.newPage();
const pause = (s) => page.waitForTimeout(s * 1000);

async function caption(text, secs = 3) {
  await page.evaluate((t) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      el.style.cssText = "position:fixed;left:50%;bottom:44px;transform:translateX(-50%);max-width:880px;background:rgba(22,22,22,.92);color:#fff;font:500 17px/1.4 'IBM Plex Sans',Arial,sans-serif;padding:12px 20px;border-radius:6px;z-index:9999;text-align:center;pointer-events:none";
      document.body.appendChild(el);
    }
    el.textContent = t;
    el.style.display = t ? "block" : "none";
  }, text);
  if (secs) await pause(secs);
}

async function openCase(id) {
  await page.selectOption("#case-select", id);
  await pause(1.2);
}

async function runReview() {
  await page.getByRole("button", { name: /run (fresh )?review/i }).click();
  await caption("Live review running on the Unissant-hosted gpt-oss-20b. Waiting time is shown in real time.", 0);
  await page.waitForFunction(() => !/Reviewing/.test(document.querySelector(".topbar .status")?.textContent ?? ""), null, { timeout: 120_000 });
  const status = await page.locator(".topbar .status").textContent();
  await caption(`Review finished: ${status}`, 2.5);
}

async function clickFinding(re) {
  const head = page.locator(".finding-head", { hasText: re }).first();
  if (await head.count()) { await head.click(); await pause(2.5); return true; }
  return false;
}

await page.goto(BASE);
await page.waitForSelector("#case-select");
await caption("NarrativeCheck reviews an officer's narrative, the case facts, and the selected charge. It never rewrites the narrative or picks the charge.", 5);

// 1. Complete case
await openCase(CLEAN);
await caption(`Case ${CLEAN}: an adapted public record. Facts on the left, the original narrative in the middle, findings on the right.`, 4);
await runReview();
await caption("Required elements, citation check, and human-review indicator. Checks that complete with no issue say so.", 5);

// 2. Missing detail
await openCase("C012-M2");
await caption("Test variant C012-M2: the team removed the place of entry from both the form and the narrative.", 4);
await runReview();
await clickFinding(/place of entry|Missing/i);
await caption("Missing information appears in the checklist. Nothing is highlighted because there is no text to point to.", 5);

// 3. Correction and fresh review
await caption("The officer adds the missing detail in their own words.", 3);
await page.getByRole("button", { name: "Edit narrative" }).click();
const ta = page.locator("#narrative-edit");
const text = await ta.inputValue();
await ta.fill(text.replace("via a river.", "via a river near Laredo, Texas."));
await page.fill("#fact-entry\\.place", "0 mile(s) of LAR");
await page.getByRole("button", { name: "Done editing" }).click();
await caption("After an edit, earlier findings are marked outdated and highlights are hidden until a fresh review runs.", 5);
await runReview();
await caption("The fresh review checks the corrected text.", 4);

// 4. Contradiction with both sources linked
await openCase("C012-X1");
await caption("Test variant C012-X1: the narrative now says the subject flew in on a tourist visa, which conflicts with other statements and the form.", 5);
await runReview();
(await clickFinding(/conflict|inconsisten|contradict|manner|visa/i)) || (await page.locator("mark.hl").first().click());
await caption("Clicking a finding highlights every linked source: the sentences and the form field.", 5);
const mark = page.locator("mark.hl").first();
if (await mark.count()) { await mark.click(); await caption("Clicking a highlight opens its explanation.", 3); }

// 5. Ambiguous case routed to a person
await openCase("C003-AMB");
await caption("Test variant C003-AMB: a second, conflicting account of how the subject entered.", 4);
await runReview();
await page.locator(".hr-banner").scrollIntoViewIfNeeded();
await caption("Ambiguous facts are routed to a person, with the reason shown.", 5);

// 6. Multi-charge
await openCase("C001-MC");
await caption("Test variant C001-MC: two charges are selected.", 3);
await runReview();
await caption("Multi-charge cases always go to human review. The tool does not choose between the charges.", 5);

// 7. Report
await page.emulateMedia({ media: "print" });
await caption("", 0);
await pause(1);
await caption("Export report: a one-page gap report for each case, with evidence references and versions.", 6);
await page.emulateMedia({ media: "screen" });
await caption("Decision support only. Built by Prompt & Circumstance.", 4);

const tmp = await page.video().path();
await ctx.close();
await browser.close();
const out = `${OUT}/narrativecheck-demo-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.webm`;
renameSync(tmp, out);
console.log("Saved", out);
