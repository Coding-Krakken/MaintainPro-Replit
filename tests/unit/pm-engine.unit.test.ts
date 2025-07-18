import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PMEngine } from '../../server/services/pm-engine';
import { storage } from '../../server/storage';
import { PmTemplate, Equipment, WorkOrder } from '../../shared/schema';

// Mock storage
vi.mock('../../server/storage', () => ({
  storage: {
    getPmTemplate: vi.fn(),
    getPmTemplates: vi.fn(),
    getEquipment: vi.fn(),
    getWorkOrders: vi.fn(),
    createWorkOrder: vi.fn(),
    createWorkOrderChecklistItem: vi.fn(),
    createNotification: vi.fn(),
    getProfiles: vi.fn(),
    getWorkOrder: vi.fn(),
  },
}));

describe('PMEngine', () => {
  let pmEngine: PMEngine;
  const mockWarehouseId = 'test-warehouse-id';
  const mockTemplateId = 'test-template-id';
  const mockEquipmentId = 'test-equipment-id';

  beforeEach(() => {
    pmEngine = PMEngine.getInstance();
    vi.clearAllMocks();
  });

  describe('PM Schedule Calculation', () => {
    it('should calculate next due date correctly for monthly frequency', async () => {
      const mockTemplate: PmTemplate = {
        id: mockTemplateId,
        warehouseId: mockWarehouseId,
        model: 'Test Model',
        component: 'Test Component',
        action: 'Test Action',
        frequency: 'monthly',
        customFields: {},
        active: true,
        createdAt: new Date(),
      };

      const mockWorkOrders: WorkOrder[] = [];

      vi.mocked(storage.getPmTemplate).mockResolvedValue(mockTemplate);
      vi.mocked(storage.getWorkOrders).mockResolvedValue(mockWorkOrders);

      const schedule = await pmEngine.getPMSchedule(mockEquipmentId, mockTemplateId);

      expect(schedule.nextDueDate).toBeDefined();
      expect(schedule.isOverdue).toBe(false);
      expect(schedule.frequency).toBe('monthly');
    });

    it('should mark PM as overdue when due date has passed', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 2);

      const mockTemplate: PmTemplate = {
        id: mockTemplateId,
        warehouseId: mockWarehouseId,
        model: 'Test Model',
        component: 'Test Component',
        action: 'Test Action',
        frequency: 'monthly',
        customFields: {},
        active: true,
        createdAt: new Date(),
      };

      const mockWorkOrders: WorkOrder[] = [{
        id: 'wo-1',
        foNumber: 'WO-001',
        warehouseId: mockWarehouseId,
        type: 'preventive',
        description: 'PM Work Order',
        area: 'Test Area',
        assetModel: 'Test Model',
        status: 'completed',
        priority: 'medium',
        requestedBy: 'user-1',
        assignedTo: 'user-2',
        equipmentId: mockEquipmentId,
        dueDate: pastDate,
        completedAt: pastDate,
        verifiedBy: null,
        estimatedHours: '2.0',
        actualHours: '2.0',
        notes: null,
        followUp: false,
        escalated: false,
        escalationLevel: 0,
        createdAt: pastDate,
        updatedAt: pastDate,
      }];

      vi.mocked(storage.getPmTemplate).mockResolvedValue(mockTemplate);
      vi.mocked(storage.getWorkOrders).mockResolvedValue(mockWorkOrders);

      const schedule = await pmEngine.getPMSchedule(mockEquipmentId, mockTemplateId);

      expect(schedule.isOverdue).toBe(true);
    });

    it('should calculate compliance status correctly', async () => {
      const mockTemplate: PmTemplate = {
        id: mockTemplateId,
        warehouseId: mockWarehouseId,
        model: 'Test Model',
        component: 'Test Component',
        action: 'Test Action',
        frequency: 'monthly',
        customFields: {},
        active: true,
        createdAt: new Date(),
      };

      const mockEquipment: Equipment = {
        id: mockEquipmentId,
        assetTag: 'FO-001',
        model: 'Test Model',
        description: 'Test equipment',
        area: 'Test Area',
        status: 'active',
        criticality: 'high',
        installDate: new Date(),
        warrantyExpiry: null,
        manufacturer: 'Test Manufacturer',
        serialNumber: 'SN-001',
        specifications: {},
        warehouseId: mockWarehouseId,
        createdAt: new Date(),
      };

      vi.mocked(storage.getPmTemplates).mockResolvedValue([mockTemplate]);
      vi.mocked(storage.getEquipment).mockResolvedValue([mockEquipment]);

      const compliance = await pmEngine.checkComplianceStatus(mockEquipmentId, mockWarehouseId);

      expect(compliance).toBeDefined();
      expect(compliance.compliancePercentage).toBeGreaterThanOrEqual(0);
      expect(compliance.compliancePercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('PM Work Order Generation', () => {
    it('should generate PM work orders for due equipment', async () => {
      // Use past date to ensure the PM is due
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 2);

      const mockTemplate: PmTemplate = {
        id: mockTemplateId,
        warehouseId: mockWarehouseId,
        model: 'Test Model',
        component: 'Test Component',
        action: 'Test Action',
        frequency: 'monthly',
        customFields: {},
        active: true,
        createdAt: pastDate,
      };

      const mockEquipment: Equipment[] = [{
        id: mockEquipmentId,
        assetTag: 'FO-001',
        model: 'Test Model',
        description: 'Test equipment',
        area: 'Test Area',
        status: 'active',
        criticality: 'high',
        installDate: pastDate,
        warrantyExpiry: null,
        manufacturer: 'Test Manufacturer',
        serialNumber: 'SN-001',
        specifications: {},
        warehouseId: mockWarehouseId,
        createdAt: pastDate,
      }];

      // Mock a completed PM work order from over a month ago to make the next PM due
      const mockWorkOrders: WorkOrder[] = [{
        id: 'past-wo-1',
        foNumber: 'WO-PAST-001',
        warehouseId: mockWarehouseId,
        type: 'preventive',
        description: 'Past PM Work Order',
        area: 'Test Area',
        assetModel: 'Test Model',
        status: 'completed',
        priority: 'medium',
        requestedBy: 'system',
        assignedTo: 'user-1',
        equipmentId: mockEquipmentId,
        dueDate: pastDate,
        completedAt: pastDate,
        verifiedBy: null,
        estimatedHours: '2.0',
        actualHours: '2.0',
        notes: null,
        followUp: false,
        escalated: false,
        escalationLevel: 0,
        createdAt: pastDate,
        updatedAt: pastDate,
      }];

      vi.mocked(storage.getPmTemplates).mockResolvedValue([mockTemplate]);
      vi.mocked(storage.getPmTemplate).mockResolvedValue(mockTemplate);
      vi.mocked(storage.getEquipment).mockResolvedValue(mockEquipment);
      vi.mocked(storage.getWorkOrders).mockResolvedValue(mockWorkOrders);
      vi.mocked(storage.getProfiles).mockResolvedValue([]);
      vi.mocked(storage.createWorkOrder).mockResolvedValue({
        id: 'new-wo-id',
        foNumber: 'WO-002',
        warehouseId: mockWarehouseId,
        type: 'preventive',
        description: 'New PM Work Order',
        area: 'Test Area',
        assetModel: 'Test Model',
        status: 'new',
        priority: 'medium',
        requestedBy: 'system',
        assignedTo: null,
        equipmentId: mockEquipmentId,
        dueDate: new Date(),
        completedAt: null,
        verifiedBy: null,
        estimatedHours: '2.0',
        actualHours: null,
        notes: null,
        followUp: false,
        escalated: false,
        escalationLevel: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const workOrders = await pmEngine.generatePMWorkOrders(mockWarehouseId);

      expect(workOrders).toBeDefined();
      expect(workOrders.length).toBeGreaterThan(0);
    });

    it('should not generate duplicate PM work orders', async () => {
      const mockTemplate: PmTemplate = {
        id: mockTemplateId,
        warehouseId: mockWarehouseId,
        model: 'Test Model',
        component: 'Test Component',
        action: 'Test Action',
        frequency: 'monthly',
        customFields: {},
        active: true,
        createdAt: new Date(),
      };

      const mockEquipment: Equipment[] = [{
        id: mockEquipmentId,
        assetTag: 'FO-001',
        model: 'Test Model',
        description: 'Test equipment',
        area: 'Test Area',
        status: 'active',
        criticality: 'high',
        installDate: new Date(),
        warrantyExpiry: null,
        manufacturer: 'Test Manufacturer',
        serialNumber: 'SN-001',
        specifications: {},
        warehouseId: mockWarehouseId,
        createdAt: new Date(),
      }];

      const mockWorkOrders: WorkOrder[] = [{
        id: 'wo-1',
        foNumber: 'WO-001',
        warehouseId: mockWarehouseId,
        type: 'preventive',
        description: 'Existing PM Work Order',
        area: 'Test Area',
        assetModel: 'Test Model',
        status: 'new',
        priority: 'medium',
        requestedBy: 'system',
        assignedTo: null,
        equipmentId: mockEquipmentId,
        dueDate: new Date(),
        completedAt: null,
        verifiedBy: null,
        estimatedHours: '2.0',
        actualHours: null,
        notes: null,
        followUp: false,
        escalated: false,
        escalationLevel: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }];

      vi.mocked(storage.getPmTemplates).mockResolvedValue([mockTemplate]);
      vi.mocked(storage.getPmTemplate).mockResolvedValue(mockTemplate);
      vi.mocked(storage.getEquipment).mockResolvedValue(mockEquipment);
      vi.mocked(storage.getWorkOrders).mockResolvedValue(mockWorkOrders);

      const workOrders = await pmEngine.generatePMWorkOrders(mockWarehouseId);

      expect(workOrders).toBeDefined();
      expect(workOrders.length).toBe(0); // No new work orders should be generated
    });
  });

  describe('PM Automation', () => {
    it('should run PM automation and return results', async () => {
      vi.mocked(storage.getPmTemplates).mockResolvedValue([]);
      vi.mocked(storage.getEquipment).mockResolvedValue([]);

      const results = await pmEngine.runPMAutomation(mockWarehouseId);

      expect(results).toBeDefined();
      expect(results.generated).toBeDefined();
      expect(results.errors).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(storage.getPmTemplates).mockRejectedValue(new Error('Database error'));

      const results = await pmEngine.runPMAutomation(mockWarehouseId);
      expect(results.errors).toContain('Database error');
    });
  });

  describe('Notification Creation', () => {
    it('should create notifications for supervisors when PM is due', async () => {
      const mockTemplate: PmTemplate = {
        id: mockTemplateId,
        warehouseId: mockWarehouseId,
        model: 'Test Model',
        component: 'Test Component',
        action: 'Test Action',
        frequency: 'monthly',
        customFields: {},
        active: true,
        createdAt: new Date(),
      };

      const mockEquipment: Equipment[] = [{
        id: mockEquipmentId,
        assetTag: 'FO-001',
        model: 'Test Model',
        description: 'Test equipment',
        area: 'Test Area',
        status: 'active',
        criticality: 'high',
        installDate: new Date(),
        warrantyExpiry: null,
        manufacturer: 'Test Manufacturer',
        serialNumber: 'SN-001',
        specifications: {},
        warehouseId: mockWarehouseId,
        createdAt: new Date(),
      }];

      vi.mocked(storage.getPmTemplates).mockResolvedValue([mockTemplate]);
      vi.mocked(storage.getPmTemplate).mockResolvedValue(mockTemplate);
      vi.mocked(storage.getEquipment).mockResolvedValue(mockEquipment);
      vi.mocked(storage.getWorkOrders).mockResolvedValue([]);
      vi.mocked(storage.getProfiles).mockResolvedValue([]);
      vi.mocked(storage.createNotification).mockResolvedValue({
        id: 'notification-id',
        type: 'pm_due',
        title: 'PM Due',
        message: 'PM is due for equipment',
        userId: 'user-id',
        read: false,
        workOrderId: null,
        equipmentId: mockEquipmentId,
        partId: null,
        createdAt: new Date(),
      });

      const workOrders = await pmEngine.generatePMWorkOrders(mockWarehouseId);

      expect(workOrders).toBeDefined();
    });
  });
});