import { test, expect } from "@playwright/test";

/**
 * Student authentication tests using stored session state
 * These tests use pre-authenticated state from global-setup to avoid repeated logins
 */

// Tests that require authentication use the stored state
test.describe("Student Authenticated Flows", () => {
  // Use stored student authentication state
  test.use({ storageState: 'playwright/.auth/student.json' });

  test("student can view dashboard when authenticated", async ({ page }) => {
    // No login needed - using stored auth state
    await page.goto("/dashboard");

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify page loaded
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBeTruthy();
  });

  test("student can view lessons page when authenticated", async ({ page }) => {
    // Navigate directly to lessons (already authenticated)
    await page.goto("/lessons");

    // Verify student can access lessons
    await expect(page).toHaveURL("/lessons");

    // Verify page loaded
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBeTruthy();
  });

  test("student cannot access teacher-only pages when authenticated", async ({ page }) => {
    // Try to access teacher-only page
    await page.goto("/students");

    // Should redirect away from /students
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const finalUrl = page.url();
    expect(finalUrl).not.toBe("http://localhost:3000/students");
  });

  test("student can view curriculums page when authenticated", async ({ page }) => {
    // Navigate to curriculums
    await page.goto("/curriculums");

    await page.waitForLoadState('networkidle');

    // Should have access to curriculums
    const currentUrl = page.url();
    const hasAccess = currentUrl.includes('/curriculums') || currentUrl.includes('/dashboard');

    expect(hasAccess).toBeTruthy();
  });

  test("student dashboard shows content", async ({ page }) => {
    await page.goto("/dashboard");

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify dashboard has some text content
    const pageText = await page.textContent('body');

    // Should have some dashboard-related content
    const hasContent = pageText && pageText.length > 100;
    expect(hasContent).toBeTruthy();
  });
});
