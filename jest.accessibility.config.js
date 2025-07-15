/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.accessibility.ts'],
  testMatch: ['<rootDir>/tests/accessibility/**/*.test.{js,ts,jsx,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  collectCoverageFrom: [
    'client/src/**/*.{js,ts,jsx,tsx}',
    '!client/src/**/*.d.ts',
    '!client/src/**/*.stories.{js,ts,jsx,tsx}',
  ],
  coverageDirectory: 'coverage/accessibility',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
};
