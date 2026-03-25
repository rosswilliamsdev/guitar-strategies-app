import { test, expect } from "@playwright/test";

test.describe("Curriculums and Recommendations", () => {
  test("teacher can access curriculums page", async ({ page }) => {
    // Login as teacher
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/welcome back/i);
    await page.fill('#email', "teacher@guitarstrategies.com");
    await page.fill('#password', "Admin123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Navigate to curriculums
    await page.goto("/curriculums");

    // Verify page loads
    await expect(page).toHaveURL("/curriculums");

    // Verify content exists
    const hasContent = await page.locator("main, h1, h2").first().isVisible();
    expect(hasContent).toBeTruthy();
  });

  test("teacher can access recommendations page", async ({ page }) => {
    // Login as teacher
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/welcome back/i);
    await page.fill('#email', "teacher@guitarstrategies.com");
    await page.fill('#password', "Admin123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Navigate to recommendations
    await page.goto("/recommendations");

    // Verify page loads
    await expect(page).toHaveURL("/recommendations");

    // Verify content exists
    const hasContent = await page.locator("main, h1, h2").first().isVisible();
    expect(hasContent).toBeTruthy();
  });
});
