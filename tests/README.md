# MaintainPro CMMS Testing Framework

## Overview

This document describes the comprehensive testing framework implemented for MaintainPro CMMS. The framework includes unit tests, integration tests, end-to-end tests, performance tests, and accessibility tests as outlined in the project roadmap.

## Test Categories

### 1. Unit Tests
- **Location**: `tests/unit/`
- **Framework**: Vitest with Jest DOM
- **Coverage Target**: >85%
- **Command**: `npm run test:unit`

Unit tests focus on individual components, hooks, and utility functions. They run in isolation with mocked dependencies.

### 2. Integration Tests
- **Location**: `tests/integration/`
- **Framework**: Vitest with Supertest
- **Coverage Target**: >80%
- **Command**: `npm run test:integration`

Integration tests verify API endpoints, database operations, and service integrations.

### 3. End-to-End Tests
- **Location**: `tests/e2e/`
- **Framework**: Playwright
- **Command**: `npm run test:e2e`

E2E tests simulate real user interactions across the entire application workflow.

### 4. Performance Tests
- **Location**: `tests/performance/`
- **Framework**: k6
- **Command**: `npm run test:performance`

Performance tests validate application performance under various load conditions.

### 5. Accessibility Tests
- **Location**: `tests/accessibility/`
- **Framework**: Jest with jest-axe
- **Standard**: WCAG 2.1 AA
- **Command**: `npm run test:accessibility`

Accessibility tests ensure the application meets WCAG 2.1 AA standards.

## Test Configuration

### Vitest Configuration
The main Vitest configuration (`vitest.config.ts`) includes:
- JSX support with React plugin
- JSdom environment for DOM testing
- Path aliases for imports
- Coverage thresholds
- Test setup files

### Playwright Configuration
The Playwright configuration (`playwright.config.ts`) includes:
- Multi-browser testing (Chrome, Firefox, Safari)
- Mobile device testing
- Screenshot and video recording on failure
- Retry configuration for CI environments

### Jest Configuration (Accessibility)
The Jest configuration (`jest.accessibility.config.js`) includes:
- JSdom environment
- Axe-core integration
- Custom accessibility matchers

## Test Utilities

### Test Utilities (`tests/utils/test-utils.tsx`)
- Custom render function with providers
- React Query client configuration
- Theme and routing providers

### Test Mocks (`tests/utils/test-mocks.ts`)
- Mock user data
- Mock API responses
- Mock browser APIs (localStorage, sessionStorage, etc.)
- Mock WebSocket connections

### MSW Setup (`tests/mocks/`)
- Mock Service Worker configuration
- API endpoint mocking
- Request/response handling

## Running Tests

### All Tests
```bash
npm run test:all
```

### Individual Test Types
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance

# Accessibility tests
npm run test:accessibility
```

### Test Coverage
```bash
npm run test:coverage
```

### Interactive Test UI
```bash
npm run test:ui
```

## Test Data Management

### Test Database
- Separate test database configuration
- Automatic schema setup and teardown
- Test data seeding for consistent tests

### Mock Data
- Consistent mock data across test types
- Realistic test scenarios
- Edge case coverage

## CI/CD Integration

### GitHub Actions Workflow
The CI/CD pipeline includes:
1. **Test Stage**: All test types run in parallel
2. **Performance Stage**: Load and stress testing
3. **Security Stage**: Vulnerability scanning
4. **Deployment Stage**: Staging and production deployment

### Test Thresholds
- **Unit Tests**: 85% coverage
- **Integration Tests**: 80% coverage
- **E2E Tests**: All critical paths covered
- **Performance Tests**: 95% requests < 500ms
- **Accessibility Tests**: Zero violations

## Best Practices

### Writing Tests
1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Test Behavior, Not Implementation**: Focus on user interactions
3. **Use Descriptive Names**: Clear test descriptions
4. **Mock External Dependencies**: Isolate units under test
5. **Test Edge Cases**: Include error scenarios

### Test Organization
1. **Group Related Tests**: Use `describe` blocks
2. **Setup and Teardown**: Use `beforeEach` and `afterEach`
3. **Test Data**: Use factories for consistent data
4. **File Naming**: Use `.test.ts` or `.spec.ts` suffixes

### Performance Testing
1. **Realistic Load**: Use production-like data volumes
2. **Gradual Ramp-up**: Simulate realistic user behavior
3. **Monitor Key Metrics**: Response time, error rate, throughput
4. **Test Different Scenarios**: Load, stress, spike testing

### Accessibility Testing
1. **Automated Testing**: Use axe-core for basic checks
2. **Manual Testing**: Test with screen readers
3. **Keyboard Navigation**: Verify tab order and focus
4. **Color Contrast**: Ensure WCAG compliance
5. **ARIA Labels**: Test semantic markup

## Debugging Tests

### Unit/Integration Tests
```bash
# Debug mode
npm run test:debug

# Watch mode
npm run test:watch

# Specific test file
npm run test -- path/to/test.spec.ts
```

### E2E Tests
```bash
# Debug mode with UI
npm run test:e2e:ui

# Headed mode
npx playwright test --headed

# Specific test
npx playwright test --grep "test name"
```

## Continuous Improvement

### Test Metrics
- Track test coverage trends
- Monitor test execution time
- Identify flaky tests
- Measure test effectiveness

### Test Maintenance
- Regular test review and cleanup
- Update tests with feature changes
- Refactor duplicate test code
- Maintain test documentation

## Environment Variables

### Test Configuration
```env
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/maintainpro_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret
SESSION_SECRET=test-session-secret
```

### CI/CD Variables
```env
# GitHub Actions Secrets
TEST_DATABASE_URL
TEST_REDIS_URL
STAGING_DEPLOY_TOKEN
PRODUCTION_DEPLOY_TOKEN
SLACK_WEBHOOK
CODECOV_TOKEN
```

## Troubleshooting

### Common Issues
1. **Test Timeout**: Increase timeout for slow operations
2. **Database Connection**: Ensure test database is running
3. **Flaky Tests**: Add proper waiting mechanisms
4. **Memory Leaks**: Clean up resources in afterEach
5. **Mock Issues**: Reset mocks between tests

### Performance Issues
1. **Slow Tests**: Profile test execution
2. **Large Test Suite**: Parallelize test execution
3. **Database Performance**: Optimize test queries
4. **Network Calls**: Mock external services

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [k6 Documentation](https://k6.io/docs/)
- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)

### Testing Guidelines
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Performance Testing Guide](https://k6.io/docs/testing-guides/)

---

This testing framework provides comprehensive coverage for all aspects of the MaintainPro CMMS application, ensuring high quality, performance, and accessibility standards are met throughout the development lifecycle.
