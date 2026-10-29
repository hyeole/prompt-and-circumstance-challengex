/**
 * Captures the review screen after a LIVE review of one case (no stored or mocked results).
 * Usage: npm run dev, then  node scripts/screenshot-review.mjs C012-X1 docs/design/review-screen.png
 */
import { chromium } from "playwright-core";
const [id = "C012-X1", out = "docs/design/review-screen.png"] = process.argv.slice(2);
const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`${BASE}/?case=${encodeURIComponent(id)}`);
await page.getByRole("button", { name: /^run review$/i }).first().click();
await page.waitForFunction(() => !/Reviewing/.test(document.querySelector(".header .pill")?.textContent ?? ""), null, { timeout: 120_000 });
const status = await page.locator(".header .pill").textContent();
const first = page.locator(".finding-head").first();
if (await first.count()) await first.click();
await page.waitForTimeout(1200);
await page.evaluate(() => document.querySelector(".review")?.scrollTo({ top: 0 }));
await page.screenshot({ path: out });
console.log(`${id}: ${status}; saved ${out}`);
await browser.close();
