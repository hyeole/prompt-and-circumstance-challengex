/**
 * End-to-end check of the officer workflow in the running app (production build), with LIVE reviews.
 * Creates a clearly labelled synthetic test case in the local store. Screenshots go to tmp/qa/ (git-ignored).
 * Usage: npm run build && npm start, then  node scripts/e2e-workflow.mjs
 */
import { chromium } from "playwright-core";
const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const OUT = "tmp/qa";
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`); };
const NARRATIVE = `ENCOUNTER: On March 3, 2024, at approximately 0915 hours, Border Patrol Agents encountered the subject walking along a highway near Ogdensburg, New York. The subject stated that he is a citizen of Canada. The subject admitted that he crossed the St. Lawrence River by boat at night and did not present himself for inspection at a port of entry. The subject stated he had no immigration documents allowing him to be in the United States. DISPOSITION: The subject was processed for a Notice to Appear.`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !/favicon|hmr/i.test(m.text())) errors.push(m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const waitReview = () => page.waitForFunction(() => !/Reviewing/.test(document.querySelector(".header .pill")?.textContent ?? ""), null, { timeout: 120_000 });

// 1. Workspace and Cases
await page.goto(BASE + "/");
check("workspace page loads with active label", (await page.locator('.rail-link[aria-current="page"]').textContent())?.includes("Workspace"));
await shot("01-workspace");
await page.getByRole("link", { name: "Cases", exact: true }).first().click();
await page.waitForURL("**/cases");
check("cases library lists sample cases", (await page.locator("tbody tr").count()) >= 13);
await page.fill("#case-search", "C012");
await page.waitForTimeout(400);
check("search filters cases", (await page.locator("tbody tr").count()) <= 4, `${await page.locator("tbody tr").count()} rows`);
await shot("02-cases");

// 2. Intake with preview
await page.goto(BASE + "/cases/new");
await page.fill("#t", "QA synthetic: river crossing near Ogdensburg");
await page.getByRole("button", { name: /Synthetic test text/ }).click();
await page.fill("#n", NARRATIVE);
await page.getByRole("button", { name: "Interior encounter" }).click();
await page.getByLabel("Charge 1").fill("INA 212(a)(6)(A)(i)");
await page.fill("#f-subject\\.citizenship", "CANADA");
await page.fill("#f-entry\\.date", "Unknown Date, Unknown Time");
await page.fill("#f-entry\\.manner", "EWI BOAT");
await page.fill("#f-encounter\\.date_time", "03/03/2024 0915");
await page.fill("#f-encounter\\.location", "OGDENSBURG, NY");
await page.getByRole("button", { name: "Preview" }).click();
check("preview shown before saving", await page.getByText("Check before creating").isVisible());
check("preview marks unknown field as documented-as-unknown", await page.getByText("Documented as unknown").first().isVisible());
await shot("03-intake-preview");
await page.getByRole("button", { name: /Create case/ }).click();
await page.waitForURL("**/review/U*", { timeout: 15_000 });
const caseUrl = page.url();
const caseId = decodeURIComponent(caseUrl.split("/review/")[1].split(/[?#]/)[0]);
check("new case opens at its own URL", /^U\d{3}-/.test(caseId), caseId);

// 3. Live review
await page.locator(".header .btn-primary").click();
await waitReview();
const st1 = await page.locator(".header .pill").textContent();
check("first live review completes and is saved as v1", (await page.getByText("v1 of 1").count()) > 0, st1);
await shot("04-review-v1");

// 4. Decision with note, persisted
const first = page.locator(".finding-head").first();
let decided = false;
if (await first.count()) {
  await first.click();
  await page.locator('input[id^="note-"]').first().fill("QA: checked against the form; keep for the record.");
  await page.getByRole("button", { name: "Dismissed" }).first().click();
  await page.waitForTimeout(800);
  await page.reload();
  await page.locator(".finding-head").first().click();
  decided = (await page.locator('.seg button[aria-pressed="true"]').first().textContent()) === "Dismissed";
  check("dismissal with note is saved and survives a reload", decided);
  check("dismissed finding is kept, not deleted", (await page.locator(".finding").count()) >= 1);
  await shot("05-decision");
} else check("review produced findings to decide on", false, "no findings; decision step skipped");

// 5. Edit -> outdated -> navigate away and back -> edits preserved
await page.getByRole("button", { name: "Edit narrative" }).click();
const ta = page.locator("#narrative-edit");
await ta.fill((await ta.inputValue()).replace("at night", "at night on March 1, 2024"));
await page.getByRole("button", { name: "Done editing" }).click();
check("edit marks the saved review outdated", (await page.locator(".header .pill").textContent())?.includes("Outdated"));
await page.getByRole("link", { name: "References" }).click();
await page.waitForURL("**/references");
await page.goBack();
await page.waitForURL(`**/review/${caseId}`);
await page.waitForTimeout(600);
check("browser back returns to the review with unsaved edits preserved", (await page.getByText("Unsaved edits (this session)").count()) > 0);
await shot("06-outdated");

// 6. Fresh review -> v2
await page.locator(".header .btn-primary").click();
await waitReview();
check("fresh review saved as v2", (await page.getByText("v2 of 2").count()) > 0, await page.locator(".header .pill").textContent());

// 7. History compare
await page.getByRole("link", { name: "History", exact: true }).click();
await page.waitForURL(`**/review/${caseId}/history`);
check("history shows a word-level edit", (await page.locator(".diff ins").count()) > 0);
check("older version is marked superseded", (await page.getByText("superseded by v2").count()) > 0);
await shot("07-history");

// 8. Report and audit
await page.goto(`${BASE}/report/${caseId}`);
check("report page renders the one-page report", await page.locator(".report-screen").isVisible());
await shot("08-report");
await page.goto(`${BASE}/audit/${caseId}?v=1`);
check("audit export lists the officer note", (await page.getByText("QA: checked against the form").count()) > 0 || !decided);
await shot("09-audit");
await page.goto(`${BASE}/references`);
check("references separate sponsor guidance from team summaries", (await page.getByText("not sponsor-approved").count()) > 0 && (await page.getByText("Sponsor-provided").count()) > 0);
await shot("10-references");

check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed. Case ${caseId}. Screenshots in ${OUT}/`);
process.exit(failed ? 1 : 0);
