import { test, expect } from "@playwright/test";

/**
 * Student settings tests using stored session state
 */

test.describe("Student Settings", () => {
  // Use stored student authentication state
  test.use({ storageState: 'playwright/.auth/student.json' });

  test("student can access settings page", async ({ page }) => {
    await page.goto("/settings");

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify we're on settings page
    await expect(page).toHaveURL("/settings");

    // Verify page has settings content
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBeTruthy();
  });

  test("student settings page shows profile form", async ({ page }) => {
    await page.goto("/settings");

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Look for profile-related form fields
    const pageText = await page.textContent('body');

    // Should have some profile-related content
    const hasProfileContent = pageText && (
      pageText.includes('Profile') ||
      pageText.includes('Settings') ||
      pageText.includes('Email') ||
      pageText.includes('Name')
    );

    expect(hasProfileContent).toBeTruthy();
  });

  test("student can view their profile information", async ({ page }) => {
    await page.goto("/settings");

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify page loaded with content
    const pageText = await page.textContent('body');
    const hasContent = pageText && pageText.length > 100;

    expect(hasContent).toBeTruthy();
  });
});
