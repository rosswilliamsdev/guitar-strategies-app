import { test, expect } from "@playwright/test";

test.describe("Library Management", () => {
  test("teacher can access library page", async ({ page }) => {
    // Login as teacher
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/welcome back/i);
    await page.fill('#email', "teacher@guitarstrategies.com");
    await page.fill('#password', "Admin123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to library
    await page.goto("/library");

    // Verify page loads
    await expect(page).toHaveURL("/library");

    // Verify library content
    await expect(page.locator("h1, h2")).toContainText(/library|materials/i);
  });
});
