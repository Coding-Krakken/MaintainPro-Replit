import { test, expect } from '@playwright/test';

test('debug login error handling', async ({ page }) => {
  await page.goto('/login');
  
  // Fill invalid credentials
  await page.fill('[data-testid="email-input"]', 'invalid@example.com');
  await page.fill('[data-testid="password-input"]', 'wrongpassword');
  
  // Click login
  await page.click('[data-testid="login-button"]');
  
  // Wait a moment for the error to appear
  await page.waitForTimeout(2000);
  
  // Check the page content
  const pageContent = await page.content();
  console.log('Page content after login attempt:', pageContent);
  
  // Check if error message exists
  const errorMessageExists = await page.locator('[data-testid="error-message"]').isVisible();
  console.log('Error message visible:', errorMessageExists);
  
  // If error message exists, get its text
  if (errorMessageExists) {
    const errorText = await page.locator('[data-testid="error-message"]').textContent();
    console.log('Error text:', errorText);
  }
  
  // Check the current URL
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  // Check if we're still on the login page
  expect(currentUrl).toContain('/login');
});
