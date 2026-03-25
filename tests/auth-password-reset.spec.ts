import { test, expect } from "@playwright/test";

test.describe("Password Reset Flow", () => {
  test("forgot password page loads", async ({ page }) => {
    // Navigate to forgot password page
    await page.goto("/forgot-password");

    // Verify page loads
    await expect(page.locator("h1, h2")).toContainText(/forgot|reset|password/i);

    // Verify email input is present
    await expect(page.locator('#email')).toBeVisible();

    // Verify submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("can navigate to forgot password from login", async ({ page }) => {
    // Start at login page
    await page.goto("/login");

    // Click forgot password link
    await page.click("text=/forgot.*password/i");

    // Verify navigation
    await page.waitForURL(/\/forgot-password/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("forgot password page has back to login link", async ({ page }) => {
    await page.goto("/forgot-password");

    // Verify back to login link exists
    await expect(page.locator("text=/back to|sign in|log in/i")).toBeVisible();
  });
});
