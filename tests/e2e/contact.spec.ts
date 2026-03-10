import { expect, test } from "@playwright/test";

async function fillRequiredContactFields(page: import("@playwright/test").Page) {
  await page.locator("input[name='firstName']").fill("Ayo");
  await page.locator("input[name='lastName']").fill("Client");
  await page.locator("input[name='email']").fill("client@example.com");
  await page.locator("input[name='phone']").fill("6471234567");
  await page.locator("select[name='service']").selectOption("Base Photoshoot");
  await page.locator("select[name='service_tier']").selectOption("Tier 1 (Solo Shoot)");
  await page.locator("textarea[name='occasion']").fill("Looking for a portrait session.");
}

test.describe("contact submissions", () => {
  test("happy path posts contact form and shows success state", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/contact-form", async (route) => {
      requestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/contact");
    await fillRequiredContactFields(page);
    await page.waitForTimeout(2600);
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
    expect(requestCount).toBe(1);
  });

  test("honeypot spam case is rejected before network request", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/contact-form", async (route) => {
      requestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/contact");
    await fillRequiredContactFields(page);
    const honeypot = page.locator("#website");
    await honeypot.fill("https://spam.example", { force: true });
    await expect(honeypot).toHaveValue("https://spam.example");
    await page.waitForTimeout(50);
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
    expect(requestCount).toBe(0);
  });
});
