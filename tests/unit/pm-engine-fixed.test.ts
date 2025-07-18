import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PMEngine } from '../../server/services/pm-engine';
import { storage } from '../../server/storage';
import { PmTemplate, Equipment, WorkOrder } from '../../shared/schema';

// Mock storage
vi.mock('../../server/storage', () => ({
  storage: {
    getPmTemplates: vi.fn(),
    getPmTemplate: vi.fn(),
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
        customFields: null,
        active: true,
        createdAt: new Date(),
      };

      const mockWorkOrders: WorkOrder[] = [];

      vi.mocked(storage.getPmTemplate).mockResolvedValue(mockTemplate);
      vi.mocked(storage.getWorkOrders).mockResolvedValue(mockWorkOrders);

      const schedule = await pmEngine.getPMSchedule(mockEquipmentId, mockTemplateId);

      expect(schedule.equipmentId).toBe(mockEquipmentId);
      expect(schedule.templateId).toBe(mockTemplateId);
      expect(schedule.frequency).toBe('monthly');
      expect(schedule.lastCompletedDate).toBeUndefined();
      expect(schedule.nextDueDate).toBeInstanceOf(Date);
    });

    it('should mark PM as overdue when due date has passed', async () => {
      const mockTemplate: PmTemplate = {
        id: mockTemplateId,
        warehouseId: mockWarehouseId,
        model: 'Test Model',
        component: 'Test Component',
        action: 'Test Action',
        frequency: 'daily',
        customFields: null,
        active: true,
        createdAt: new Date(),
      };

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

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
        createdAt: pastDate,
        completedAt: pastDate,
        escalated: false,
        followUp: false,
        escalationLevel: 0,
        updatedAt: pastDate,
        dueDate: null,
        verifiedBy: null,
        estimatedHours: null,
        actualHours: null,
        notes: null,
      }];

      vi.mocked(storage.getPmTemplate).mockResolvedValue(mockTemplate);
      vi.mocked(storage.getWorkOrders).mockResolvedValue(mockWorkOrders);

      const schedule = await pmEngine.getPMSchedule(mockEquipmentId, mockTemplateId);

      expect(schedule.complianceStatus).toBe('overdue');
      expect(schedule.isOverdue).toBe(true);
    });

    it('should calculate compliance status correctly', async () => {
      const mockEquipment: Equipment = {
        id: mockEquipmentId,
        warehouseId: mockWarehouseId,
        assetTag: 'TEST-001',
        model: 'Test Model',
        manufacturer: 'Test Manufacturer',
        serialNumber: 'SN-001',
        description: 'Test Equipment',
        area: 'Test Area',
        status: 'active',
        criticality: 'medium',
        installDate: new Date(),
        createdAt: new Date(),
        warrantyExpiry: null,
        specifications: null,
      };

      const mockTemplates: PmTemplate[] = [{
        id: mockTemplateId,
        warehouseId: mockWarehouseId,
        model: 'Test Model',
        component: 'Test Component',
        action: 'Test Action',
        frequency: 'monthly',
        customFields: null,
        active: true,
        createdAt: new Date(),
      }];

      vi.mocked(storage.getEquipment).mockResolvedValue([mockEquipment]);
      vi.mocked(storage.getPmTemplates).mockResolvedValue(mockTemplates);
      vi.mocked(storage.getWorkOrders).mockResolvedValue([]);

      const compliance = await pmEngine.checkComplianceStatus(mockEquipmentId, mockWarehouseId);

      expect(compliance.equipmentId).toBe(mockEquipmentId);
      expect(compliance.compliancePercentage).toBeGreaterThanOrEqual(0);
      expect(compliance.compliancePercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('PM Work Order Generation', () => {
    it('should generate PM work orders for due equipment', async () => {
      const mockEquipment: Equipment = {
        id: mockEquipmentId,
        warehouseId: mockWarehouseId,
        assetTag: 'TEST-001',
        model: 'Test Model',
        manufacturer: 'Test Manufacturer',
        serialNumber: 'SN-001',
        description: 'Test Equipment',
        area: 'Test Area',
        status: 'active',
        criticality: 'medium',
        installDate: new Date(),
        createdAt: new Date(),
        warrantyExpiry: null,
        specifications: null,
      };

      const mockTemplate: PmTemplate = {
        id: mockTemplateId,
        warehouseId: mockWarehouseId,
        model: 'Test Model',
        component: 'Test Component',
        action: 'Test Action',
        frequency: 'daily',
        customFields: null,
        active: true,
        createdAt: new Date(),
      };

      const mockWorkOrder: WorkOrder = {
        id: 'new-wo-id',
        foNumber: 'WO-PM-001',
        warehouseId: mockWarehouseId,
        type: 'preventive',
        description: 'Test Action for Test Component',
        area: 'Test Area',
        assetModel: 'Test Model',
        status: 'new',
        priority: 'medium',
        requestedBy: 'system',
        assignedTo: null,
        equipmentId: mockEquipmentId,
        createdAt: new Date(),
        escalated: false,
        followUp: false,
        escalationLevel: 0,
        updatedAt: new Date(),
        dueDate: null,
        verifiedBy: null,
        estimatedHours: null,
        actualHours: null,
        notes: null,
        completedAt: null,
      };

      vi.mocked(storage.getPmTemplates).mockResolvedValue([mockTemplate]);
      vi.mocked(storage.getEquipment).mockResolvedValue([mockEquipment]);
      vi.mocked(storage.getWorkOrders).mockResolvedValue([]);
      vi.mocked(storage.createWorkOrder).mockResolvedValue(mockWorkOrder);
      vi.mocked(storage.createWorkOrderChecklistItem).mockResolvedValue({
        id: 'checklist-1',
        workOrderId: mockWorkOrder.id,
        component: mockTemplate.component,
        action: mockTemplate.action,
        completed: false,
        completedBy: null,
        completedAt: null,
        notes: null,
        createdAt: new Date(),
      });

      const result = await pmEngine.generatePMWorkOrders(mockWarehouseId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockWorkOrder.id);
    });

    it('should not generate duplicate PM work orders', async () => {
      const mockEquipment: Equipment = {
        id: mockEquipmentId,
        warehouseId: mockWarehouseId,
        assetTag: 'TEST-001',
        model: 'Test Model',
        manufacturer: 'Test Manufacturer',
        serialNumber: 'SN-001',
        description: 'Test Equipment',
        area: 'Test Area',
        status: 'active',
        criticality: 'medium',
        installDate: new Date(),
        createdAt: new Date(),
        warrantyExpiry: null,
        specifications: null,
      };

      const mockTemplate: PmTemplate = {
        id: mockTemplateId,
        warehouseId: mockWarehouseId,
        model: 'Test Model',
        component: 'Test Component',
        action: 'Test Action',
        frequency: 'daily',
        customFields: null,
        active: true,
        createdAt: new Date(),
      };

      // Mock existing work order for today
      const existingWorkOrder: WorkOrder = {
        id: 'existing-wo-id',
        foNumber: 'WO-PM-001',
        warehouseId: mockWarehouseId,
        type: 'preventive',
        description: 'Test Action for Test Component',
        area: 'Test Area',
        assetModel: 'Test Model',
        status: 'new',
        priority: 'medium',
        requestedBy: 'system',
        assignedTo: null,
        equipmentId: mockEquipmentId,
        createdAt: new Date(),
        escalated: false,
        followUp: false,
        escalationLevel: 0,
        updatedAt: new Date(),
        dueDate: null,
        verifiedBy: null,
        estimatedHours: null,
        actualHours: null,
        notes: null,
        completedAt: null,
      };

      vi.mocked(storage.getPmTemplates).mockResolvedValue([mockTemplate]);
      vi.mocked(storage.getEquipment).mockResolvedValue([mockEquipment]);
      vi.mocked(storage.getWorkOrders).mockResolvedValue([existingWorkOrder]);

      const result = await pmEngine.generatePMWorkOrders(mockWarehouseId);

      expect(result).toHaveLength(0);
      expect(storage.createWorkOrder).not.toHaveBeenCalled();
    });
  });

  describe('PM Automation', () => {
    it('should run PM automation and return results', async () => {
      const result = await pmEngine.runPMAutomation(mockWarehouseId);

      expect(result.generated).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(storage.getPmTemplates).mockRejectedValue(new Error('Database error'));

      const result = await pmEngine.runPMAutomation(mockWarehouseId);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.generated).toBe(0);
    });
  });

  describe('Notification Creation', () => {
    it('should create notifications for supervisors when PM is due', async () => {
      const mockEquipment: Equipment = {
        id: mockEquipmentId,
        warehouseId: mockWarehouseId,
        assetTag: 'TEST-001',
        model: 'Test Model',
        manufacturer: 'Test Manufacturer',
        serialNumber: 'SN-001',
        description: 'Test Equipment',
        area: 'Test Area',
        status: 'active',
        criticality: 'high',
        installDate: new Date(),
        createdAt: new Date(),
        warrantyExpiry: null,
        specifications: null,
      };

      const mockTemplate: PmTemplate = {
        id: mockTemplateId,
        warehouseId: mockWarehouseId,
        model: 'Test Model',
        component: 'Test Component',
        action: 'Test Action',
        frequency: 'daily',
        customFields: null,
        active: true,
        createdAt: new Date(),
      };

      const mockProfiles = [
        { id: 'supervisor-1', role: 'supervisor', warehouseId: mockWarehouseId },
        { id: 'technician-1', role: 'technician', warehouseId: mockWarehouseId },
      ];

      vi.mocked(storage.getPmTemplates).mockResolvedValue([mockTemplate]);
      vi.mocked(storage.getEquipment).mockResolvedValue([mockEquipment]);
      vi.mocked(storage.getWorkOrders).mockResolvedValue([]);
      vi.mocked(storage.getProfiles).mockResolvedValue(mockProfiles);
      vi.mocked(storage.createNotification).mockResolvedValue({
        id: 'notification-1',
        userId: 'supervisor-1',
        type: 'pm_due',
        title: 'PM Due',
        message: 'PM due for equipment',
        read: false,
        data: {},
        createdAt: new Date(),
      });

      await pmEngine.generatePMWorkOrders(mockWarehouseId);

      // Should call createNotification for supervisors
      expect(storage.createNotification).toHaveBeenCalled();
    });
  });
});
