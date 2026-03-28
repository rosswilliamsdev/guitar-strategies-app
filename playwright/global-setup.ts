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

  // Check if auth files already exist and are recent (less than 24 hours old)
  const authFilesExist = fs.existsSync(teacherAuthPath) && fs.existsSync(studentAuthPath);
  if (authFilesExist) {
    const teacherAge = Date.now() - fs.statSync(teacherAuthPath).mtimeMs;
    const studentAge = Date.now() - fs.statSync(studentAuthPath).mtimeMs;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (teacherAge < maxAge && studentAge < maxAge) {
      console.log('✅ Using existing authentication states (less than 24h old)\n');
      return;
    }
  }

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  console.log('🔐 Setting up authentication states...');

  // Launch browser for authentication
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // ============================================
    // Authenticate as TEACHER
    // ============================================
    console.log('  → Authenticating teacher...');
    await page.goto(`${baseURL}/login`, { timeout: 60000 });
    await page.locator('h1:has-text("Welcome back")').waitFor({ timeout: 30000 });

    await page.fill('#email', 'teacher@guitarstrategies.com');
    await page.fill('#password', 'Admin123!');

    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/auth/'), { timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);

    await page.waitForURL(/\/dashboard/, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 });

    // Save teacher auth state
    await context.storageState({ path: teacherAuthPath });
    console.log('  ✅ Teacher auth saved');

    // ============================================
    // Authenticate as STUDENT
    // ============================================
    console.log('  → Authenticating student...');

    // Clear context and start fresh for student
    await context.clearCookies();
    await page.goto(`${baseURL}/login`, { timeout: 60000 });
    await page.locator('h1:has-text("Welcome back")').waitFor({ timeout: 30000 });

    await page.fill('#email', 'rossw.dev@gmail.com');
    await page.fill('#password', 'student123');

    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/auth/'), { timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);

    await page.waitForURL(/\/dashboard/, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 });

    // Save student auth state
    await context.storageState({ path: studentAuthPath });
    console.log('  ✅ Student auth saved');

    console.log('✅ Authentication setup complete!\n');
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
