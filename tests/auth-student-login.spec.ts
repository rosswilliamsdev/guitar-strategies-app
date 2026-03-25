import { test, expect } from "@playwright/test";

test.describe("Student Login Flow", () => {
  test("student can login and access dashboard", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Verify login page loads
    await expect(page.locator("h1, h2")).toContainText(/sign in|login/i);

    // Fill login form with test student credentials
    await page.fill('input[name="email"]', "student@guitarstrategies.com");
    await page.fill('input[name="password"]', "Admin123!");

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/\/dashboard/);

    // Verify student dashboard loads
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify student-specific elements are present (lesson history, assigned teacher)
    await expect(page.locator("text=/lessons|teacher|progress/i")).toBeVisible();
  });

  test("student cannot access teacher-only pages", async ({ page }) => {
    // Login as student
    await page.goto("/login");
    await page.fill('input[name="email"]', "student@guitarstrategies.com");
    await page.fill('input[name="password"]', "Admin123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Try to access teacher-only page (students management)
    await page.goto("/students");

    // Should redirect or show error
    await expect(page).not.toHaveURL("/students");
  });
});
