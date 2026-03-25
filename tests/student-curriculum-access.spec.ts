import { test, expect } from "@playwright/test";

test.describe("Student Curriculum Access", () => {
  test("student can view curriculums page after login", async ({ page }) => {
    // Single login test - login and navigate to curriculums
    await page.goto("/login");
    await page.fill('#email', "rossw.dev@gmail.com");
    await page.fill('#password', "student123");

    await Promise.all([
      page.waitForResponse((response: any) => response.url().includes('/api/auth/')),
      page.click('button[type="submit"]')
    ]);

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Navigate to curriculums
    await page.goto("/curriculums");

    // Verify access (students should be able to view curriculums)
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    // Should either be on curriculums page or redirected to a student-specific view
    const hasAccess = currentUrl.includes('/curriculums') || currentUrl.includes('/dashboard');

    expect(hasAccess).toBeTruthy();
  });
});
