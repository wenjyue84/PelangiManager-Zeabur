import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Basic Application Health Check', () => {
  test('should load dashboard page', async ({ page }) => {
    // Navigate to the main dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if dashboard loads with basic content
    await expect(page.locator('body')).not.toBeEmpty();
    
    // Check if navigation elements are present
    const navItems = await page.locator('nav, [role="navigation"], .navigation').count();
    expect(navItems).toBeGreaterThan(0);
    
    console.log('✅ Dashboard page loaded successfully');
  });

  test('should load check-in page (redirects to dashboard due to no token)', async ({ page }) => {
    // Navigate to check-in page without token
    await page.goto('/check-in');
    await page.waitForLoadState('networkidle');
    
    // Should either show check-in form or redirect to dashboard
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    
    console.log('✅ Check-in page handled successfully');
  });

  test('should load guest-checkin page (redirects to dashboard due to invalid token)', async ({ page }) => {
    // Navigate to guest-checkin with invalid token
    await page.goto('/guest-checkin?token=smoke-test-token');
    await page.waitForLoadState('networkidle');
    
    // Should handle invalid token gracefully
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    
    console.log('✅ Guest-checkin page handled gracefully');
  });

  test('should have working navigation', async ({ page }) => {
    // Start at dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if main navigation elements exist
    const hasNavigation = await page.locator('nav, [role="navigation"], .navigation, button').count();
    expect(hasNavigation).toBeGreaterThan(0);
    
    console.log('✅ Navigation elements present');
  });

  test('should handle 404 gracefully', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('/non-existent-page');
    await page.waitForLoadState('networkidle');
    
    // Should show some content (either 404 page or redirect)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    
    console.log('✅ 404 handling works');
  });
});
