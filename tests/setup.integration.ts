import { beforeAll, afterEach, afterAll } from 'vitest'
// import { server } from './mocks/server'

// Mock environment variables for integration tests
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/maintainpro_test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.JWT_SECRET = 'test-secret'
process.env.SESSION_SECRET = 'test-session-secret'

// Setup MSW for API mocking
// beforeAll(() => server.listen())
// afterEach(() => server.resetHandlers())
// afterAll(() => server.close())

// Global test database setup
beforeAll(async () => {
  // Initialize test database
  // This would typically involve running migrations
  // and seeding test data
})
