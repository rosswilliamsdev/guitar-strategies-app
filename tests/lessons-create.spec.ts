import { test, expect } from "@playwright/test";

test.describe("Lesson Logging Flow", () => {
  // Login as teacher before each test
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/welcome back/i);
    await page.fill('#email', "teacher@guitarstrategies.com");
    await page.fill('#password', "Admin123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test("teacher can navigate to new lesson page", async ({ page }) => {
    // Navigate to lessons page
    await page.goto("/lessons/new");

    // Verify lesson form loads
    await expect(page.locator("h1, h2")).toContainText(/new lesson|log lesson|create lesson/i);

    // Verify form elements are present
    await expect(page.locator('select, input[type="text"], textarea').first()).toBeVisible();
  });

  test("teacher can access lessons list", async ({ page }) => {
    // Navigate to lessons list
    await page.goto("/lessons");

    // Verify page loads
    await expect(page).toHaveURL("/lessons");

    // Verify page content
    await expect(page.locator("h1, h2")).toContainText(/lessons/i);
  });
});
