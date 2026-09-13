const { chromium } = require("playwright");
const path = require("path");

const SHOT_DIR = path.join(__dirname, "qa-shots");
const BASE = "http://localhost";

const consoleErrors = [];

async function shot(page, name) {
  const p = path.join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log("SCREENSHOT:", p);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push("PAGEERROR: " + err.message));
  page.on("response", (res) => {
    if (res.status() >= 400) {
      console.log("HTTP", res.status(), res.request().method(), res.url());
    }
  });

  console.log("STEP: nav to login page");
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await shot(page, "01-login-page");

  console.log("STEP: log in as temp QA admin");
  await page.fill('input[type="email"]', "qa-admin-tmp@example.com");
  await page.fill('input[type="password"]', "TempQaPass123!");
  await page.click('button:has-text("Sign in to Portal")');

  await page.waitForSelector("text=Enrollments", { timeout: 20000 });
  console.log("STEP: logged in, dashboard loaded");
  await shot(page, "02-dashboard-after-login");

  console.log("STEP: click Enrollments nav item");
  await page.click('text=Enrollments');
  await page.waitForSelector('input[placeholder="Student ID…"]', { timeout: 15000 });
  await shot(page, "03-admin-enrollments-empty");

  console.log("STEP: search for student 4790 (has active enrollments + open group)");
  const allSearchButtons = await page.locator('button:has-text("Search")').allTextContents();
  console.log("Buttons matching 'Search':", JSON.stringify(allSearchButtons));
  const inputVal = await page.locator('input[placeholder="Student ID…"]').inputValue().catch(e => "ERR:" + e.message);
  console.log("Student ID input count:", await page.locator('input[placeholder="Student ID…"]').count());
  await page.fill('input[placeholder="Student ID…"]', "4790");
  console.log("Student ID input value after fill:", await page.locator('input[placeholder="Student ID…"]').inputValue());
  await page.locator('button:has-text("Search")').last().click();
  await page.waitForTimeout(2000);
  await shot(page, "04a-right-after-search-click");
  console.log("BODY TEXT SNIPPET:", (await page.locator("body").innerText()).slice(0, 1500));
  console.log("CONSOLE ERRORS SO FAR:", JSON.stringify(consoleErrors, null, 2));

  await page.waitForSelector("text=Current Enrollments", { timeout: 20000 });
  await page.waitForTimeout(1500); // let both panels settle
  await shot(page, "04-student-loaded");

  console.log("STEP: attempt enroll into an available class (CHE 111 / course_class 3052)");
  const addClassBtn = page.locator('button:has-text("+ Add Class")').first();
  const addClassCount = await addClassBtn.count();
  console.log("Add Class buttons found:", addClassCount);
  if (addClassCount > 0) {
    await addClassBtn.click();
    await page.waitForTimeout(1200);
    await shot(page, "05-after-enroll-toast");
    console.log("Toast text after first enroll attempt:", await page.locator("body").innerText().then(t => {
      const i = t.indexOf("⚠️") >= 0 ? t.indexOf("⚠️") : t.indexOf("✓");
      return i >= 0 ? t.slice(i, i + 120) : "(no toast text found)";
    }));
  } else {
    console.log("No enrollable class button found - skipping enroll step");
  }

  console.log("STEP: drop the CHE 111 class from Group 1 (the student's real current enrollment)");
  const dropClassBtn = page.locator('button:has-text("Drop Class")').first();
  const dropClassCount = await dropClassBtn.count();
  console.log("Drop Class buttons found:", dropClassCount);
  if (dropClassCount > 0) {
    await dropClassBtn.click();
    await page.waitForSelector('div:has-text("Dropped student from")', { timeout: 15000 });
    await page.waitForTimeout(300);
    await shot(page, "06-after-unenroll-toast");
  }

  console.log("STEP: re-enroll into CHE 111 (Group 1) - should now succeed with no conflict, restoring original state");
  await page.waitForTimeout(500);
  const reAddBtn = page.locator('button:has-text("+ Add Class")').first();
  console.log("+ Add Class buttons available for re-enroll:", await reAddBtn.count());
  await reAddBtn.click();
  await page.waitForSelector('div:has-text("Enrolled student in")', { timeout: 15000 });
  await page.waitForTimeout(300);
  await shot(page, "06b-after-successful-enroll-toast");

  console.log("STEP: test not-found path with a bogus student id");
  await page.fill('input[placeholder="Student ID…"]', "999999999");
  await page.locator('button:has-text("Search")').last().click();
  await page.waitForTimeout(2000);
  await shot(page, "07a-right-after-notfound-search");
  console.log("BODY TEXT SNIPPET (not-found check):", (await page.locator("body").innerText()).slice(0, 800));
  await page.waitForSelector("text=Student not found", { timeout: 15000 });
  await shot(page, "07-student-not-found");

  console.log("CONSOLE ERRORS:", JSON.stringify(consoleErrors, null, 2));

  await browser.close();
  console.log("DONE");
})().catch((err) => {
  console.error("QA SCRIPT FAILED:", err);
  process.exit(1);
});
