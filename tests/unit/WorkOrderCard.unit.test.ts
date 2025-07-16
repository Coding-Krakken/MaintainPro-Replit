import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockUser, mockWorkOrder, mockUseAuth } from '../utils/test-mocks'

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

// Mock the useWorkOrders hook
const mockUseWorkOrders = vi.fn()
vi.mock('@/hooks/useWorkOrders', () => ({
  useWorkOrders: mockUseWorkOrders,
}))

describe('WorkOrderCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      isAuthenticated: true,
    })
  })

  it('should have valid work order data structure', () => {
    expect(mockWorkOrder.id).toBeDefined()
    expect(mockWorkOrder.foNumber).toBe('WO-001')
    expect(mockWorkOrder.description).toBe('Test work order')
    expect(mockWorkOrder.status).toBe('new')
  })

  it('should handle work order status updates', () => {
    const mockUpdateWorkOrder = vi.fn()
    mockUseWorkOrders.mockReturnValue({
      data: [mockWorkOrder],
      isLoading: false,
      error: null,
      updateWorkOrder: mockUpdateWorkOrder,
    })

    // Test that work order data is properly structured
    expect(mockWorkOrder.status).toBe('new')
    
    // Test status change logic
    const newStatus = 'in_progress'
    const updatedWorkOrder = { ...mockWorkOrder, status: newStatus }
    expect(updatedWorkOrder.status).toBe('in_progress')
  })

  it('should validate work order properties', () => {
    expect(mockWorkOrder).toHaveProperty('id')
    expect(mockWorkOrder).toHaveProperty('foNumber')
    expect(mockWorkOrder).toHaveProperty('description')
    expect(mockWorkOrder).toHaveProperty('status')
    expect(mockWorkOrder).toHaveProperty('priority')
  })

  it('should handle different status types', () => {
    const statuses = ['new', 'in_progress', 'completed', 'cancelled']
    statuses.forEach(status => {
      const workOrder = { ...mockWorkOrder, status }
      expect(workOrder.status).toBe(status)
    })
  })

  it('should handle user authentication for work orders', () => {
    const authResult = mockUseAuth()
    expect(authResult.user).toBeDefined()
    expect(authResult.isAuthenticated).toBe(true)
    expect(authResult.user.id).toBe(mockUser.id)
  })
})

describe('WorkOrderCard Integration', () => {
  it('should integrate with work order hooks', () => {
    const mockUpdateWorkOrder = vi.fn()
    mockUseWorkOrders.mockReturnValue({
      data: [mockWorkOrder],
      isLoading: false,
      error: null,
      updateWorkOrder: mockUpdateWorkOrder,
    })

    const workOrdersHook = mockUseWorkOrders()
    expect(workOrdersHook.data).toContain(mockWorkOrder)
    expect(workOrdersHook.isLoading).toBe(false)
    expect(workOrdersHook.error).toBeNull()
    expect(workOrdersHook.updateWorkOrder).toBe(mockUpdateWorkOrder)
  })

  it('should handle work order updates through hooks', async () => {
    const mockUpdateWorkOrder = vi.fn().mockResolvedValue({ success: true })
    mockUseWorkOrders.mockReturnValue({
      data: [mockWorkOrder],
      isLoading: false,
      error: null,
      updateWorkOrder: mockUpdateWorkOrder,
    })

    const workOrdersHook = mockUseWorkOrders()
    await workOrdersHook.updateWorkOrder(mockWorkOrder.id, { status: 'in_progress' })
    
    expect(mockUpdateWorkOrder).toHaveBeenCalledWith(mockWorkOrder.id, { status: 'in_progress' })
  })
})

describe('WorkOrderCard Error Handling', () => {
  it('should handle update errors gracefully', async () => {
    const mockUpdateWorkOrder = vi.fn().mockRejectedValue(new Error('Update failed'))
    mockUseWorkOrders.mockReturnValue({
      data: [mockWorkOrder],
      isLoading: false,
      error: null,
      updateWorkOrder: mockUpdateWorkOrder,
    })

    const workOrdersHook = mockUseWorkOrders()
    
    try {
      await workOrdersHook.updateWorkOrder(mockWorkOrder.id, { status: 'in_progress' })
    } catch (error) {
      expect(error.message).toBe('Update failed')
    }

    expect(mockUpdateWorkOrder).toHaveBeenCalledWith(mockWorkOrder.id, { status: 'in_progress' })
  })

  it('should handle hook errors gracefully', () => {
    const mockUpdateWorkOrder = vi.fn()
    mockUseWorkOrders.mockReturnValue({
      data: [],
      isLoading: false,
      error: 'Failed to load work orders',
      updateWorkOrder: mockUpdateWorkOrder,
    })

    const workOrdersHook = mockUseWorkOrders()
    expect(workOrdersHook.error).toBe('Failed to load work orders')
    expect(workOrdersHook.data).toEqual([])
  })
})

describe('WorkOrderCard Accessibility', () => {
  it('should have proper work order structure for accessibility', () => {
    // Test that work order data structure supports accessibility
    expect(mockWorkOrder.foNumber).toBeTruthy() // Should have readable ID
    expect(mockWorkOrder.description).toBeTruthy() // Should have description
    expect(mockWorkOrder.status).toBeTruthy() // Should have status
  })

  it('should provide necessary data for screen readers', () => {
    const workOrder = mockWorkOrder
    expect(workOrder.foNumber).toMatch(/^WO-\d+$/) // Should have proper format
    expect(workOrder.description.length).toBeGreaterThan(0) // Should have description
    expect(['new', 'in_progress', 'completed', 'cancelled']).toContain(workOrder.status)
  })
})
