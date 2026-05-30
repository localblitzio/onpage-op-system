import { chromium } from "playwright";

const baseUrl = process.env.OPOS_SMOKE_URL || "https://onpage.localblitz.io/";
const token = process.env.OPOS_SMOKE_TOKEN || process.env.OPOS_READ_TOKEN || process.env.OPOS_ADMIN_TOKEN || "";
const sessionToken = process.env.OPOS_SMOKE_SESSION || "";
const headless = String(process.env.OPOS_SMOKE_HEADLESS || "").toLowerCase() === "true";
const requiredNav = ["Run Cora", "Cora Profiles", "Cora Reports", "Ranking Snapshot", "Entity Explorer", "Entity Crossover", "Entity Sets"];
const checks = [];
const errors = [];

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message });
  if (!condition) throw new Error(message);
}

function unexpectedBrowserErrors() {
  return errors.filter((message) => !message.includes("status of 401") && !message.includes("status of 404"));
}

async function clickNav(page, label) {
  const button = page.locator("nav button", { hasText: label }).first();
  await button.waitFor({ state: "visible", timeout: 10000 });
  await button.click();
}

const browser = await chromium.launch({ headless });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (sessionToken) {
    await context.addCookies([{
      name: "opos_session",
      value: sessionToken,
      url: baseUrl,
      httpOnly: true,
      secure: new URL(baseUrl).protocol === "https:",
      sameSite: "Lax"
    }]);
  }
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  if (token) {
    await page.evaluate((value) => {
      localStorage.setItem("opos_read_token", value);
      localStorage.setItem("opos_admin_token", value);
    }, token);
    await page.reload({ waitUntil: "networkidle", timeout: 45000 });
  } else {
    await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
  }

  const appText = await page.locator("#app").textContent({ timeout: 15000 });
  assert(!appText.includes("Loading cloud mirror..."), "dashboard leaves loading state");

  const locked = await page.locator("#page-title", { hasText: "Locked" }).count();
  if (locked) {
    const unexpectedErrors = unexpectedBrowserErrors();
    assert(unexpectedErrors.length === 0, `no unexpected browser console/page errors: ${unexpectedErrors.join("; ")}`);
    assert(!token && !sessionToken, "locked view is expected when no smoke token is supplied");
    console.log(JSON.stringify({ ok: true, mode: "locked", checks }, null, 2));
  } else {
    const unexpectedErrors = unexpectedBrowserErrors();
    assert(unexpectedErrors.length === 0, `no unexpected browser console/page errors: ${unexpectedErrors.join("; ")}`);
    for (const label of requiredNav) {
      assert(await page.locator("nav button", { hasText: label }).count(), `nav item exists: ${label}`);
    }

    await clickNav(page, "Run Cora");
    await page.locator("text=Remote Cora Bridge").waitFor({ state: "visible", timeout: 10000 });
    assert(await page.locator("text=Run Cora").count(), "Cora run page renders");
    assert(await page.locator("#cora-inline-status").count(), "Cora inline status area exists");

    await clickNav(page, "Cora Profiles");
    await page.getByRole("heading", { name: "Profile Setup" }).waitFor({ state: "visible", timeout: 10000 });
    assert(await page.locator("#profile-create-submit").count(), "Cora Profiles create button renders");
    assert(await page.locator("#profile-attach-submit").count(), "Cora Profiles attach button renders");
    assert(await page.locator("#profiles-inline-status").count(), "Cora Profiles inline status area exists");

    await clickNav(page, "Cora Reports");
    await page.getByRole("heading", { name: "Create Customer Report" }).waitFor({ state: "visible", timeout: 10000 });
    assert(await page.locator("#report-create-submit").count(), "Cora Reports create button renders");
    assert(await page.locator("#reports-inline-status").count(), "Cora Reports inline status area exists");

    await clickNav(page, "Ranking Snapshot");
    await page.locator("text=Run Ranking Snapshot").waitFor({ state: "visible", timeout: 10000 });
    assert(await page.locator("#ranking-run-snapshot").isVisible(), "Ranking Snapshot run button renders");
    assert(await page.locator("#ranking-inline-status").count(), "Ranking Snapshot inline status area exists");
    assert(await page.getByRole("heading", { name: "Last Snapshot" }).count(), "Ranking Snapshot last snapshot panel renders");
    const snapshotOpenButton = page.locator("button.detail-btn", { hasText: "Open" }).first();
    if (await snapshotOpenButton.count()) {
      await snapshotOpenButton.click();
      await page.getByRole("heading", { name: "Ranking Snapshot Detail" }).waitFor({ state: "visible", timeout: 10000 });
      assert(await page.getByRole("heading", { name: "Save Optimization Targets" }).count(), "Ranking Snapshot detail can save optimization targets");
      assert(await page.locator("#snapshot-target-save").count(), "Ranking Snapshot target save button renders");
      await page.locator(".close-detail").click();
    } else {
      checks.push({ ok: true, message: "Ranking Snapshot has no synced snapshots to open" });
    }

    await clickNav(page, "Entity Explorer");
    await page.getByRole("heading", { name: "Run Entity Explorer" }).waitFor({ state: "visible", timeout: 10000 });
    assert(await page.locator("#entity-run-start").isVisible(), "Entity Explorer run button renders");
    assert(await page.locator("#entity-inline-status").count(), "Entity Explorer inline status area exists");
    assert(await page.locator(".provider-card").count() >= 5, "Entity Explorer provider cards render");
    assert(await page.locator(".entity-model-check:checked").count() >= 3, "Entity Explorer recommended models are selected");

    await clickNav(page, "Entity Crossover");
    await page.locator("#page-title", { hasText: "Entity Crossover" }).waitFor({ state: "visible", timeout: 10000 });
    assert(await page.locator("text=Compare model output").count(), "Entity Crossover page explains save workflow");
    const crossoverWorkspace = page.locator("#entity-crossover-workspace");
    if (await crossoverWorkspace.count()) {
      await page.getByRole("heading", { name: "Crossover Terms" }).waitFor({ state: "visible", timeout: 15000 });
      assert(await page.locator("text=Open the full crossover table to select terms").count() === 0, "Entity Crossover no longer routes saving through a separate detail prompt");
    } else {
      checks.push({ ok: true, message: "Entity Crossover has no synced batches to load inline terms" });
    }

    await clickNav(page, "Entity Sets");
    await page.locator("#page-title", { hasText: "Entity Sets" }).waitFor({ state: "visible", timeout: 10000 });
    assert(await page.locator("text=Saved approved entity/LSI terms").count(), "Entity Sets page renders saved-set context");

    console.log(JSON.stringify({ ok: true, mode: "authenticated", checks }, null, 2));
  }
} finally {
  await browser.close();
}
