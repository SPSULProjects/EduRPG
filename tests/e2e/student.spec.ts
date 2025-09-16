/**
 * E2E tests for Student role functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Student Role', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for student
    await page.addInitScript(() => {
      window.localStorage.setItem('nextauth.session', JSON.stringify({
        user: {
          id: 'student1',
          email: 'jan.novak@school.cz',
          name: 'Jan Novák',
          role: 'STUDENT',
          classId: 'class1'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));
    });

    // Mock API responses
    await page.route('**/api/jobs', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: [
            {
              id: 'job1',
              title: 'Math Homework',
              description: 'Complete exercises 1-10',
              subjectId: 'subj1',
              subjectName: 'Mathematics',
              xpReward: 100,
              moneyReward: 50,
              maxStudents: 5,
              status: 'OPEN',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              teacherId: 'teacher1',
              teacherName: 'Petr Dvořák'
            }
          ]
        })
      });
    });

    await page.route('**/api/xp/student', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalXP: 500,
          recentGrants: [
            {
              id: 'grant1',
              amount: 100,
              reason: 'Math homework completion',
              subjectId: 'subj1',
              subjectName: 'Mathematics',
              grantedAt: new Date().toISOString(),
              grantedBy: 'Petr Dvořák'
            }
          ]
        })
      });
    });

    await page.route('**/api/shop', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'item1',
              name: 'Cool Avatar',
              description: 'A cool avatar for your profile',
              price: 100,
              rarity: 'COMMON',
              type: 'COSMETIC',
              isActive: true
            }
          ],
          userBalance: 1000,
          userPurchases: []
        })
      });
    });
  });

  test('should display student dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="student-dashboard"]')).toBeVisible();
  });

  test('should view available jobs', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Navigate to jobs section
    await page.click('[data-testid="jobs-tab"]');
    
    await expect(page.locator('[data-testid="job-card"]')).toBeVisible();
    await expect(page.locator('text=Math Homework')).toBeVisible();
    await expect(page.locator('text=100 XP')).toBeVisible();
    await expect(page.locator('text=50 coins')).toBeVisible();
  });

  test('should apply for a job', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('[data-testid="jobs-tab"]');
    
    // Mock successful application
    await page.route('**/api/jobs/job1/apply', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          application: {
            id: 'app1',
            jobId: 'job1',
            studentId: 'student1',
            status: 'PENDING',
            appliedAt: new Date().toISOString()
          }
        })
      });
    });

    await page.click('[data-testid="apply-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=Application submitted')).toBeVisible();
  });

  test('should view XP progress', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Navigate to XP section
    await page.click('[data-testid="xp-tab"]');
    
    await expect(page.locator('[data-testid="total-xp"]')).toContainText('500');
    await expect(page.locator('[data-testid="recent-grants"]')).toBeVisible();
    await expect(page.locator('text=Math homework completion')).toBeVisible();
  });

  test('should browse shop', async ({ page }) => {
    await page.goto('/shop');
    
    await expect(page.locator('h1')).toContainText('Shop');
    await expect(page.locator('[data-testid="shop-item"]')).toBeVisible();
    await expect(page.locator('text=Cool Avatar')).toBeVisible();
    await expect(page.locator('[data-testid="user-balance"]')).toContainText('1000');
  });

  test('should purchase item', async ({ page }) => {
    await page.goto('/shop');
    
    // Mock successful purchase
    await page.route('**/api/shop', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            purchase: {
              id: 'purchase1',
              itemId: 'item1',
              studentId: 'student1',
              price: 100,
              purchasedAt: new Date().toISOString()
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.click('[data-testid="buy-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=Purchase successful')).toBeVisible();
  });

  test('should be denied access to teacher features', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should not see teacher-specific elements
    await expect(page.locator('[data-testid="create-job-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="grant-xp-button"]')).not.toBeVisible();
  });

  test('should be denied access to operator features', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should not see operator-specific elements
    await expect(page.locator('[data-testid="sync-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="admin-panel"]')).not.toBeVisible();
  });
});
