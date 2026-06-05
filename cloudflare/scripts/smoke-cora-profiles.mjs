import { chromium } from "playwright";

const targetUrl = process.env.OPOS_SMOKE_URL || "https://onpage.localblitz.io/";
const token =
  process.env.OPOS_SMOKE_TOKEN ||
  process.env.OPOS_ADMIN_TOKEN ||
  process.env.OPOS_READ_TOKEN ||
  "";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

try {
  await page.goto(targetUrl, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  if (token) {
    await page.evaluate((value) => {
      localStorage.setItem("opos_read_token", value);
      localStorage.setItem("opos_admin_token", value);
    }, token);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
  }
  await page.waitForTimeout(3000);

  const profileButton = page.locator('[data-page="cora-profiles"]').first();
  let clicked = false;
  if (await profileButton.count()) {
    await profileButton.click();
    clicked = true;
  } else {
    await page.evaluate(() => {
      window.location.hash = "#cora-profiles";
    });
  }
  await page.waitForTimeout(2500);

  const result = await page.evaluate(() => {
    const text = document.body.innerText || "";
    return {
      title: document.querySelector(".topbar h1")?.textContent?.trim() || "",
      pageTitle: document.querySelector("#page-title")?.textContent?.trim() || "",
      loadingVisible: text.includes("Loading cloud mirror..."),
      hasProfileSetup: text.includes("Profile Setup"),
      hasAttachProfile: text.includes("Attach Profile"),
      hasCoraDomainLists: text.includes("Cora Domain Lists"),
      hasTrackedDomains: text.includes("Tracked Domains"),
      hasCompetitors: text.includes("Competitors"),
      hasSaveCoraSettings: text.includes("Save Cora Settings"),
      hasAdvancedManagement: text.includes("Advanced Domain Entry Management"),
    };
  });

  console.log(JSON.stringify({ clicked, ...result }, null, 2));
} finally {
  await page.waitForTimeout(2000);
  await browser.close();
}
