import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("teacher dashboard loads with stats", async ({ page }) => {
    // Login as teacher
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/welcome back/i);
    await page.fill('#email', "teacher@guitarstrategies.com");
    await page.fill('#password', "Admin123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Verify dashboard loads
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify dashboard has key teacher elements
    const hasTeacherContent = await page.locator("text=/students|lessons|upcoming|recent/i").first().isVisible();
    expect(hasTeacherContent).toBeTruthy();
  });

  test("homepage redirects to dashboard when logged in", async ({ page }) => {
    // Login as teacher
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/welcome back/i);
    await page.fill('#email', "teacher@guitarstrategies.com");
    await page.fill('#password', "Admin123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Try to go to homepage
    await page.goto("/");

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
  });
});
