import { http, HttpResponse } from 'msw'

export const handlers = [
  // Auth handlers
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json() as { email: string; password: string }
    
    if (email === 'test@example.com' && password === 'password') {
      return HttpResponse.json({
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'technician',
          warehouseId: '1',
        },
        token: 'mock-jwt-token',
      })
    }
    
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true })
  }),

  // Work Orders handlers
  http.get('/api/work-orders', () => {
    return HttpResponse.json([
      {
        id: '1',
        foNumber: 'WO-001',
        description: 'Test work order',
        status: 'new',
        priority: 'medium',
        createdAt: '2025-01-01T10:00:00Z',
        assignedTo: null,
        equipmentId: '1',
      },
    ])
  }),

  http.post('/api/work-orders', async ({ request }) => {
    const data = await request.json() as any
    return HttpResponse.json({
      id: '2',
      foNumber: 'WO-002',
      ...data,
      createdAt: new Date().toISOString(),
    }, { status: 201 })
  }),

  http.get('/api/work-orders/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      foNumber: 'WO-001',
      description: 'Test work order',
      status: 'new',
      priority: 'medium',
      createdAt: '2025-01-01T10:00:00Z',
      assignedTo: null,
      equipmentId: '1',
    })
  }),

  http.patch('/api/work-orders/:id', async ({ params, request }) => {
    const data = await request.json() as any
    return HttpResponse.json({
      id: params.id,
      foNumber: 'WO-001',
      description: 'Test work order',
      status: data.status || 'new',
      priority: data.priority || 'medium',
      createdAt: '2025-01-01T10:00:00Z',
      assignedTo: data.assignedTo || null,
      equipmentId: '1',
    })
  }),

  // Equipment handlers
  http.get('/api/equipment', () => {
    return HttpResponse.json([
      {
        id: '1',
        name: 'Test Equipment',
        model: 'TEST-001',
        serialNumber: 'SN123456',
        location: 'Plant 1',
        status: 'active',
        warehouseId: '1',
      },
    ])
  }),

  http.post('/api/equipment', async ({ request }) => {
    const data = await request.json() as any
    return HttpResponse.json({
      id: '2',
      ...data,
      createdAt: new Date().toISOString(),
    }, { status: 201 })
  }),

  // Parts handlers
  http.get('/api/parts', () => {
    return HttpResponse.json([
      {
        id: '1',
        name: 'Test Part',
        partNumber: 'PN-001',
        stockLevel: 10,
        reorderPoint: 5,
        unitCost: 25.50,
        warehouseId: '1',
      },
    ])
  }),

  // Dashboard handlers
  http.get('/api/dashboard/stats', () => {
    return HttpResponse.json({
      totalWorkOrders: 150,
      pendingWorkOrders: 25,
      completedWorkOrders: 125,
      totalEquipment: 50,
      activeEquipment: 48,
      totalParts: 200,
      lowStockParts: 15,
    })
  }),

  // Error handlers for testing
  http.get('/api/error-test', () => {
    return HttpResponse.json({ error: 'Test error' }, { status: 500 })
  }),
]
