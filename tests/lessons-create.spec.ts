import { test, expect } from "@playwright/test";

test.describe("Lesson Logging Flow", () => {
  // Use stored teacher authentication state
  test.use({ storageState: 'playwright/.auth/teacher.json' });

  test("teacher can navigate to new lesson page", async ({ page }) => {
    // Navigate to lessons page (already authenticated)
    await page.goto("/lessons/new");
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify lesson form loads
    await expect(page.locator("h1, h2")).toContainText(/new lesson|log lesson|create lesson/i);

    // Verify form elements are present
    await expect(page.locator('select, input[type="text"], textarea').first()).toBeVisible();
  });

  test("teacher can access lessons list", async ({ page }) => {
    // Navigate to lessons list (already authenticated)
    await page.goto("/lessons");
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify page loads
    await expect(page).toHaveURL("/lessons");

    // Verify page content
    await expect(page.locator("h1, h2")).toContainText(/lessons/i);
  });
});
