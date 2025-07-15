import { describe, it, expect } from 'vitest'

describe('Basic Test Setup', () => {
  it('should run basic math operations', () => {
    expect(2 + 2).toBe(4)
    expect(10 - 5).toBe(5)
    expect(3 * 4).toBe(12)
    expect(8 / 2).toBe(4)
  })

  it('should handle string operations', () => {
    expect('hello'.toUpperCase()).toBe('HELLO')
    expect('world'.length).toBe(5)
    expect('hello' + ' world').toBe('hello world')
  })

  it('should handle array operations', () => {
    const arr = [1, 2, 3]
    expect(arr.length).toBe(3)
    expect(arr.includes(2)).toBe(true)
    expect(arr.includes(5)).toBe(false)
  })

  it('should handle object operations', () => {
    const obj = { name: 'test', value: 42 }
    expect(obj.name).toBe('test')
    expect(obj.value).toBe(42)
    expect(Object.keys(obj)).toEqual(['name', 'value'])
  })

  it('should handle promises', async () => {
    const promise = Promise.resolve('success')
    const result = await promise
    expect(result).toBe('success')
  })
})
