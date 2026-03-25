import { test, expect } from "@playwright/test";

test.describe("Teacher Login Flow", () => {
  test("teacher can login and access dashboard", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Wait for page to load and verify content
    await expect(page.locator("h1")).toContainText(/welcome back/i);

    // Fill login form with test teacher credentials using correct selectors
    await page.fill('#email', "teacher@guitarstrategies.com");
    await page.fill('#password', "Admin123!");

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Verify teacher dashboard loads
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify teacher-specific elements are present
    await expect(page.locator("text=/students|lessons|schedule/i").first()).toBeVisible();
  });

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/login");

    // Wait for form to be ready
    await expect(page.locator("h1")).toContainText(/welcome back/i);

    // Try invalid credentials
    await page.fill('#email', "invalid@test.com");
    await page.fill('#password', "wrongpassword");
    await page.click('button[type="submit"]');

    // Verify error message appears
    await expect(page.locator("text=/invalid/i")).toBeVisible({ timeout: 5000 });
  });
});
