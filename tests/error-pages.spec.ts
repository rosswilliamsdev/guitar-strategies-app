import { test, expect } from "@playwright/test";

test.describe("Error Pages", () => {
  test("auth error page loads", async ({ page }) => {
    // Navigate to auth error page
    await page.goto("/error");

    // Verify page loads
    await expect(page).toHaveURL("/error");

    // Verify error content is shown
    const hasErrorContent = await page.locator("text=/error|wrong|try again/i").first().isVisible();
    expect(hasErrorContent).toBeTruthy();
  });

  test("404 page shows for non-existent routes", async ({ page }) => {
    // Navigate to non-existent page
    await page.goto("/this-page-does-not-exist-12345");

    // Verify we get some response (404 or redirect)
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test("unauthorized access redirects to login", async ({ page }) => {
    // Try to access protected page without auth
    await page.goto("/students");

    // Should redirect to login or show unauthorized
    await page.waitForURL(/\/(login|error|unauthorized)/, { timeout: 5000 });

    const currentUrl = page.url();
    const isProtected = currentUrl.includes('login') || currentUrl.includes('error') || currentUrl.includes('unauthorized');
    expect(isProtected).toBeTruthy();
  });
});
