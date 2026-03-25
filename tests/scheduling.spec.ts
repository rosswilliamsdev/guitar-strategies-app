import { test, expect } from "@playwright/test";

test.describe("Scheduling Flow", () => {
  // Login as teacher before each test
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/welcome back/i);
    await page.fill('#email', "teacher@guitarstrategies.com");
    await page.fill('#password', "Admin123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test("teacher can access scheduling page", async ({ page }) => {
    // Navigate to scheduling
    await page.goto("/scheduling");

    // Verify page loads
    await expect(page).toHaveURL("/scheduling");

    // Verify scheduling interface elements
    await expect(page.locator("h1, h2")).toContainText(/schedul/i);
  });

  test("teacher can access book lesson page", async ({ page }) => {
    // Navigate to book lesson page
    await page.goto("/book-lesson");

    // Verify page loads
    await expect(page).toHaveURL("/book-lesson");

    // Verify booking form
    await expect(page.locator("h1, h2")).toContainText(/book/i);
  });

  test("teacher can access settings page", async ({ page }) => {
    // Navigate to settings
    await page.goto("/settings");

    // Verify page loads
    await expect(page).toHaveURL("/settings");

    // Verify settings interface
    await expect(page.locator("h1, h2")).toContainText(/settings|profile/i);
  });
});
