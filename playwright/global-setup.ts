import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup for Playwright tests
 * Authenticates users once and saves session state for reuse across all tests
 * This prevents repeated logins that can cause session conflicts and test hangs
 */
async function globalSetup(config: FullConfig) {
  const authDir = path.join(__dirname, '../playwright/.auth');
  const teacherAuthPath = path.join(authDir, 'teacher.json');
  const studentAuthPath = path.join(authDir, 'student.json');

  // Ensure auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  console.log('🔐 Setting up authentication states...');
  console.log(`   Base URL: ${baseURL}`);

  // Launch browser for authentication
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging for debugging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`   ⚠️  Browser console error: ${msg.text()}`);
    }
  });

  try {
    // ============================================
    // Authenticate as TEACHER
    // ============================================
    console.log('  → Authenticating teacher...');
    await page.goto(`${baseURL}/login`, {
      timeout: 30000,
      waitUntil: 'domcontentloaded'
    });

    console.log('  → Waiting for login form...');
    await page.locator('h1:has-text("Welcome back")').waitFor({ timeout: 10000 });

    console.log('  → Filling credentials...');
    await page.fill('#email', 'teacher@guitarstrategies.com');
    await page.fill('#password', 'Admin123!');

    console.log('  → Submitting login form...');
    // Click and wait for navigation - more reliable than waiting for API response
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard (NextAuth will redirect after successful login)
    console.log('  → Waiting for dashboard redirect...');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Verify we're actually logged in by checking for user-specific content
    await page.locator('text=/teacher|john|dashboard/i').first().waitFor({ timeout: 5000 });

    // Save teacher auth state
    await context.storageState({ path: teacherAuthPath });
    console.log('  ✅ Teacher authentication successful');

    // ============================================
    // Authenticate as STUDENT
    // ============================================
    console.log('  → Authenticating student...');

    // Clear context and start fresh for student
    await context.clearCookies();
    await page.goto(`${baseURL}/login`, {
      timeout: 30000,
      waitUntil: 'domcontentloaded'
    });

    console.log('  → Waiting for login form...');
    await page.locator('h1:has-text("Welcome back")').waitFor({ timeout: 10000 });

    console.log('  → Filling student credentials...');
    // Fixed: Use correct student credentials from seed.ts
    await page.fill('#email', 'student@guitarstrategies.com');
    await page.fill('#password', 'Admin123!');

    console.log('  → Submitting login form...');
    await page.click('button[type="submit"]');

    console.log('  → Waiting for dashboard redirect...');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Verify student login by checking for student-specific content
    await page.locator('text=/student|sarah|dashboard/i').first().waitFor({ timeout: 5000 });

    // Save student auth state
    await context.storageState({ path: studentAuthPath });
    console.log('  ✅ Student authentication successful');

    console.log('✅ Authentication setup complete!\n');
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);

    // Save screenshot for debugging
    try {
      const screenshotPath = path.join(__dirname, '../playwright/.auth/error-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.error(`   📸 Screenshot saved to: ${screenshotPath}`);
    } catch (screenshotError) {
      console.error('   ⚠️  Could not save screenshot:', screenshotError);
    }

    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
