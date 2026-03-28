import { test, expect } from "@playwright/test";

/**
 * Teacher Login Flow Tests
 * Tests the actual login process itself (not authenticated page access)
 * For authenticated teacher page tests, use storageState pattern
 */
test.describe("Teacher Login Flow", () => {
  test("teacher can login and access dashboard", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Wait for page to load and verify content
    await expect(page.locator("h1")).toContainText(/welcome back/i);

    // Fill login form with test teacher credentials using correct selectors
    await page.fill("#email", "teacher@guitarstrategies.com");
    await page.fill("#password", "Admin123!");

    // Submit login and wait for auth API
    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes("/api/auth/"),
        { timeout: 30000 },
      ),
      page.click('button[type="submit"]'),
    ]);

    // Wait for navigation and loading to complete
    await page.waitForURL(/\/dashboard/, { timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 60000 });

    // Verify teacher dashboard loads
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify teacher-specific elements are present
    await expect(
      page.locator("text=/students|lessons|schedule/i").first(),
    ).toBeVisible();
  });

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/login");

    // Wait for form to be ready
    await expect(page.locator("h1")).toContainText(/welcome back/i);

    // Try invalid credentials
    await page.fill("#email", "invalid@test.com");
    await page.fill("#password", "wrongpassword");
    await page.click('button[type="submit"]');

    // Verify error message appears
    await expect(page.locator("text=/invalid|error|incorrect/i")).toBeVisible({
      timeout: 10000,
    });
  });
});
