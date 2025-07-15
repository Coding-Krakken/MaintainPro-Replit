import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'https://laughing-space-palm-tree-97xgpqp95pvqf7r4g-5000.app.github.dev/';
  
  // Test homepage
  const response = http.get(`${baseUrl}/`);
  check(response, {
    'homepage loads successfully': (r) => r.status === 200,
    'homepage loads within 500ms': (r) => r.timings.duration < 500,
  });

  // Test API endpoints
  const apiResponse = http.get(`${baseUrl}/api/dashboard/stats`);
  check(apiResponse, {
    'API responds': (r) => r.status === 200 || r.status === 401, // 401 is ok for unauthenticated
    'API responds quickly': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
