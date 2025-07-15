import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be below 1%
    errors: ['rate<0.01'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Test user credentials
const testUsers = [
  { email: 'test1@example.com', password: 'password' },
  { email: 'test2@example.com', password: 'password' },
  { email: 'test3@example.com', password: 'password' },
]

export default function() {
  // Login
  const user = testUsers[Math.floor(Math.random() * testUsers.length)]
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
  })

  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => r.json('token') !== undefined,
  })

  if (!loginSuccess) {
    errorRate.add(1)
    return
  }

  const token = loginResponse.json('token')
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // Dashboard request
  const dashboardResponse = http.get(`${BASE_URL}/api/dashboard/stats`, { headers })
  
  check(dashboardResponse, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard response time < 200ms': (r) => r.timings.duration < 200,
    'dashboard has required fields': (r) => {
      const data = r.json()
      return data.totalWorkOrders !== undefined && 
             data.pendingWorkOrders !== undefined &&
             data.completedWorkOrders !== undefined
    },
  }) || errorRate.add(1)

  // Work orders request
  const workOrdersResponse = http.get(`${BASE_URL}/api/work-orders`, { headers })
  
  check(workOrdersResponse, {
    'work orders status is 200': (r) => r.status === 200,
    'work orders response time < 300ms': (r) => r.timings.duration < 300,
    'work orders returns array': (r) => Array.isArray(r.json()),
  }) || errorRate.add(1)

  // Equipment request
  const equipmentResponse = http.get(`${BASE_URL}/api/equipment`, { headers })
  
  check(equipmentResponse, {
    'equipment status is 200': (r) => r.status === 200,
    'equipment response time < 300ms': (r) => r.timings.duration < 300,
    'equipment returns array': (r) => Array.isArray(r.json()),
  }) || errorRate.add(1)

  // Parts request
  const partsResponse = http.get(`${BASE_URL}/api/parts`, { headers })
  
  check(partsResponse, {
    'parts status is 200': (r) => r.status === 200,
    'parts response time < 300ms': (r) => r.timings.duration < 300,
    'parts returns array': (r) => Array.isArray(r.json()),
  }) || errorRate.add(1)

  // Create work order
  const newWorkOrder = {
    foNumber: `WO-PERF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    description: 'Performance test work order',
    priority: 'medium',
    equipmentId: '1',
  }

  const createResponse = http.post(`${BASE_URL}/api/work-orders`, JSON.stringify(newWorkOrder), { headers })
  
  const createSuccess = check(createResponse, {
    'create work order status is 201': (r) => r.status === 201,
    'create work order response time < 500ms': (r) => r.timings.duration < 500,
    'create work order returns id': (r) => r.json('id') !== undefined,
  })

  if (!createSuccess) {
    errorRate.add(1)
  } else {
    const workOrderId = createResponse.json('id')
    
    // Update work order
    const updateData = {
      status: 'in_progress',
      assignedTo: user.email,
    }

    const updateResponse = http.patch(`${BASE_URL}/api/work-orders/${workOrderId}`, JSON.stringify(updateData), { headers })
    
    check(updateResponse, {
      'update work order status is 200': (r) => r.status === 200,
      'update work order response time < 300ms': (r) => r.timings.duration < 300,
      'update work order status updated': (r) => r.json('status') === 'in_progress',
    }) || errorRate.add(1)
  }

  // Logout
  const logoutResponse = http.post(`${BASE_URL}/api/auth/logout`, {}, { headers })
  
  check(logoutResponse, {
    'logout status is 200': (r) => r.status === 200,
    'logout response time < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1)

  // Random sleep between 1-3 seconds to simulate real user behavior
  sleep(Math.random() * 2 + 1)
}
