export const testData = {
  workOrder: {
    foNumber: 'WO-E2E-001',
    description: 'End-to-end test work order',
    priority: 'medium',
    equipmentId: '1',
  },
  equipment: {
    name: 'Test Equipment',
    model: 'TEST-001',
    serialNumber: 'SN123456',
    location: 'Plant 1',
  },
  part: {
    partNumber: 'HYT106',
    description: 'Test Part',
    quantity: 2,
  }
};

export const testCredentials = {
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
  valid: {
    email: 'test@example.com',
    password: 'password',
  }
};
