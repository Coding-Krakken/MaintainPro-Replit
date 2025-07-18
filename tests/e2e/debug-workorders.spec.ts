import { test, expect } from '@playwright/test';

test('debug work order data', async ({ page }) => {
  await page.goto('/login');
  
  // Use valid credentials
  await page.fill('[data-testid="email-input"]', 'technician@maintainpro.com');
  await page.fill('[data-testid="password-input"]', 'demo123');
  
  // Click login
  await page.click('[data-testid="login-button"]');
  
  // Wait for login to complete
  await page.waitForURL('/dashboard');
  
  // Navigate to work orders
  await page.click('[data-testid="nav-work-orders"]');
  await page.waitForURL('/work-orders');
  
  // Wait for work orders to load
  await page.waitForTimeout(2000);
  
  // Check page content
  const pageContent = await page.content();
  console.log('Work orders page content:', pageContent.substring(0, 2000));
  
  // Check if work order cards exist
  const workOrderCards = await page.locator('[data-testid="work-order-card"]').count();
  console.log('Work order cards found:', workOrderCards);
  
  // Check if work order list exists
  const workOrderList = await page.locator('[data-testid="work-order-list"]').isVisible();
  console.log('Work order list visible:', workOrderList);
  
  // Check if there's a "no work orders" message
  const noWorkOrdersMessage = await page.locator('text=No work orders found').isVisible();
  console.log('No work orders message visible:', noWorkOrdersMessage);
});
