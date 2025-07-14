**Testing Strategy & Quality Assurance**

---

**Purpose:**
Comprehensive testing approach covering unit tests, integration tests, end-to-end workflows, and quality assurance for the CMMS system.

---

**1. Testing Framework & Structure:**

**1.1. Test Technologies:**
* **Unit Tests**: Vitest + React Testing Library
* **Integration Tests**: Vitest with Supabase test client
* **E2E Tests**: Playwright for cross-browser testing
* **Component Tests**: Storybook for isolated component testing
* **Performance Tests**: Lighthouse CI for performance regression
* **API Tests**: Postman/Newman for API contract testing

**1.2. Test Coverage Requirements:**
* Minimum 80% code coverage for business logic
* 100% coverage for critical workflows (WO completion, part usage)
* All user roles must have dedicated test scenarios
* Mobile responsive testing across devices

---

**2. Unit Testing Strategy:**

**2.1. Component Testing:**
```typescript
// Example: Work Order Card component test
describe('WorkOrderCard', () => {
  it('displays work order information correctly', () => {
    const mockWO = createMockWorkOrder();
    render(<WorkOrderCard workOrder={mockWO} />);
    
    expect(screen.getByText(mockWO.fo_number)).toBeInTheDocument();
    expect(screen.getByText(mockWO.description)).toBeInTheDocument();
    expect(screen.getByText(mockWO.priority)).toBeInTheDocument();
  });

  it('handles status updates correctly', async () => {
    const mockOnStatusChange = vi.fn();
    render(<WorkOrderCard workOrder={mockWO} onStatusChange={mockOnStatusChange} />);
    
    await user.click(screen.getByRole('button', { name: /complete/i }));
    expect(mockOnStatusChange).toHaveBeenCalledWith('completed');
  });
});
```

**2.2. Hook Testing:**
```typescript
// Example: useWorkOrders hook test
describe('useWorkOrders', () => {
  it('fetches work orders for current user', async () => {
    const { result } = renderHook(() => useWorkOrders());
    
    await waitFor(() => {
      expect(result.current.data).toHaveLength(3);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles offline mode correctly', async () => {
    // Mock offline state
    vi.mock('@/hooks/useNetworkStatus', () => ({ isOnline: false }));
    
    const { result } = renderHook(() => useWorkOrders());
    
    expect(result.current.data).toEqual(mockOfflineData);
    expect(result.current.isOffline).toBe(true);
  });
});
```

---

**3. Integration Testing:**

**3.1. Database Integration:**
```typescript
// Example: Work Order CRUD operations
describe('Work Order Integration', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedTestData();
  });

  it('creates work order with proper audit logging', async () => {
    const newWO = await createWorkOrder(mockWOData);
    
    expect(newWO.id).toBeDefined();
    expect(newWO.created_by).toBe(testUser.id);
    
    // Verify audit log entry
    const auditLog = await getAuditLogs({ record_id: newWO.id });
    expect(auditLog).toHaveLength(1);
    expect(auditLog[0].action).toBe('WO Created');
  });

  it('enforces RLS policies correctly', async () => {
    // Test warehouse isolation
    const wrongWarehouseUser = createTestUser({ warehouse_id: 'other-warehouse' });
    
    await expect(
      getWorkOrders({ user: wrongWarehouseUser })
    ).resolves.toHaveLength(0);
  });
});
```

**3.2. File Upload Integration:**
```typescript
describe('File Upload Integration', () => {
  it('uploads and processes images correctly', async () => {
    const mockFile = createMockImageFile();
    
    const result = await uploadWorkOrderAttachment(workOrderId, mockFile);
    
    expect(result.file_url).toMatch(/supabase.*storage/);
    expect(result.file_size).toBeLessThan(5 * 1024 * 1024); // 5MB compressed
    expect(result.file_type).toBe('image/jpeg');
  });

  it('rejects invalid file types', async () => {
    const invalidFile = createMockFile({ type: 'application/exe' });
    
    await expect(
      uploadWorkOrderAttachment(workOrderId, invalidFile)
    ).rejects.toThrow('Invalid file type');
  });
});
```

---

**4. End-to-End Testing:**

**4.1. Critical User Journeys:**
```typescript
// Example: Complete work order workflow
test('Technician completes work order workflow', async ({ page }) => {
  // Login as technician
  await loginAsRole(page, 'technician');
  
  // Navigate to assigned work orders
  await page.click('[data-testid="assigned-work-orders"]');
  
  // Select a work order
  await page.click('[data-testid="work-order-card"]:first-child');
  
  // Update status to in progress
  await page.selectOption('[data-testid="status-select"]', 'in_progress');
  
  // Complete checklist items
  await page.check('[data-testid="checklist-item-1"]');
  await page.fill('[data-testid="checklist-notes-1"]', 'Completed successfully');
  
  // Add parts usage
  await page.click('[data-testid="add-parts-button"]');
  await page.fill('[data-testid="part-search"]', 'HYT106');
  await page.click('[data-testid="part-select"]:first-child');
  await page.fill('[data-testid="quantity-used"]', '2');
  
  // Upload photo
  await page.setInputFiles('[data-testid="file-upload"]', 'test-image.jpg');
  
  // Complete work order
  await page.click('[data-testid="complete-work-order"]');
  
  // Verify completion
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  
  // Verify audit trail
  await page.click('[data-testid="audit-tab"]');
  await expect(page.locator('[data-testid="audit-entry"]')).toContainText('Status changed to completed');
});
```

**4.2. Mobile-Specific Testing:**
```typescript
test('Mobile work order completion', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  
  // Test touch interactions
  await page.tap('[data-testid="work-order-card"]');
  
  // Test swipe gestures for status updates
  await page.touchscreen.swipe(100, 300, 300, 300);
  
  // Test voice-to-text simulation
  await page.click('[data-testid="voice-notes-button"]');
  await page.fill('[data-testid="notes-input"]', 'Voice transcription: Equipment running normally');
  
  // Test QR code scanning simulation
  await page.click('[data-testid="scan-qr-button"]');
  await page.evaluate(() => {
    window.mockQRScan('UAS-001'); // Simulate QR scan result
  });
});
```

---

**5. Performance Testing:**

**5.1. Load Testing:**
```typescript
// Example: API load testing
describe('Performance Tests', () => {
  it('handles concurrent work order updates', async () => {
    const concurrentUpdates = Array.from({ length: 50 }, (_, i) => 
      updateWorkOrderStatus(workOrderId, 'in_progress', `user-${i}`)
    );
    
    const startTime = Date.now();
    await Promise.all(concurrentUpdates);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(5000); // 5 second SLA
  });

  it('maintains performance with large datasets', async () => {
    // Seed 10,000 work orders
    await seedLargeDataset();
    
    const startTime = Date.now();
    const workOrders = await getWorkOrders({ limit: 20, page: 1 });
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(500); // 500ms SLA
    expect(workOrders).toHaveLength(20);
  });
});
```

---

**6. Accessibility Testing:**

**6.1. WCAG Compliance:**
```typescript
// Example: Accessibility testing
describe('Accessibility Tests', () => {
  it('meets WCAG 2.1 AA standards', async () => {
    const { container } = render(<WorkOrderForm />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });

  it('supports keyboard navigation', async () => {
    render(<WorkOrderList />);
    
    // Tab through all interactive elements
    const interactiveElements = screen.getAllByRole('button');
    
    for (const element of interactiveElements) {
      element.focus();
      expect(element).toHaveFocus();
    }
  });

  it('provides proper ARIA labels', () => {
    render(<WorkOrderCard workOrder={mockWO} />);
    
    expect(screen.getByLabelText(/work order priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
  });
});
```

---

**7. Security Testing:**

**7.1. Authentication & Authorization:**
```typescript
describe('Security Tests', () => {
  it('prevents unauthorized access to work orders', async () => {
    const unauthorizedUser = createTestUser({ role: 'requester' });
    
    await expect(
      getWorkOrderDetails(workOrderId, { user: unauthorizedUser })
    ).rejects.toThrow('Insufficient permissions');
  });

  it('sanitizes user input', async () => {
    const maliciousInput = '<script>alert("xss")</script>';
    
    const workOrder = await createWorkOrder({
      description: maliciousInput
    });
    
    expect(workOrder.description).not.toContain('<script>');
    expect(workOrder.description).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
  });
});
```

---

**8. CI/CD Testing Pipeline:**

**8.1. Automated Testing Workflow:**
```yaml
# Example: GitHub Actions workflow
name: Test & Deploy
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Unit Tests
        run: npm run test:unit
      
      - name: Integration Tests
        run: npm run test:integration
        env:
          SUPABASE_TEST_URL: ${{ secrets.SUPABASE_TEST_URL }}
      
      - name: E2E Tests
        run: npm run test:e2e
      
      - name: Performance Tests
        run: npm run test:performance
      
      - name: Security Scan
        run: npm audit && npm run test:security
```

**8.2. Quality Gates:**
* All tests must pass before deployment
* Code coverage must be ≥80%
* Performance benchmarks must be met
* Security vulnerabilities must be resolved
* Accessibility standards must be maintained
