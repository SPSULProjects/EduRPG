/**
 * E2E tests for Operator role functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Operator Role', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for operator
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

    // Mock API responses
    await page.route('**/api/sync/bakalari', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          runId: 'sync123',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 1500,
          result: {
            classesCreated: 2,
            classesUpdated: 0,
            usersCreated: 5,
            usersUpdated: 3,
            subjectsCreated: 3,
            subjectsUpdated: 1,
            enrollmentsCreated: 15,
            enrollmentsUpdated: 2
          },
          requestId: 'req123',
          timestamp: new Date().toISOString()
        })
      });
    });

    await page.route('**/api/events', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            {
              id: 'event1',
              title: 'School Festival',
              description: 'Annual school festival with games and activities',
              startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
              xpBonus: 100,
              rarityReward: 'RARE',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    await page.route('**/api/items', async route => {
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
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        })
      });
    });
  });

  test('should display operator dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="operator-dashboard"]')).toBeVisible();
  });

  test('should trigger Bakaláři sync', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.click('[data-testid="sync-button"]');
    
    // Should show sync confirmation dialog
    await expect(page.locator('[data-testid="sync-confirmation"]')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to trigger sync?')).toBeVisible();
    
    await page.click('[data-testid="confirm-sync"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=Sync completed successfully')).toBeVisible();
    
    // Should show sync results
    await expect(page.locator('text=Classes created: 2')).toBeVisible();
    await expect(page.locator('text=Users created: 5')).toBeVisible();
    await expect(page.locator('text=Subjects created: 3')).toBeVisible();
  });

  test('should create events', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('[data-testid="events-tab"]');
    
    // Mock successful event creation
    await page.route('**/api/events', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            event: {
              id: 'event2',
              title: 'Math Competition',
              description: 'Annual mathematics competition',
              startsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
              xpBonus: 200,
              rarityReward: 'EPIC',
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

    await page.click('[data-testid="create-event-button"]');
    
    // Fill event form
    await page.fill('[data-testid="event-title"]', 'Math Competition');
    await page.fill('[data-testid="event-description"]', 'Annual mathematics competition');
    await page.fill('[data-testid="event-starts-at"]', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
    await page.fill('[data-testid="event-ends-at"]', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString().slice(0, 16));
    await page.fill('[data-testid="event-xp-bonus"]', '200');
    await page.selectOption('[data-testid="event-rarity-reward"]', 'EPIC');
    
    await page.click('[data-testid="submit-event"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=Event created successfully')).toBeVisible();
  });

  test('should manage shop items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('[data-testid="items-tab"]');
    
    // Mock successful item creation
    await page.route('**/api/items', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            item: {
              id: 'item2',
              name: 'Premium Avatar',
              description: 'A premium avatar with special effects',
              price: 500,
              rarity: 'LEGENDARY',
              type: 'COSMETIC',
              imageUrl: 'https://example.com/avatar.png',
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

    await page.click('[data-testid="create-item-button"]');
    
    // Fill item form
    await page.fill('[data-testid="item-name"]', 'Premium Avatar');
    await page.fill('[data-testid="item-description"]', 'A premium avatar with special effects');
    await page.fill('[data-testid="item-price"]', '500');
    await page.selectOption('[data-testid="item-rarity"]', 'LEGENDARY');
    await page.selectOption('[data-testid="item-type"]', 'COSMETIC');
    await page.fill('[data-testid="item-image-url"]', 'https://example.com/avatar.png');
    
    await page.click('[data-testid="submit-item"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=Item created successfully')).toBeVisible();
  });

  test('should view system health', async ({ page }) => {
    // Mock health check response
    await page.route('**/api/health', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: 'connected',
          userCount: 150,
          version: '1.0.0'
        })
      });
    });

    await page.goto('/dashboard');
    await page.click('[data-testid="health-tab"]');
    
    await expect(page.locator('[data-testid="health-status"]')).toContainText('healthy');
    await expect(page.locator('[data-testid="database-status"]')).toContainText('connected');
    await expect(page.locator('[data-testid="user-count"]')).toContainText('150');
  });

  test('should access admin panel', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="admin-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-event-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-item-button"]')).toBeVisible();
  });

  test('should have access to all teacher features', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should see teacher features
    await expect(page.locator('[data-testid="create-job-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="grant-xp-button"]')).toBeVisible();
  });

  test('should have access to all student features', async ({ page }) => {
    await page.goto('/shop');
    
    // Should see shop items
    await expect(page.locator('[data-testid="shop-item"]')).toBeVisible();
  });
});
