import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notificationEngine } from '../../server/services/notification-engine';
import { storage } from '../../server/storage';
import { createMockUser, createMockWorkOrder, createMockNotification } from '../utils/test-utils-simple';

// Mock storage
vi.mock('../../server/storage', () => ({
  storage: {
    createNotification: vi.fn(),
    getNotification: vi.fn(),
    getNotifications: vi.fn(),
    getProfile: vi.fn(),
    getWorkOrder: vi.fn(),
    getProfiles: vi.fn(),
  },
}));

// Mock WebSocket
vi.mock('ws', () => ({
  WebSocket: vi.fn().mockImplementation(() => ({
    readyState: 1, // OPEN
    send: vi.fn(),
    on: vi.fn(),
  })),
}));

describe('NotificationEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should create and queue a notification', async () => {
      const mockNotification = createMockNotification();
      const mockUser = createMockUser();
      
      (storage.createNotification as any).mockResolvedValue(mockNotification);
      (storage.getProfile as any).mockResolvedValue(mockUser);

      const result = await notificationEngine.sendNotification({
        userId: mockUser.id,
        type: 'work_order_assigned',
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium',
        data: { test: 'data' },
        channels: ['email', 'push'],
        maxRetries: 3,
        warehouseId: 'wh-123',
      });

      expect(result).toBe(mockNotification.id);
      expect(storage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          type: 'work_order_assigned',
          title: 'Test Notification',
          message: 'This is a test notification',
          priority: 'medium',
        })
      );
    });

    it('should handle quiet hours', async () => {
      const mockNotification = createMockNotification();
      const mockUser = createMockUser();
      
      (storage.createNotification as any).mockResolvedValue(mockNotification);
      (storage.getProfile as any).mockResolvedValue(mockUser);

      // Mock time to be within quiet hours
      const mockDate = new Date('2024-01-01T23:00:00');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const result = await notificationEngine.sendNotification({
        userId: mockUser.id,
        type: 'work_order_assigned',
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium',
        data: { test: 'data' },
        channels: ['email', 'push'],
        maxRetries: 3,
        warehouseId: 'wh-123',
      });

      expect(result).toBe(mockNotification.id);
      
      vi.restoreAllMocks();
    });
  });

  describe('sendWorkOrderAssignedNotification', () => {
    it('should send work order assignment notification', async () => {
      const mockWorkOrder = createMockWorkOrder();
      const mockUser = createMockUser();
      const mockNotification = createMockNotification();
      
      (storage.getWorkOrder as any).mockResolvedValue(mockWorkOrder);
      (storage.getProfile as any).mockResolvedValue(mockUser);
      (storage.createNotification as any).mockResolvedValue(mockNotification);

      await notificationEngine.sendWorkOrderAssignedNotification(
        mockWorkOrder.id,
        mockUser.id,
        'assignedBy-123'
      );

      expect(storage.getWorkOrder).toHaveBeenCalledWith(mockWorkOrder.id);
      expect(storage.getProfile).toHaveBeenCalledWith('assignedBy-123');
      expect(storage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          type: 'work_order_assigned',
          title: 'New Work Order Assigned',
          priority: mockWorkOrder.priority,
        })
      );
    });

    it('should handle missing work order', async () => {
      (storage.getWorkOrder as any).mockResolvedValue(null);

      await notificationEngine.sendWorkOrderAssignedNotification(
        'non-existent-id',
        'user-123',
        'assignedBy-123'
      );

      expect(storage.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('sendWorkOrderOverdueNotification', () => {
    it('should send overdue notification and process escalation', async () => {
      const mockWorkOrder = createMockWorkOrder({
        assignedTo: 'user-123',
        priority: 'high',
      });
      const mockNotification = createMockNotification();
      
      (storage.getWorkOrder as any).mockResolvedValue(mockWorkOrder);
      (storage.createNotification as any).mockResolvedValue(mockNotification);

      await notificationEngine.sendWorkOrderOverdueNotification(mockWorkOrder.id);

      expect(storage.getWorkOrder).toHaveBeenCalledWith(mockWorkOrder.id);
      expect(storage.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockWorkOrder.assignedTo,
          type: 'work_order_overdue',
          title: 'Work Order Overdue',
          priority: 'high',
        })
      );
    });

    it('should handle work order without assigned user', async () => {
      const mockWorkOrder = createMockWorkOrder({ assignedTo: null });
      
      (storage.getWorkOrder as any).mockResolvedValue(mockWorkOrder);

      await notificationEngine.sendWorkOrderOverdueNotification(mockWorkOrder.id);

      expect(storage.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('getUserPreferences', () => {
    it('should return default preferences for new user', async () => {
      const userId = 'user-123';
      
      const preferences = await notificationEngine.getUserPreferences(userId);

      expect(preferences).toEqual(
        expect.objectContaining({
          userId,
          email: true,
          sms: false,
          push: true,
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '07:00',
          },
          channels: expect.objectContaining({
            workOrderAssigned: ['email', 'push'],
            workOrderOverdue: ['email', 'push'],
          }),
        })
      );
    });

    it('should return cached preferences for existing user', async () => {
      const userId = 'user-123';
      const customPreferences = {
        userId,
        email: false,
        sms: true,
        push: false,
        quietHours: { enabled: false, start: '22:00', end: '07:00' },
        channels: {
          workOrderAssigned: ['sms' as const],
          workOrderOverdue: ['sms' as const],
          partLowStock: ['email' as const],
          pmDue: ['email' as const],
          pmOverdue: ['email' as const],
          systemAlert: ['email' as const],
        },
        warehouseId: 'wh-123',
      };

      // Set preferences first
      await notificationEngine.updateUserPreferences(userId, customPreferences);

      // Then get preferences
      const preferences = await notificationEngine.getUserPreferences(userId);

      expect(preferences).toEqual(customPreferences);
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      const userId = 'user-123';
      const newPreferences = {
        userId,
        email: false,
        sms: true,
        push: false,
        quietHours: { enabled: false, start: '22:00', end: '07:00' },
        channels: {
          workOrderAssigned: ['sms' as const],
          workOrderOverdue: ['sms' as const],
          partLowStock: ['email' as const],
          pmDue: ['email' as const],
          pmOverdue: ['email' as const],
          systemAlert: ['email' as const],
        },
        warehouseId: 'wh-123',
      };

      await notificationEngine.updateUserPreferences(userId, newPreferences);

      const preferences = await notificationEngine.getUserPreferences(userId);
      expect(preferences).toEqual(newPreferences);
    });
  });

  describe('createEscalationRule', () => {
    it('should create escalation rule', async () => {
      const rule = {
        name: 'Test Escalation',
        triggerType: 'work_order_overdue' as const,
        conditions: {
          priority: 'high' as const,
          timeThreshold: 60,
        },
        escalationLevels: [
          {
            level: 1,
            delayMinutes: 30,
            recipientUserIds: ['user-456'],
            actions: ['notify' as const],
          },
        ],
        isActive: true,
        warehouseId: 'wh-123',
      };

      const ruleId = await notificationEngine.createEscalationRule(rule);

      expect(ruleId).toBeDefined();
      expect(typeof ruleId).toBe('string');
    });
  });

  describe('getNotifications', () => {
    it('should return user notifications', async () => {
      const userId = 'user-123';
      const mockNotifications = [
        createMockNotification({ userId }),
        createMockNotification({ userId, type: 'work_order_overdue' }),
      ];

      (storage.getNotifications as any).mockResolvedValue(mockNotifications);

      const notifications = await notificationEngine.getNotifications(userId);

      expect(storage.getNotifications).toHaveBeenCalledWith(userId);
      expect(notifications).toEqual(mockNotifications);
    });

    it('should handle storage errors', async () => {
      const userId = 'user-123';
      
      (storage.getNotifications as any).mockRejectedValue(new Error('Storage error'));

      const notifications = await notificationEngine.getNotifications(userId);

      expect(notifications).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'notif-123';
      const mockNotification = createMockNotification({ id: notificationId });

      (storage.getNotification as any).mockResolvedValue(mockNotification);

      await notificationEngine.markAsRead(notificationId);

      expect(storage.getNotification).toHaveBeenCalledWith(notificationId);
    });

    it('should handle missing notification', async () => {
      const notificationId = 'non-existent';

      (storage.getNotification as any).mockResolvedValue(null);

      await notificationEngine.markAsRead(notificationId);

      expect(storage.getNotification).toHaveBeenCalledWith(notificationId);
    });
  });
});
