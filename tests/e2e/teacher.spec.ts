/**
 * E2E tests for Teacher role functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Teacher Role', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for teacher
    await page.addInitScript(() => {
      window.localStorage.setItem('nextauth.session', JSON.stringify({
        user: {
          id: 'teacher1',
          email: 'petr.dvorak@school.cz',
          name: 'Petr Dvořák',
          role: 'TEACHER'
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
              teacherName: 'Petr Dvořák',
              applications: [
                {
                  id: 'app1',
                  studentId: 'student1',
                  studentName: 'Jan Novák',
                  status: 'PENDING',
                  appliedAt: new Date().toISOString()
                }
              ]
            }
          ]
        })
      });
    });

    await page.route('**/api/teacher/budget/today', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          budget: {
            totalBudget: 1000,
            usedBudget: 200,
            remainingBudget: 800,
            resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        })
      });
    });
  });

  test('should display teacher dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="teacher-dashboard"]')).toBeVisible();
  });

  test('should create a new job', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Mock successful job creation
    await page.route('**/api/jobs', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            job: {
              id: 'job2',
              title: 'Science Project',
              description: 'Research and present findings',
              subjectId: 'subj2',
              xpReward: 200,
              moneyReward: 100,
              maxStudents: 3,
              status: 'OPEN',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              teacherId: 'teacher1'
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.click('[data-testid="create-job-button"]');
    
    // Fill job form
    await page.fill('[data-testid="job-title"]', 'Science Project');
    await page.fill('[data-testid="job-description"]', 'Research and present findings');
    await page.selectOption('[data-testid="job-subject"]', 'subj2');
    await page.fill('[data-testid="job-xp-reward"]', '200');
    await page.fill('[data-testid="job-money-reward"]', '100');
    await page.fill('[data-testid="job-max-students"]', '3');
    
    await page.click('[data-testid="submit-job"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=Job created successfully')).toBeVisible();
  });

  test('should review job applications', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('[data-testid="jobs-tab"]');
    
    // Mock successful application review
    await page.route('**/api/jobs/job1/review', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          application: {
            id: 'app1',
            status: 'APPROVED',
            feedback: 'Great work!',
            reviewedAt: new Date().toISOString()
          }
        })
      });
    });

    await page.click('[data-testid="review-applications"]');
    
    // Should see application
    await expect(page.locator('text=Jan Novák')).toBeVisible();
    await expect(page.locator('text=PENDING')).toBeVisible();
    
    // Approve application
    await page.click('[data-testid="approve-button"]');
    await page.fill('[data-testid="feedback-input"]', 'Great work!');
    await page.click('[data-testid="submit-review"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=Application approved')).toBeVisible();
  });

  test('should grant XP to students', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('[data-testid="xp-tab"]');
    
    // Mock successful XP grant
    await page.route('**/api/xp/grant', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          xpGrant: {
            id: 'grant1',
            studentId: 'student1',
            subjectId: 'subj1',
            amount: 150,
            reason: 'Excellent homework',
            grantedAt: new Date().toISOString(),
            grantedBy: 'Petr Dvořák'
          },
          budgetRemaining: 650
        })
      });
    });

    await page.click('[data-testid="grant-xp-button"]');
    
    // Fill XP grant form
    await page.selectOption('[data-testid="student-select"]', 'student1');
    await page.selectOption('[data-testid="subject-select"]', 'subj1');
    await page.fill('[data-testid="xp-amount"]', '150');
    await page.fill('[data-testid="xp-reason"]', 'Excellent homework');
    
    await page.click('[data-testid="submit-xp-grant"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=XP granted successfully')).toBeVisible();
  });

  test('should view daily budget', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('[data-testid="budget-tab"]');
    
    await expect(page.locator('[data-testid="total-budget"]')).toContainText('1000');
    await expect(page.locator('[data-testid="used-budget"]')).toContainText('200');
    await expect(page.locator('[data-testid="remaining-budget"]')).toContainText('800');
  });

  test('should be denied access to operator features', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should not see operator-specific elements
    await expect(page.locator('[data-testid="sync-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="admin-panel"]')).not.toBeVisible();
  });

  test('should be denied access to student shop', async ({ page }) => {
    await page.goto('/shop');
    
    // Should see items but not purchase functionality
    await expect(page.locator('[data-testid="shop-item"]')).toBeVisible();
    await expect(page.locator('[data-testid="buy-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="user-balance"]')).not.toBeVisible();
  });
});
