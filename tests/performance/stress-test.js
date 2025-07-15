import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')

// Stress test configuration
export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '3m', target: 300 },   // Ramp up to 300 users
    { duration: '2m', target: 400 },   // Ramp up to 400 users
    { duration: '1m', target: 500 },   // Spike to 500 users
    { duration: '2m', target: 400 },   // Back to 400 users
    { duration: '3m', target: 300 },   // Back to 300 users
    { duration: '2m', target: 200 },   // Back to 200 users
    { duration: '1m', target: 100 },   // Back to 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1s
    http_req_failed: ['rate<0.05'],    // Error rate must be below 5%
    errors: ['rate<0.05'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'https://laughing-space-palm-tree-97xgpqp95pvqf7r4g-5000.app.github.dev/'

export default function() {
  // Heavy dashboard usage
  const dashboardResponse = http.get(`${BASE_URL}/api/dashboard/stats`)
  
  check(dashboardResponse, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1)

  // Heavy work orders usage
  const workOrdersResponse = http.get(`${BASE_URL}/api/work-orders`)
  
  check(workOrdersResponse, {
    'work orders status is 200': (r) => r.status === 200,
    'work orders response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1)

  // Concurrent equipment requests
  const equipmentResponse = http.get(`${BASE_URL}/api/equipment`)
  
  check(equipmentResponse, {
    'equipment status is 200': (r) => r.status === 200,
    'equipment response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1)

  // Random sleep to simulate varying user behavior
  sleep(Math.random() * 3 + 0.5)
}
