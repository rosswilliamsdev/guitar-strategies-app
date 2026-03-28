import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  // Use stored teacher authentication state
  test.use({ storageState: 'playwright/.auth/teacher.json' });

  test("teacher dashboard loads with stats", async ({ page }) => {
    // Navigate to dashboard (already authenticated)
    await page.goto("/dashboard");
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify dashboard loads
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify dashboard has key teacher elements
    const hasTeacherContent = await page.locator("text=/students|lessons|upcoming|recent/i").first().isVisible();
    expect(hasTeacherContent).toBeTruthy();
  });

  test("homepage redirects to dashboard when logged in", async ({ page }) => {
    // Try to go to homepage (already authenticated)
    await page.goto("/");

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
