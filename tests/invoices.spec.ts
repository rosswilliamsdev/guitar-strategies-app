import { test, expect } from "@playwright/test";

test.describe("Invoice Management", () => {
  test("teacher can access invoices page", async ({ page }) => {
    // Login as teacher
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/welcome back/i);
    await page.fill('#email', "teacher@guitarstrategies.com");
    await page.fill('#password', "Admin123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to invoices
    await page.goto("/invoices");

    // Verify page loads
    await expect(page).toHaveURL("/invoices");

    // Verify invoice content
    await expect(page.locator("h1, h2")).toContainText(/invoice/i);
  });

  test("teacher can access new invoice page", async ({ page }) => {
    // Login as teacher
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/welcome back/i);
    await page.fill('#email', "teacher@guitarstrategies.com");
    await page.fill('#password', "Admin123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to new invoice
    await page.goto("/invoices/new");

    // Verify page loads
    await expect(page).toHaveURL("/invoices/new");

    // Verify form elements
    const hasForm = await page.locator("form, select, input").first().isVisible();
    expect(hasForm).toBeTruthy();
  });
});
