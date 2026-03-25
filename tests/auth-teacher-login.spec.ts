import { test, expect } from "@playwright/test";

test.describe("Teacher Login Flow", () => {
  test("teacher can login and access dashboard", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Verify login page loads
    await expect(page.locator("h1, h2")).toContainText(/sign in|login/i);

    // Fill login form with test teacher credentials
    await page.fill('input[name="email"]', "teacher@guitarstrategies.com");
    await page.fill('input[name="password"]', "Admin123!");

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/\/dashboard/);

    // Verify teacher dashboard loads
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify teacher-specific elements are present
    await expect(page.locator("text=/students|lessons|schedule/i")).toBeVisible();
  });

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/login");

    // Try invalid credentials
    await page.fill('input[name="email"]', "invalid@test.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Verify error message appears
    await expect(page.locator("text=/invalid|error|incorrect/i")).toBeVisible();
  });
});
