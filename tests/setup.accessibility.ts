import '@testing-library/jest-dom'
import { configureAxe, toHaveNoViolations } from 'jest-axe'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Configure axe for accessibility testing
const axe = configureAxe({
  rules: {
    // Enable additional accessibility rules
    'color-contrast': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'landmark-unique': { enabled: true },
    'region': { enabled: true },
  },
})

// Make axe available globally
global.axe = axe

// Mock window.matchMedia for accessibility tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Set up default timeout for accessibility tests
jest.setTimeout(30000)
