import { Page, expect } from '@playwright/test';

export const testUsers = {
  technician: {
    email: 'test@example.com',
    password: 'password',
    name: 'Test User',
    role: 'technician',
  },
  supervisor: {
    email: 'supervisor@maintainpro.com',
    password: 'password',
    name: 'John Smith',
    role: 'supervisor',
  },
  manager: {
    email: 'manager@example.com',
    password: 'password',
    name: 'Mike Johnson',
    role: 'manager',
  }
};

export async function loginAs(page: Page, userType: keyof typeof testUsers) {
  const user = testUsers[userType];
  
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login
  await expect(page).toHaveURL('/dashboard');
  
  return user;
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu-button"]');
  await page.click('[data-testid="logout-button"]');
  await expect(page).toHaveURL('/login');
}
