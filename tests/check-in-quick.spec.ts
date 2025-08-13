import { test, expect } from '@playwright/test';

test.describe('Quick Check In Page Test', () => {
  test('should load the check-in page and verify basic structure', async ({ page }) => {
    // Navigate to the check-in page with a test token
    await page.goto('/guest-checkin?token=test-token-123');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the main page elements are visible
    await expect(page.locator('text=Self Check-in Form')).toBeVisible();
    
    // Check if the form sections are present (using the actual text from the page)
    await expect(page.locator('text=Personal Information')).toBeVisible();
    await expect(page.locator('text=Identity Documents')).toBeVisible();
    await expect(page.locator('text=Payment Information')).toBeVisible();
    await expect(page.locator('text=Emergency Contact')).toBeVisible();
    
    // Check if some form fields are present
    await expect(page.locator('#nameAsInDocument')).toBeVisible();
    await expect(page.locator('#phoneNumber')).toBeVisible();
    
    // Check if mobile-specific elements are present
    await expect(page.locator('text=📱 Mobile Check-in Ready')).toBeVisible();
    
    console.log('✅ Basic page structure verification passed');
  });

  test('should fill basic form fields', async ({ page }) => {
    await page.goto('/guest-checkin?token=test-token-123');
    await page.waitForLoadState('networkidle');
    
    // Fill some basic fields
    await page.fill('#nameAsInDocument', 'Test User');
    await page.fill('#phoneNumber', '0123456789');
    
    // Verify the fields are filled
    await expect(page.locator('#nameAsInDocument')).toHaveValue('Test User');
    await expect(page.locator('#phoneNumber')).toHaveValue('0123456789');
    
    console.log('✅ Basic form field filling test passed');
  });
});
