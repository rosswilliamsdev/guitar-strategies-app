import { test, expect } from "@playwright/test";

test.describe("Student Login Flow", () => {
  test("student can login with valid credentials", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Wait for page to load
    await expect(page.locator("h1")).toContainText(/welcome back/i);

    // Fill login form with confirmed working credentials
    await page.fill('#email', "rossw.dev@gmail.com");
    await page.fill('#password', "student123");

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for redirect with extended timeout
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Simple assertion - just verify we reached dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
