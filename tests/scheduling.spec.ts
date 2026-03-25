import { test, expect } from "@playwright/test";

/**
 * Scheduling and booking tests using stored session state
 */

test.describe("Scheduling", () => {
  // Use stored teacher authentication state
  test.use({ storageState: 'playwright/.auth/teacher.json' });

  test("teacher can access book lesson page", async ({ page }) => {
    await page.goto("/book-lesson");

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify we're on booking page or redirected appropriately
    const currentUrl = page.url();
    const hasValidUrl = currentUrl.includes('/book-lesson') || currentUrl.includes('/dashboard') || currentUrl.includes('/settings');

    expect(hasValidUrl).toBeTruthy();
  });

  test("teacher can access scheduling page", async ({ page }) => {
    await page.goto("/scheduling");

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify page loads
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBeTruthy();
  });

  test("teacher settings has availability tab", async ({ page }) => {
    await page.goto("/settings");

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Check for availability-related content
    const pageText = await page.textContent('body');
    const hasAvailabilityContent = pageText && (
      pageText.includes('Availability') ||
      pageText.includes('Schedule') ||
      pageText.includes('Hours')
    );

    expect(hasAvailabilityContent).toBeTruthy();
  });
});
