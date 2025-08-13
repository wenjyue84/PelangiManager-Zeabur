import { test, expect } from '@playwright/test';

test.describe('Basic Check In Page Test', () => {
  test('should load the check-in page', async ({ page }) => {
    // Navigate to the check-in page
    await page.goto('/guest-checkin?token=test-token-123');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot to see what's actually on the page
    await page.screenshot({ path: 'test-results/page-loaded.png', fullPage: true });
    
    // Check if any content is visible
    const bodyText = await page.textContent('body');
    console.log('Page body text:', bodyText?.substring(0, 500));
    
    // Check if the page has any content
    await expect(page.locator('body')).not.toBeEmpty();
    
    // Check if there are any form elements
    const formElements = await page.locator('input, select, textarea, button').count();
    console.log(`Found ${formElements} form elements`);
    
    // Check if there are any cards or content sections
    const cards = await page.locator('[class*="card"], [class*="Card"]').count();
    console.log(`Found ${cards} card elements`);
    
    // Basic assertion that the page loaded
    expect(formElements).toBeGreaterThan(0);
    
    console.log('✅ Basic page load test passed');
  });

  test('should show some content even without valid token', async ({ page }) => {
    // Try without token
    await page.goto('/guest-checkin');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/page-no-token.png', fullPage: true });
    
    const bodyText = await page.textContent('body');
    console.log('Page without token body text:', bodyText?.substring(0, 500));
    
    // Check if page shows some content (even if it's an error)
    await expect(page.locator('body')).not.toBeEmpty();
    
    console.log('✅ Page without token test passed');
  });
});
