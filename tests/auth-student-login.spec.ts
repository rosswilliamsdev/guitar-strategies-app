import { test, expect } from "@playwright/test";

test.describe("Student Login Flow", () => {
  test("student can login and access dashboard", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Wait for page to load
    await expect(page.locator("h1")).toContainText(/welcome back/i);

    // Fill login form with test student credentials
    await page.fill('#email', "student@guitarstrategies.com");
    await page.fill('#password', "Admin123!");

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Verify student dashboard loads
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify student-specific elements are present
    await expect(page.locator("text=/lessons|teacher|progress/i").first()).toBeVisible();
  });

  test("student cannot access teacher-only pages", async ({ page }) => {
    // Login as student
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/welcome back/i);

    await page.fill('#email', "student@guitarstrategies.com");
    await page.fill('#password', "Admin123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Try to access teacher-only page (students management)
    await page.goto("/students");

    // Should redirect or show unauthorized page
    await expect(page).not.toHaveURL("/students");
  });
});
