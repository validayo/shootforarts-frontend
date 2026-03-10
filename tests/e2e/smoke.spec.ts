import { expect, test } from "@playwright/test";

test.describe("smoke checks", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("newsletterPopupClosed", "true");
      localStorage.setItem("newsletterPopupSuppressUntil", "2099-01-01T00:00:00.000Z");
    });
  });

  test("@smoke home CTA routes to contact page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start Your Inquiry" }).click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByRole("heading", { name: "Contact" })).toBeVisible();
  });

  test("@smoke contact form exposes 7:00 AM as first time option", async ({ page }) => {
    await page.goto("/contact");
    const preferredTimeSelect = page.locator("select[name='time']");
    await preferredTimeSelect.selectOption("7:00 AM");
    await expect(preferredTimeSelect).toHaveValue("7:00 AM");
  });

  test("@smoke protected admin route redirects to /sfaadmin/login", async ({ page }) => {
    await page.goto("/sfaadmin/dashboard");
    await expect(page).toHaveURL(/\/sfaadmin\/login$/);
    await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible();
  });

  test("@smoke legacy /admin path is not routable", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
});
