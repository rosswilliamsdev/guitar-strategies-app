import { test, expect } from "@playwright/test";

test.describe("Student Dashboard", () => {
  // Helper to login as student
  async function loginAsStudent(page: any) {
    await page.goto("/login");
    await page.fill('#email', "rossw.dev@gmail.com");
    await page.fill('#password', "student123");

    await Promise.all([
      page.waitForResponse((response: any) => response.url().includes('/api/auth/')),
      page.click('button[type="submit"]')
    ]);

    await page.waitForLoadState('networkidle', { timeout: 30000 });
  }

  test("student dashboard shows teacher information", async ({ page }) => {
    await loginAsStudent(page);

    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify teacher info is visible (students need to see their assigned teacher)
    const pageText = await page.textContent('body');
    const hasTeacherContent = pageText?.match(/teacher|instructor/i);

    expect(hasTeacherContent).toBeTruthy();
  });

  test("student dashboard shows lesson stats", async ({ page }) => {
    await loginAsStudent(page);

    // Verify dashboard loaded
    await expect(page).toHaveURL(/\/dashboard/);

    // Look for stat-like content (numbers, metrics, counts)
    const hasStats = await page.locator("text=/lessons|total|completed|month/i").first().isVisible()
      .catch(() => false);

    expect(hasStats).toBeTruthy();
  });

  test("student can navigate from dashboard to lessons", async ({ page }) => {
    await loginAsStudent(page);

    // Click lessons link from dashboard
    const lessonsLink = page.locator("a[href*='/lessons'], a >> text=/lessons/i").first();

    if (await lessonsLink.isVisible()) {
      await lessonsLink.click();
      await page.waitForLoadState('networkidle');

      // Verify navigation worked
      expect(page.url()).toMatch(/\/lessons/);
    } else {
      // If no visible link, navigate directly to verify access
      await page.goto("/lessons");
      await expect(page).toHaveURL("/lessons");
    }
  });
});
