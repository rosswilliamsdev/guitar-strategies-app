import { test, expect } from "@playwright/test";

test.describe("Student Login Flow", () => {
  test("student can login and access dashboard", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Wait for page to load
    await expect(page.locator("h1")).toContainText(/welcome back/i);

    // Fill login form with real student credentials
    await page.fill('#email', "rossw.dev@gmail.com");
    await page.fill('#password', "student123");

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Verify student dashboard loads
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify page content exists (any content means it loaded)
    const hasContent = await page.locator("main, div, section").first().isVisible();
    expect(hasContent).toBeTruthy();
  });

  test("student cannot access teacher-only pages", async ({ page }) => {
    // Login as student
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/welcome back/i);

    await page.fill('#email', "rossw.dev@gmail.com");
    await page.fill('#password', "student123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Try to access teacher-only page (students management)
    await page.goto("/students");

    // Should redirect or show error (not stay on /students)
    await page.waitForTimeout(2000); // Give time for redirect
    const currentUrl = page.url();
    const isBlocked = !currentUrl.endsWith("/students");
    expect(isBlocked).toBeTruthy();
  });

  test("student can view lessons page", async ({ page }) => {
    // Login as student
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/welcome back/i);

    await page.fill('#email', "rossw.dev@gmail.com");
    await page.fill('#password', "student123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to lessons page
    await page.goto("/lessons");

    // Verify student can access lessons
    await expect(page).toHaveURL("/lessons");

    // Verify page loaded
    const hasContent = await page.locator("main, div, section").first().isVisible();
    expect(hasContent).toBeTruthy();
  });
});
