import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'
import { registerRoutes } from '../../server/routes'
import { mockUser, mockWorkOrder } from '../utils/test-mocks'

let app: Express

describe('Work Orders API Integration', () => {
  beforeAll(async () => {
    // Set up test app
    app = express() as Express
    app.use(express.json())
    app.use(express.urlencoded({ extended: false }))
    
    // Set test environment
    app.set('env', 'test')
    
    // Register routes
    await registerRoutes(app)
  })

  afterAll(async () => {
    // Clean up test database
    // await cleanupTestDatabase()
  })

  describe('GET /api/work-orders', () => {
    it('should return work orders for authenticated user', async () => {
      const response = await request(app)
        .get('/api/work-orders')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)

      expect(response.body).toBeInstanceOf(Array)
      expect(response.body.length).toBeGreaterThanOrEqual(0)
    })

    it('should return 401 for unauthenticated requests', async () => {
      await request(app)
        .get('/api/work-orders')
        .expect(401)
    })

    it('should filter work orders by status', async () => {
      const response = await request(app)
        .get('/api/work-orders?status=new')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)

      expect(response.body).toBeInstanceOf(Array)
      // All returned work orders should have status 'new'
      response.body.forEach((workOrder: any) => {
        expect(workOrder.status).toBe('new')
      })
    })

    it('should filter work orders by warehouse', async () => {
      const response = await request(app)
        .get('/api/work-orders?warehouse_id=1')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)

      expect(response.body).toBeInstanceOf(Array)
      response.body.forEach((workOrder: any) => {
        expect(workOrder.warehouseId).toBe('1')
      })
    })
  })

  describe('POST /api/work-orders', () => {
    it('should create a new work order', async () => {
      const newWorkOrder = {
        foNumber: 'WO-TEST-001',
        description: 'Test work order creation',
        priority: 'medium',
        equipmentId: '1',
      }

      const response = await request(app)
        .post('/api/work-orders')
        .set('Authorization', 'Bearer mock-token')
        .send(newWorkOrder)
        .expect(201)

      expect(response.body.id).toBeDefined()
      expect(response.body.foNumber).toBe(newWorkOrder.foNumber)
      expect(response.body.description).toBe(newWorkOrder.description)
      expect(response.body.priority).toBe(newWorkOrder.priority)
      expect(response.body.status).toBe('new')
    })

    it('should validate required fields', async () => {
      const invalidWorkOrder = {
        description: 'Missing FO number',
      }

      await request(app)
        .post('/api/work-orders')
        .set('Authorization', 'Bearer mock-token')
        .send(invalidWorkOrder)
        .expect(400)
    })

    it('should validate field formats', async () => {
      const invalidWorkOrder = {
        foNumber: '', // Empty string
        description: 'Test',
        priority: 'invalid', // Invalid priority
      }

      await request(app)
        .post('/api/work-orders')
        .set('Authorization', 'Bearer mock-token')
        .send(invalidWorkOrder)
        .expect(400)
    })
  })

  describe('GET /api/work-orders/:id', () => {
    it('should return specific work order', async () => {
      const response = await request(app)
        .get('/api/work-orders/1')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)

      expect(response.body.id).toBe('1')
      expect(response.body.foNumber).toBeDefined()
      expect(response.body.description).toBeDefined()
    })

    it('should return 404 for non-existent work order', async () => {
      await request(app)
        .get('/api/work-orders/999')
        .set('Authorization', 'Bearer mock-token')
        .expect(404)
    })
  })

  describe('PATCH /api/work-orders/:id', () => {
    it('should update work order status', async () => {
      const updateData = {
        status: 'in_progress',
      }

      const response = await request(app)
        .patch('/api/work-orders/1')
        .set('Authorization', 'Bearer mock-token')
        .send(updateData)
        .expect(200)

      expect(response.body.status).toBe('in_progress')
    })

    it('should update work order assignment', async () => {
      const updateData = {
        assignedTo: '2',
      }

      const response = await request(app)
        .patch('/api/work-orders/1')
        .set('Authorization', 'Bearer mock-token')
        .send(updateData)
        .expect(200)

      expect(response.body.assignedTo).toBe('2')
    })

    it('should validate status transitions', async () => {
      // Test invalid status transition
      const invalidUpdate = {
        status: 'invalid_status',
      }

      await request(app)
        .patch('/api/work-orders/1')
        .set('Authorization', 'Bearer mock-token')
        .send(invalidUpdate)
        .expect(400)
    })
  })

  describe('DELETE /api/work-orders/:id', () => {
    it('should delete work order', async () => {
      await request(app)
        .delete('/api/work-orders/1')
        .set('Authorization', 'Bearer mock-token')
        .expect(204)

      // Verify deletion
      await request(app)
        .get('/api/work-orders/1')
        .set('Authorization', 'Bearer mock-token')
        .expect(404)
    })

    it('should return 404 for non-existent work order', async () => {
      await request(app)
        .delete('/api/work-orders/999')
        .set('Authorization', 'Bearer mock-token')
        .expect(404)
    })
  })
})

describe('Authentication Integration', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password',
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200)

      expect(response.body.user).toBeDefined()
      expect(response.body.token).toBeDefined()
      expect(response.body.user.email).toBe(credentials.email)
    })

    it('should reject invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      }

      await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401)
    })

    it('should validate email format', async () => {
      const credentials = {
        email: 'invalid-email',
        password: 'password',
      }

      await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(400)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
    })
  })
})

describe('Equipment API Integration', () => {
  describe('GET /api/equipment', () => {
    it('should return equipment list', async () => {
      const response = await request(app)
        .get('/api/equipment')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)

      expect(response.body).toBeInstanceOf(Array)
    })

    it('should filter by warehouse', async () => {
      const response = await request(app)
        .get('/api/equipment?warehouse_id=1')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)

      expect(response.body).toBeInstanceOf(Array)
      response.body.forEach((equipment: any) => {
        expect(equipment.warehouseId).toBe('1')
      })
    })
  })

  describe('POST /api/equipment', () => {
    it('should create new equipment', async () => {
      const newEquipment = {
        name: 'Test Equipment',
        model: 'TEST-001',
        serialNumber: 'SN123456',
        location: 'Plant 1',
      }

      const response = await request(app)
        .post('/api/equipment')
        .set('Authorization', 'Bearer mock-token')
        .send(newEquipment)
        .expect(201)

      expect(response.body.id).toBeDefined()
      expect(response.body.name).toBe(newEquipment.name)
      expect(response.body.model).toBe(newEquipment.model)
    })
  })
})

describe('Dashboard API Integration', () => {
  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer mock-token')
        .expect(200)

      expect(response.body.totalWorkOrders).toBeDefined()
      expect(response.body.pendingWorkOrders).toBeDefined()
      expect(response.body.completedWorkOrders).toBeDefined()
      expect(response.body.totalEquipment).toBeDefined()
      expect(response.body.activeEquipment).toBeDefined()
      expect(response.body.totalParts).toBeDefined()
      expect(response.body.lowStockParts).toBeDefined()
    })
  })
})

describe('Error Handling Integration', () => {
  it('should handle server errors gracefully', async () => {
    await request(app)
      .get('/api/error-test')
      .set('Authorization', 'Bearer mock-token')
      .expect(500)
  })

  it('should handle not found routes', async () => {
    await request(app)
      .get('/api/non-existent-route')
      .set('Authorization', 'Bearer mock-token')
      .expect(404)
  })
})
