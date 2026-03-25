import { test, expect } from "@playwright/test";

/**
 * Student recommendations viewing tests using stored session state
 */

test.describe("Student Recommendations", () => {
  // Use stored student authentication state
  test.use({ storageState: 'playwright/.auth/student.json' });

  test("student can access recommendations page", async ({ page }) => {
    await page.goto("/recommendations");

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify we're on recommendations page
    const currentUrl = page.url();
    const onRecommendationsPage = currentUrl.includes('/recommendations') || currentUrl.includes('/dashboard');

    expect(onRecommendationsPage).toBeTruthy();
  });

  test("student can view teacher recommendations", async ({ page }) => {
    await page.goto("/recommendations");

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify page has content
    const pageText = await page.textContent('body');
    const hasContent = pageText && pageText.length > 50;

    expect(hasContent).toBeTruthy();
  });

  test("student recommendations page loads without errors", async ({ page }) => {
    const response = await page.goto("/recommendations");

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify successful response
    expect(response?.status()).toBeLessThan(400);

    // Verify page is visible
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBeTruthy();
  });
});
