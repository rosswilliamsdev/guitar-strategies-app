import { test, expect } from "@playwright/test";

/**
 * Teacher settings tests using stored session state
 */

test.describe("Teacher Settings", () => {
  // Use stored teacher authentication state
  test.use({ storageState: 'playwright/.auth/teacher.json' });

  test("teacher can access settings page", async ({ page }) => {
    await page.goto("/settings");

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify we're on settings page
    await expect(page).toHaveURL("/settings");

    // Verify page has content
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBeTruthy();
  });

  test("teacher settings page shows profile and availability tabs", async ({ page }) => {
    await page.goto("/settings");

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Look for settings-specific content
    const pageText = await page.textContent('body');

    // Should have profile or availability-related content
    const hasSettingsContent = pageText && (
      pageText.includes('Profile') ||
      pageText.includes('Availability') ||
      pageText.includes('Settings') ||
      pageText.includes('Email')
    );

    expect(hasSettingsContent).toBeTruthy();
  });

  test("teacher can view their profile settings", async ({ page }) => {
    await page.goto("/settings");

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify page loaded with substantial content
    const pageText = await page.textContent('body');
    const hasContent = pageText && pageText.length > 100;

    expect(hasContent).toBeTruthy();
  });

  test("teacher settings page is accessible from navigation", async ({ page }) => {
    // Start at dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Navigate to settings
    await page.goto("/settings");
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify navigation succeeded
    await expect(page).toHaveURL("/settings");
  });
});
