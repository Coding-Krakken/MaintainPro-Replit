import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pmSchedulerEnhanced } from '../../server/services/pm-scheduler-enhanced';
import { notificationEngine } from '../../server/services/notification-engine';
import { storage } from '../../server/storage';

// Mock dependencies
vi.mock('../../server/storage', () => ({
  storage: {
    getPmTemplates: vi.fn(),
    getEquipment: vi.fn(),
    getWorkOrders: vi.fn(),
    getWarehouses: vi.fn(),
    getProfiles: vi.fn(),
    getEquipmentById: vi.fn(),
  },
}));

vi.mock('../../server/services/notification-engine', () => ({
  notificationEngine: {
    sendNotification: vi.fn(),
  },
}));

vi.mock('../../server/services/pm-engine', () => ({
  pmEngine: {
    getPMSchedule: vi.fn(),
    checkComplianceStatus: vi.fn(),
  },
}));

const mockStorage = storage as any;
const mockNotificationEngine = notificationEngine as any;

describe('PM Scheduler Enhanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadSchedulingRules', () => {
    it('should load scheduling rules from PM templates', async () => {
      const mockTemplates = [
        {
          id: 'template1',
          model: 'Pump Model A',
          component: 'Motor',
          action: 'Inspect',
          frequency: 'monthly',
          warehouseId: 'warehouse1',
        },
        {
          id: 'template2',
          model: 'Conveyor Belt',
          component: 'Belt',
          action: 'Replace',
          frequency: 'quarterly',
          warehouseId: 'warehouse1',
        },
      ];

      mockStorage.getPmTemplates.mockResolvedValue(mockTemplates);

      const rules = await pmSchedulerEnhanced.loadSchedulingRules('warehouse1');

      expect(rules).toHaveLength(2);
      expect(rules[0]).toMatchObject({
        name: 'Pump Model A - Motor',
        equipmentModels: ['Pump Model A'],
        frequency: 'monthly',
        triggerType: 'time_based',
        autoGenerate: true,
        isActive: true,
      });
      expect(rules[1]).toMatchObject({
        name: 'Conveyor Belt - Belt',
        equipmentModels: ['Conveyor Belt'],
        frequency: 'quarterly',
        triggerType: 'time_based',
        autoGenerate: true,
        isActive: true,
      });
    });

    it('should handle empty templates', async () => {
      mockStorage.getPmTemplates.mockResolvedValue([]);

      const rules = await pmSchedulerEnhanced.loadSchedulingRules('warehouse1');

      expect(rules).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      mockStorage.getPmTemplates.mockRejectedValue(new Error('Database error'));

      await expect(pmSchedulerEnhanced.loadSchedulingRules('warehouse1')).rejects.toThrow('Database error');
    });
  });

  describe('loadSchedulingConfig', () => {
    it('should load default scheduling configuration', async () => {
      const config = await pmSchedulerEnhanced.loadSchedulingConfig('warehouse1');

      expect(config).toMatchObject({
        warehouseId: 'warehouse1',
        globalSettings: {
          autoSchedulingEnabled: true,
          defaultLeadTime: 2,
          workingDays: [1, 2, 3, 4, 5],
          workingHours: { start: '08:00', end: '17:00' },
          maxConcurrentPMs: 10,
        },
        escalationRules: {
          overduePMHours: 24,
          missedPMHours: 48,
          escalationLevels: expect.arrayContaining([
            expect.objectContaining({
              level: 1,
              delayHours: 4,
              recipients: ['supervisor'],
              actions: ['notify'],
            }),
          ]),
        },
        complianceTargets: {
          overallComplianceRate: 95,
          criticalEquipmentRate: 100,
          maxOverdueDays: 3,
        },
      });
    });
  });

  describe('generateOptimizedSchedule', () => {
    it('should generate optimized schedule without conflicts', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      // Mock templates
      const mockTemplates = [
        {
          id: 'template1',
          model: 'Pump Model A',
          component: 'Motor',
          action: 'Inspect',
          frequency: 'monthly',
          warehouseId: 'warehouse1',
        },
      ];

      // Mock equipment
      const mockEquipment = [
        {
          id: 'equipment1',
          model: 'Pump Model A',
          status: 'active',
          assetTag: 'PUMP001',
        },
      ];

      // Mock work orders
      const mockWorkOrders = [];

      // Mock PM engine
      const { pmEngine } = await import('../../server/services/pm-engine');
      (pmEngine.getPMSchedule as any).mockResolvedValue({
        nextDueDate: new Date('2024-01-03'),
        complianceStatus: 'due',
      });

      mockStorage.getPmTemplates.mockResolvedValue(mockTemplates);
      mockStorage.getEquipment.mockResolvedValue(mockEquipment);
      mockStorage.getWorkOrders.mockResolvedValue(mockWorkOrders);

      const schedule = await pmSchedulerEnhanced.generateOptimizedSchedule('warehouse1', startDate, endDate);

      expect(schedule.scheduledPMs).toHaveLength(1);
      expect(schedule.scheduledPMs[0]).toMatchObject({
        equipmentId: 'equipment1',
        templateId: 'rule_template1',
        priority: 'medium',
        estimatedDuration: 2,
      });
      expect(schedule.conflicts).toHaveLength(0);
      expect(schedule.statistics.totalScheduled).toBe(1);
    });

    it('should detect scheduling conflicts', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      // Mock templates
      const mockTemplates = [
        {
          id: 'template1',
          model: 'Pump Model A',
          component: 'Motor',
          action: 'Inspect',
          frequency: 'monthly',
          warehouseId: 'warehouse1',
        },
      ];

      // Mock equipment
      const mockEquipment = [
        {
          id: 'equipment1',
          model: 'Pump Model A',
          status: 'active',
          assetTag: 'PUMP001',
        },
      ];

      // Mock work orders with conflict
      const mockWorkOrders = [
        {
          id: 'wo1',
          equipmentId: 'equipment1',
          status: 'assigned',
          dueDate: new Date('2024-01-03'),
        },
      ];

      // Mock PM engine
      const { pmEngine } = await import('../../server/services/pm-engine');
      (pmEngine.getPMSchedule as any).mockResolvedValue({
        nextDueDate: new Date('2024-01-03'),
        complianceStatus: 'due',
      });

      mockStorage.getPmTemplates.mockResolvedValue(mockTemplates);
      mockStorage.getEquipment.mockResolvedValue(mockEquipment);
      mockStorage.getWorkOrders.mockResolvedValue(mockWorkOrders);

      const schedule = await pmSchedulerEnhanced.generateOptimizedSchedule('warehouse1', startDate, endDate);

      expect(schedule.conflicts).toHaveLength(1);
      expect(schedule.conflicts[0]).toMatchObject({
        equipmentId: 'equipment1',
        conflictType: 'equipment_occupied',
        resolution: 'Reschedule or combine with existing work order',
      });
    });

    it('should prioritize by priority level', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      // Mock templates with different priorities
      const mockTemplates = [
        {
          id: 'template1',
          model: 'Pump Model A',
          component: 'Motor',
          action: 'Inspect',
          frequency: 'monthly',
          warehouseId: 'warehouse1',
        },
        {
          id: 'template2',
          model: 'Pump Model B',
          component: 'Motor',
          action: 'Inspect',
          frequency: 'monthly',
          warehouseId: 'warehouse1',
        },
      ];

      // Mock equipment
      const mockEquipment = [
        {
          id: 'equipment1',
          model: 'Pump Model A',
          status: 'active',
          assetTag: 'PUMP001',
        },
        {
          id: 'equipment2',
          model: 'Pump Model B',
          status: 'active',
          assetTag: 'PUMP002',
        },
      ];

      const mockWorkOrders = [];

      // Mock PM engine with different due dates
      const { pmEngine } = await import('../../server/services/pm-engine');
      (pmEngine.getPMSchedule as any)
        .mockResolvedValueOnce({
          nextDueDate: new Date('2024-01-03'),
          complianceStatus: 'due',
        })
        .mockResolvedValueOnce({
          nextDueDate: new Date('2024-01-02'),
          complianceStatus: 'overdue',
        });

      mockStorage.getPmTemplates.mockResolvedValue(mockTemplates);
      mockStorage.getEquipment.mockResolvedValue(mockEquipment);
      mockStorage.getWorkOrders.mockResolvedValue(mockWorkOrders);

      const schedule = await pmSchedulerEnhanced.generateOptimizedSchedule('warehouse1', startDate, endDate);

      expect(schedule.scheduledPMs).toHaveLength(2);
      // First item should be the earlier due date
      expect(schedule.scheduledPMs[0].scheduledDate).toEqual(new Date('2024-01-02'));
      expect(schedule.scheduledPMs[1].scheduledDate).toEqual(new Date('2024-01-03'));
    });
  });

  describe('processMissedPMEscalations', () => {
    it('should process escalations for non-compliant equipment', async () => {
      const mockEquipment = [
        {
          id: 'equipment1',
          model: 'Pump Model A',
          status: 'active',
          assetTag: 'PUMP001',
        },
      ];

      const mockProfiles = [
        {
          id: 'supervisor1',
          role: 'supervisor',
          warehouseId: 'warehouse1',
        },
      ];

      // Mock PM engine
      const { pmEngine } = await import('../../server/services/pm-engine');
      (pmEngine.checkComplianceStatus as any).mockResolvedValue({
        compliancePercentage: 80, // Below target
        missedPMCount: 2,
      });

      mockStorage.getEquipment.mockResolvedValue(mockEquipment);
      mockStorage.getProfiles.mockResolvedValue(mockProfiles);
      mockStorage.getEquipmentById.mockResolvedValue(mockEquipment[0]);

      await pmSchedulerEnhanced.processMissedPMEscalations('warehouse1');

      expect(mockNotificationEngine.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'supervisor1',
          type: 'pm_escalation',
          title: 'PM Escalation - Level 1',
          priority: 'high',
          channels: ['email', 'sms'],
        })
      );
    });

    it('should not escalate for compliant equipment', async () => {
      const mockEquipment = [
        {
          id: 'equipment1',
          model: 'Pump Model A',
          status: 'active',
          assetTag: 'PUMP001',
        },
      ];

      // Mock PM engine
      const { pmEngine } = await import('../../server/services/pm-engine');
      (pmEngine.checkComplianceStatus as any).mockResolvedValue({
        compliancePercentage: 100, // Above target
        missedPMCount: 0,
      });

      mockStorage.getEquipment.mockResolvedValue(mockEquipment);

      await pmSchedulerEnhanced.processMissedPMEscalations('warehouse1');

      expect(mockNotificationEngine.sendNotification).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockStorage.getEquipment.mockRejectedValue(new Error('Database error'));

      await expect(pmSchedulerEnhanced.processMissedPMEscalations('warehouse1')).resolves.not.toThrow();
    });
  });

  describe('automated scheduling', () => {
    it('should start automated scheduling', async () => {
      const mockWarehouses = [
        {
          id: 'warehouse1',
          name: 'Main Warehouse',
          active: true,
        },
      ];

      mockStorage.getWarehouses.mockResolvedValue(mockWarehouses);

      await pmSchedulerEnhanced.startAutomatedScheduling(1); // 1 minute interval for testing

      const status = pmSchedulerEnhanced.getSchedulingStatus();
      expect(status.isRunning).toBe(true);

      pmSchedulerEnhanced.stopAutomatedScheduling();
    });

    it('should stop automated scheduling', async () => {
      await pmSchedulerEnhanced.startAutomatedScheduling(1);
      
      pmSchedulerEnhanced.stopAutomatedScheduling();
      
      const status = pmSchedulerEnhanced.getSchedulingStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should not start if already running', async () => {
      await pmSchedulerEnhanced.startAutomatedScheduling(1);
      
      // Try to start again
      await pmSchedulerEnhanced.startAutomatedScheduling(1);
      
      const status = pmSchedulerEnhanced.getSchedulingStatus();
      expect(status.isRunning).toBe(true);
      
      pmSchedulerEnhanced.stopAutomatedScheduling();
    });
  });

  describe('utilization calculation', () => {
    it('should calculate utilization rate correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      // Mock templates
      const mockTemplates = [
        {
          id: 'template1',
          model: 'Pump Model A',
          component: 'Motor',
          action: 'Inspect',
          frequency: 'monthly',
          warehouseId: 'warehouse1',
        },
      ];

      // Mock equipment
      const mockEquipment = [
        {
          id: 'equipment1',
          model: 'Pump Model A',
          status: 'active',
          assetTag: 'PUMP001',
        },
      ];

      const mockWorkOrders = [];

      // Mock PM engine
      const { pmEngine } = await import('../../server/services/pm-engine');
      (pmEngine.getPMSchedule as any).mockResolvedValue({
        nextDueDate: new Date('2024-01-03'),
        complianceStatus: 'due',
      });

      mockStorage.getPmTemplates.mockResolvedValue(mockTemplates);
      mockStorage.getEquipment.mockResolvedValue(mockEquipment);
      mockStorage.getWorkOrders.mockResolvedValue(mockWorkOrders);

      const schedule = await pmSchedulerEnhanced.generateOptimizedSchedule('warehouse1', startDate, endDate);

      expect(schedule.statistics.utilizationRate).toBeGreaterThan(0);
      expect(schedule.statistics.utilizationRate).toBeLessThanOrEqual(100);
    });
  });
});
