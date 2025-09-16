/**
 * E2E tests for authentication flows
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/auth\/signin/);
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/auth/signin');
    
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');
    
    await page.fill('input[name="username"]', 'invalid@user.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Mock successful login
    await page.route('**/api/auth/signin', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'student1',
            email: 'jan.novak@school.cz',
            name: 'Jan Novák',
            role: 'STUDENT',
            classId: 'class1'
          }
        })
      });
    });

    await page.fill('input[name="username"]', 'jan.novak@school.cz');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
  });
});
