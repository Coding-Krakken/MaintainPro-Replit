import { beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Test utilities
export const createWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    children
  );
};

// Mock data factories
export const createMockWorkOrder = (overrides = {}) => ({
  id: 'wo-123',
  foNumber: 'WO-001',
  description: 'Test work order',
  status: 'new' as const,
  priority: 'medium' as const,
  equipmentId: 'eq-123',
  assignedTo: 'user-123',
  createdBy: 'user-456',
  warehouseId: 'wh-123',
  estimatedHours: 4,
  actualHours: null,
  notes: 'Test notes',
  completedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  dueDate: new Date('2024-01-02'),
  ...overrides,
});

export const createMockEquipment = (overrides = {}) => ({
  id: 'eq-123',
  name: 'Test Equipment',
  model: 'Model-123',
  serialNumber: 'SN-123',
  manufacturer: 'Test Manufacturer',
  status: 'active' as const,
  warehouseId: 'wh-123',
  location: 'Area A',
  installDate: new Date('2023-01-01'),
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'technician' as const,
  department: 'Maintenance',
  phone: '555-1234',
  warehouseId: 'wh-123',
  isActive: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  ...overrides,
});

export const createMockPart = (overrides = {}) => ({
  id: 'part-123',
  partNumber: 'PN-123',
  description: 'Test Part',
  category: 'Mechanical',
  stockLevel: 100,
  reorderPoint: 20,
  unitCost: 25.50,
  supplier: 'Test Supplier',
  warehouseId: 'wh-123',
  location: 'Bin A1',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  ...overrides,
});

export const createMockNotification = (overrides = {}) => ({
  id: 'notif-123',
  userId: 'user-123',
  type: 'work_order_assigned' as const,
  title: 'Work Order Assigned',
  message: 'A new work order has been assigned to you',
  priority: 'medium' as const,
  data: { workOrderId: 'wo-123' },
  channels: ['email', 'push'],
  readAt: null,
  createdAt: new Date('2024-01-01'),
  warehouseId: 'wh-123',
  retryCount: 0,
  maxRetries: 3,
  ...overrides,
});

// Mock API responses
export const mockApiResponse = {
  workOrders: [createMockWorkOrder()],
  equipment: [createMockEquipment()],
  users: [createMockUser()],
  parts: [createMockPart()],
  notifications: [createMockNotification()],
};

// Mock storage
export const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock fetch
export const mockFetch = (data: any, status = 200) => {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
};

// Event simulation helpers
export const clickButton = (button: HTMLElement) => {
  fireEvent.click(button);
};

export const typeInInput = (input: HTMLElement, text: string) => {
  fireEvent.change(input, { target: { value: text } });
};

export const submitForm = (form: HTMLElement) => {
  fireEvent.submit(form);
};

// Test setup and cleanup
export const setupTest = () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    // Reset local storage
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
    });
  });
};

// Performance testing helper
export const measurePerformance = async (fn: () => Promise<void>) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// Mobile testing helper
export const simulateMobile = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 667,
  });
  window.dispatchEvent(new Event('resize'));
};

// Network testing helpers
export const simulateOffline = () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: false,
  });
  window.dispatchEvent(new Event('offline'));
};

export const simulateOnline = () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
  });
  window.dispatchEvent(new Event('online'));
};

// File upload testing
export const createMockFile = (name: string, size: number, type: string) => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false,
  });
  return file;
};

export const simulateFileUpload = (input: HTMLInputElement, files: File[]) => {
  const dataTransfer = new DataTransfer();
  files.forEach(file => dataTransfer.items.add(file));
  
  Object.defineProperty(input, 'files', {
    value: dataTransfer.files,
    writable: false,
  });
  
  fireEvent.change(input);
};

// Date testing helpers
export const mockDate = (date: string) => {
  const mockDate = new Date(date);
  vi.spyOn(global, 'Date').mockImplementation(() => mockDate);
};

export const resetDate = () => {
  vi.restoreAllMocks();
};

// Component testing patterns
export const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: createWrapper });
};

export const createTestId = (id: string) => `[data-testid="${id}"]`;

// Database testing helpers
export const createTestData = async () => {
  // This would typically seed test data
  return {
    workOrders: [createMockWorkOrder()],
    equipment: [createMockEquipment()],
    users: [createMockUser()],
    parts: [createMockPart()],
  };
};

export const cleanupTestData = async () => {
  // This would typically clean up test data
  console.log('Cleaning up test data...');
};

// Async helpers
export const waitForElement = async (text: string) => {
  return await waitFor(() => screen.getByText(text));
};

export const waitForElementToDisappear = async (text: string) => {
  return await waitFor(() => {
    const element = screen.queryByText(text);
    expect(element).toBeNull();
  });
};

// API testing helpers
export const mockApiSuccess = (data: any) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => data,
  });
};

export const mockApiError = (status: number, message: string) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: message }),
  });
};

// Form testing helpers
export const fillForm = (form: HTMLFormElement, data: Record<string, string>) => {
  Object.entries(data).forEach(([name, value]) => {
    const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
    if (input) {
      fireEvent.change(input, { target: { value } });
    }
  });
};

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Test constants
export const TEST_CONSTANTS = {
  DELAY_SHORT: 100,
  DELAY_MEDIUM: 500,
  DELAY_LONG: 1000,
  DEFAULT_TIMEOUT: 5000,
};
