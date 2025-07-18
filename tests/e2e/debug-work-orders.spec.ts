// Simple test script to check work orders
import { test } from '@playwright/test';

test('debug work order navigation', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'technician@maintainpro.com');
  await page.fill('[data-testid="password-input"]', 'demo123');
  await page.click('[data-testid="login-button"]');
  
  // Wait for redirect
  await page.waitForURL('/');
  
  // Navigate to work orders
  console.log('Current URL:', page.url());
  
  // Try to find navigation element
  const navElement = page.locator('[data-testid="nav-work-orders"]');
  const isNavVisible = await navElement.isVisible();
  console.log('Nav work orders visible:', isNavVisible);
  
  if (isNavVisible) {
    await navElement.click();
    await page.waitForURL('/work-orders');
    console.log('Successfully navigated to work orders');
    
    // Wait for work orders to load
    await page.waitForTimeout(2000);
    
    // Check for work order cards
    const workOrderCards = page.locator('[data-testid="work-order-card"]');
    const count = await workOrderCards.count();
    console.log('Work order cards found:', count);
    
    if (count > 0) {
      console.log('Work orders are available');
    } else {
      console.log('No work orders found');
      // Check page content
      const content = await page.textContent('body');
      console.log('Page content includes:', content.includes('No work orders'));
    }
  } else {
    console.log('Navigation element not found');
    // Check if we're on mobile
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    const isMobileMenuVisible = await mobileMenuButton.isVisible();
    console.log('Mobile menu button visible:', isMobileMenuVisible);
  }
});
