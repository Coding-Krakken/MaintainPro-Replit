import { describe, it, expect } from 'vitest'

describe('Basic Integration Test', () => {
  it('should test environment variables', () => {
    // Test that we can access process.env
    expect(process.env.NODE_ENV).toBeDefined()
  })

  it('should test async operations', async () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    
    const start = Date.now()
    await delay(50)
    const end = Date.now()
    
    expect(end - start).toBeGreaterThanOrEqual(45)
  })

  it('should test JSON operations', () => {
    const data = { test: 'value', number: 42 }
    const json = JSON.stringify(data)
    const parsed = JSON.parse(json)
    
    expect(parsed).toEqual(data)
  })
})
