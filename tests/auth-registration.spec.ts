import { test, expect } from "@playwright/test";

test.describe("Registration Flow", () => {
  test("registration page loads", async ({ page }) => {
    // Navigate to registration page
    await page.goto("/register");

    // Verify page loads
    await expect(page.locator("h1, h2")).toContainText(/sign up|register|create account/i);

    // Verify form elements are present
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
  });

  test("registration form has role selection", async ({ page }) => {
    await page.goto("/register");

    // Wait for page to load
    await expect(page.locator("h1, h2")).toContainText(/sign up|register|create account/i);

    // Verify role selection is present (teacher/student)
    await expect(page.locator("text=/teacher|student|role/i")).toBeVisible();
  });

  test("can navigate to login from registration", async ({ page }) => {
    await page.goto("/register");

    // Click login link
    await page.click("text=/sign in|log in|already have an account/i");

    // Verify navigation to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
