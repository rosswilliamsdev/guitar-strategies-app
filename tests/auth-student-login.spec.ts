import { test, expect } from "@playwright/test";

/**
 * Student Login Flow Tests
 * Tests the actual login process itself (not authenticated page access)
 * For authenticated student page tests, see auth-student-login-with-state.spec.ts
 */
test.describe("Student Login Flow", () => {
  test("student can login with valid credentials", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Wait for page to fully load
    await expect(page.locator("h1")).toContainText(/welcome back/i);

    // Fill login form with verified working credentials
    await page.fill("#email", "student@guitarstrategies.com");
    await page.fill("#password", "Admin123!");

    // Submit login and wait for auth API response
    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes("/api/auth/"),
        { timeout: 15000 },
      ),
      page.click('button[type="submit"]'),
    ]);

    // Wait for navigation and data loading to complete
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Verify we're on dashboard
    expect(page.url()).toMatch(/\/dashboard/);

    // Verify page loaded successfully
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBeTruthy();
  });
});
