/**
 * E2E tests for Role-Based Access Control (RBAC)
 */

import { test, expect } from '@playwright/test';

test.describe('RBAC - Role-Based Access Control', () => {
  test.describe('Student Role Restrictions', () => {
    test.beforeEach(async ({ page }) => {
      // Mock student authentication
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
    });

    test('should be denied access to job creation', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Should not see create job button
      await expect(page.locator('[data-testid="create-job-button"]')).not.toBeVisible();
      
      // Try to access job creation API directly
      const response = await page.request.post('/api/jobs', {
        data: {
          title: 'Test Job',
          description: 'Test Description',
          subjectId: 'subj1',
          xpReward: 100,
          moneyReward: 50
        }
      });
      
      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Forbidden');
    });

    test('should be denied access to XP granting', async ({ page }) => {
      // Try to access XP grant API directly
      const response = await page.request.post('/api/xp/grant', {
        data: {
          studentId: 'student1',
          subjectId: 'subj1',
          amount: 100,
          reason: 'Test grant'
        }
      });
      
      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Forbidden');
    });

    test('should be denied access to sync functionality', async ({ page }) => {
      // Try to access sync API directly
      const response = await page.request.post('/api/sync/bakalari');
      
      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });

    test('should be denied access to event creation', async ({ page }) => {
      // Try to access event creation API directly
      const response = await page.request.post('/api/events', {
        data: {
          title: 'Test Event',
          description: 'Test Description',
          startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });
      
      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Forbidden');
    });

    test('should be denied access to item creation', async ({ page }) => {
      // Try to access item creation API directly
      const response = await page.request.post('/api/items', {
        data: {
          name: 'Test Item',
          description: 'Test Description',
          price: 100,
          rarity: 'COMMON',
          type: 'COSMETIC'
        }
      });
      
      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Forbidden');
    });
  });

  test.describe('Teacher Role Restrictions', () => {
    test.beforeEach(async ({ page }) => {
      // Mock teacher authentication
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
    });

    test('should be denied access to sync functionality', async ({ page }) => {
      // Try to access sync API directly
      const response = await page.request.post('/api/sync/bakalari');
      
      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });

    test('should be denied access to event creation', async ({ page }) => {
      // Try to access event creation API directly
      const response = await page.request.post('/api/events', {
        data: {
          title: 'Test Event',
          description: 'Test Description',
          startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });
      
      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Forbidden');
    });

    test('should be denied access to item creation', async ({ page }) => {
      // Try to access item creation API directly
      const response = await page.request.post('/api/items', {
        data: {
          name: 'Test Item',
          description: 'Test Description',
          price: 100,
          rarity: 'COMMON',
          type: 'COSMETIC'
        }
      });
      
      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Forbidden');
    });

    test('should be denied access to inactive events', async ({ page }) => {
      // Try to access events with includeInactive parameter
      const response = await page.request.get('/api/events?includeInactive=true');
      
      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });
  });

  test.describe('Operator Role Access', () => {
    test.beforeEach(async ({ page }) => {
      // Mock operator authentication
      await page.addInitScript(() => {
        window.localStorage.setItem('nextauth.session', JSON.stringify({
          user: {
            id: 'operator1',
            email: 'admin@school.cz',
            name: 'Admin Admin',
            role: 'OPERATOR',
            bakalariToken: 'mock_token_operator1'
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }));
      });
    });

    test('should have access to sync functionality', async ({ page }) => {
      // Mock successful sync response
      await page.route('**/api/sync/bakalari', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            runId: 'sync123',
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            durationMs: 1000,
            result: {
              classesCreated: 1,
              classesUpdated: 0,
              usersCreated: 1,
              usersUpdated: 0,
              subjectsCreated: 1,
              subjectsUpdated: 0,
              enrollmentsCreated: 1,
              enrollmentsUpdated: 0
            },
            requestId: 'req123',
            timestamp: new Date().toISOString()
          })
        });
      });

      const response = await page.request.post('/api/sync/bakalari');
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should have access to event creation', async ({ page }) => {
      // Mock successful event creation
      await page.route('**/api/events', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              event: {
                id: 'event1',
                title: 'Test Event',
                description: 'Test Description',
                startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            })
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.request.post('/api/events', {
        data: {
          title: 'Test Event',
          description: 'Test Description',
          startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });
      
      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.event).toBeDefined();
    });

    test('should have access to item creation', async ({ page }) => {
      // Mock successful item creation
      await page.route('**/api/items', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              item: {
                id: 'item1',
                name: 'Test Item',
                description: 'Test Description',
                price: 100,
                rarity: 'COMMON',
                type: 'COSMETIC',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            })
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.request.post('/api/items', {
        data: {
          name: 'Test Item',
          description: 'Test Description',
          price: 100,
          rarity: 'COMMON',
          type: 'COSMETIC'
        }
      });
      
      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.item).toBeDefined();
    });

    test('should have access to inactive events', async ({ page }) => {
      // Mock events response with inactive events
      await page.route('**/api/events', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            events: [
              {
                id: 'event1',
                title: 'Active Event',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              {
                id: 'event2',
                title: 'Inactive Event',
                isActive: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ]
          })
        });
      });

      const response = await page.request.get('/api/events?includeInactive=true');
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.events).toHaveLength(2);
    });
  });

  test.describe('Unauthenticated Access', () => {
    test('should be denied access to protected endpoints', async ({ page }) => {
      // Try to access various protected endpoints without authentication
      const endpoints = [
        '/api/jobs',
        '/api/xp/student',
        '/api/xp/grant',
        '/api/shop',
        '/api/events',
        '/api/sync/bakalari'
      ];

      for (const endpoint of endpoints) {
        const response = await page.request.get(endpoint);
        expect(response.status()).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Unauthorized');
      }
    });

    test('should allow access to public endpoints', async ({ page }) => {
      // Health check should be accessible
      const response = await page.request.get('/api/health');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.status).toBeDefined();
    });
  });
});
