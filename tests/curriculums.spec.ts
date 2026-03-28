import { test, expect } from "@playwright/test";

test.describe("Curriculums and Recommendations", () => {
  // Use stored teacher authentication state
  test.use({ storageState: 'playwright/.auth/teacher.json' });

  test("teacher can access curriculums page", async ({ page }) => {
    // Navigate to curriculums (already authenticated)
    await page.goto("/curriculums");
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify page loads
    await expect(page).toHaveURL("/curriculums");

    // Verify content exists
    const hasContent = await page.locator("main, h1, h2").first().isVisible();
    expect(hasContent).toBeTruthy();
  });

  test("teacher can access recommendations page", async ({ page }) => {
    // Navigate to recommendations (already authenticated)
    await page.goto("/recommendations");
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify page loads
    await expect(page).toHaveURL("/recommendations");

    // Verify content exists
    const hasContent = await page.locator("main, h1, h2").first().isVisible();
    expect(hasContent).toBeTruthy();
  });
});
