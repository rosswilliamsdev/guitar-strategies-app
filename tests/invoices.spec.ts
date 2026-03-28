import { test, expect } from "@playwright/test";

test.describe("Invoice Management", () => {
  // Use stored teacher authentication state
  test.use({ storageState: 'playwright/.auth/teacher.json' });

  test("teacher can access invoices page", async ({ page }) => {
    // Navigate to invoices (already authenticated)
    await page.goto("/invoices");
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify page loads
    await expect(page).toHaveURL("/invoices");

    // Verify invoice content
    await expect(page.locator("h1, h2")).toContainText(/invoice/i);
  });

  test("teacher can access new invoice page", async ({ page }) => {
    // Navigate to new invoice (already authenticated)
    await page.goto("/invoices/new");
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify page loads
    await expect(page).toHaveURL("/invoices/new");

    // Verify form elements
    const hasForm = await page.locator("form, select, input").first().isVisible();
    expect(hasForm).toBeTruthy();
  });
});
