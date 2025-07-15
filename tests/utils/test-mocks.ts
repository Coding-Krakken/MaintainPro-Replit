import { vi } from 'vitest'

// Mock user data
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'technician' as const,
  warehouseId: '1',
}

export const mockSupervisor = {
  id: '2',
  email: 'supervisor@example.com',
  name: 'Test Supervisor',
  role: 'supervisor' as const,
  warehouseId: '1',
}

export const mockManager = {
  id: '3',
  email: 'manager@example.com',
  name: 'Test Manager',
  role: 'manager' as const,
  warehouseId: '1',
}

// Mock work order data
export const mockWorkOrder = {
  id: '1',
  foNumber: 'WO-001',
  description: 'Test work order',
  status: 'new' as const,
  priority: 'medium' as const,
  createdAt: '2025-01-01T10:00:00Z',
  assignedTo: null,
  equipmentId: '1',
  warehouseId: '1',
}

// Mock equipment data
export const mockEquipment = {
  id: '1',
  name: 'Test Equipment',
  model: 'TEST-001',
  serialNumber: 'SN123456',
  location: 'Plant 1',
  status: 'active' as const,
  warehouseId: '1',
}

// Mock parts data
export const mockPart = {
  id: '1',
  name: 'Test Part',
  partNumber: 'PN-001',
  stockLevel: 10,
  reorderPoint: 5,
  unitCost: 25.50,
  warehouseId: '1',
}

// Mock authentication hook
export const mockUseAuth = vi.fn(() => ({
  user: mockUser,
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
  isAuthenticated: true,
}))

// Mock API responses
export const mockApiResponse = <T>(data: T, delay = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay)
  })
}

// Mock API error
export const mockApiError = (message: string, status = 500) => {
  const error = new Error(message)
  ;(error as any).status = status
  return Promise.reject(error)
}

// Mock localStorage
export const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock sessionStorage
export const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock fetch
export const mockFetch = vi.fn()

// Mock WebSocket
export const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1,
}

// Mock file for file upload tests
export const mockFile = new File(['test content'], 'test.txt', {
  type: 'text/plain',
})

// Mock image file
export const mockImageFile = new File(['test image'], 'test.jpg', {
  type: 'image/jpeg',
})

// Mock geolocation
export const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}

// Mock camera/media devices
export const mockMediaDevices = {
  getUserMedia: vi.fn(),
  enumerateDevices: vi.fn(),
}

// Helper function to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to create mock promises
export const createMockPromise = <T>(value: T, shouldReject = false) => {
  return shouldReject ? Promise.reject(value) : Promise.resolve(value)
}
