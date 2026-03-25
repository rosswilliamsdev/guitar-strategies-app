import { test, expect } from "@playwright/test";

test.describe("Teacher Settings", () => {
  test("teacher can access settings page", async ({ page }) => {
    // Login as teacher
    await page.goto("/login");
    await page.fill('#email', "teacher@guitarstrategies.com");
    await page.fill('#password', "Admin123!");

    await Promise.all([
      page.waitForResponse((response: any) => response.url().includes('/api/auth/')),
      page.click('button[type="submit"]')
    ]);

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Navigate to settings
    await page.goto("/settings");

    // Verify settings page loads
    await expect(page).toHaveURL("/settings");

    // Verify settings form elements are present
    const hasFormElements = await page.locator("input, textarea, select, button").first().isVisible();
    expect(hasFormElements).toBeTruthy();
  });
});
