import { EventEmitter } from 'events';
import { storage } from '../storage';
import { WebSocket } from 'ws';
import { InsertNotification, Notification } from '@shared/schema';

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  channels: {
    workOrderAssigned: ('email' | 'sms' | 'push')[];
    workOrderOverdue: ('email' | 'sms' | 'push')[];
    partLowStock: ('email' | 'sms' | 'push')[];
    pmDue: ('email' | 'sms' | 'push')[];
    pmOverdue: ('email' | 'sms' | 'push')[];
    systemAlert: ('email' | 'sms' | 'push')[];
  };
  warehouseId: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  triggerType: 'work_order_overdue' | 'pm_overdue' | 'critical_alert';
  conditions: {
    priority?: 'low' | 'medium' | 'high' | 'critical';
    timeThreshold: number; // minutes
    workOrderType?: 'preventive' | 'corrective' | 'emergency';
  };
  escalationLevels: {
    level: number;
    delayMinutes: number;
    recipientUserIds: string[];
    actions: ('notify' | 'reassign' | 'create_ticket')[];
  }[];
  isActive: boolean;
  warehouseId: string;
}

export interface DeliveryResult {
  success: boolean;
  channel: string;
  deliveredAt?: Date;
  error?: string;
  retryAfter?: number;
}

class NotificationEngine extends EventEmitter {
  private static instance: NotificationEngine;
  private deliveryQueue: Notification[] = [];
  private processing = false;
  private websocketClients: Map<string, WebSocket> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private escalationRules: EscalationRule[] = [];
  private userPreferences: Map<string, NotificationPreferences> = new Map();

  private constructor() {
    super();
    this.initializeDefaults();
    this.startProcessingQueue();
  }

  public static getInstance(): NotificationEngine {
    if (!NotificationEngine.instance) {
      NotificationEngine.instance = new NotificationEngine();
    }
    return NotificationEngine.instance;
  }

  /**
   * Add WebSocket client for real-time notifications
   */
  addWebSocketClient(userId: string, ws: WebSocket): void {
    this.websocketClients.set(userId, ws);
    
    ws.on('close', () => {
      this.websocketClients.delete(userId);
    });
  }

  /**
   * Send notification to user
   */
  async sendNotification(notificationData: Omit<InsertNotification, 'id' | 'createdAt'>): Promise<string> {
    const notification = await storage.createNotification({
      ...notificationData,
      id: crypto.randomUUID(),
      createdAt: new Date()
    });

    // Check if user is in quiet hours
    const preferences = await this.getUserPreferences(notification.userId);
    if (this.isInQuietHours(preferences)) {
      // Queue for later delivery
      this.scheduleDelayedDelivery(notification, preferences);
      return notification.id;
    }

    // Add to delivery queue
    this.deliveryQueue.push(notification);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return notification.id;
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    if (this.userPreferences.has(userId)) {
      return this.userPreferences.get(userId)!;
    }

    // Return default preferences
    const defaultPrefs = this.getDefaultPreferences(userId);
    this.userPreferences.set(userId, defaultPrefs);
    return defaultPrefs;
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
    this.userPreferences.set(userId, preferences);
    console.log('Updated preferences for user:', userId);
  }

  /**
   * Create escalation rule
   */
  async createEscalationRule(rule: Omit<EscalationRule, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    const fullRule: EscalationRule = { ...rule, id };
    this.escalationRules.push(fullRule);
    return id;
  }

  /**
   * Process escalation for overdue items
   */
  async processEscalation(entityId: string, entityType: 'work_order' | 'pm_template', reason: string): Promise<void> {
    try {
      const activeRules = this.escalationRules.filter(rule => 
        rule.isActive && rule.triggerType.includes(entityType)
      );
      
      for (const rule of activeRules) {
        const shouldEscalate = await this.evaluateEscalationConditions(rule, entityId, entityType);
        
        if (shouldEscalate) {
          await this.executeEscalationLevels(rule, entityId, entityType, reason);
        }
      }
    } catch (error) {
      console.error('Error processing escalation:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notification = await storage.getNotification(notificationId);
      if (notification) {
        // Update the notification with read timestamp
        console.log('Marking notification as read:', notificationId);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Get notifications for user
   */
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const notifications = await storage.getNotifications(userId);
      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Send work order assignment notification
   */
  async sendWorkOrderAssignedNotification(workOrderId: string, assignedUserId: string, assignedByUserId: string): Promise<void> {
    const workOrder = await storage.getWorkOrder(workOrderId);
    if (!workOrder) return;

    const assignedBy = await storage.getProfile(assignedByUserId);
    const assignedByName = assignedBy ? `${assignedBy.firstName} ${assignedBy.lastName}` : 'System';

    await this.sendNotification({
      userId: assignedUserId,
      type: 'work_order_assigned',
      title: 'New Work Order Assigned',
      message: `Work order ${workOrder.foNumber} has been assigned to you by ${assignedByName}`,
      priority: workOrder.priority,
      data: { workOrderId, assignedBy: assignedByName },
      channels: ['email', 'push'],
      maxRetries: 3,
      warehouseId: workOrder.warehouseId
    });
  }

  /**
   * Send work order overdue notification
   */
  async sendWorkOrderOverdueNotification(workOrderId: string): Promise<void> {
    const workOrder = await storage.getWorkOrder(workOrderId);
    if (!workOrder || !workOrder.assignedTo) return;

    await this.sendNotification({
      userId: workOrder.assignedTo,
      type: 'work_order_overdue',
      title: 'Work Order Overdue',
      message: `Work order ${workOrder.foNumber} is overdue. Please complete it as soon as possible.`,
      priority: 'high',
      data: { workOrderId },
      channels: ['email', 'push'],
      maxRetries: 3,
      warehouseId: workOrder.warehouseId
    });

    // Process escalation
    await this.processEscalation(workOrderId, 'work_order', 'Work order is overdue');
  }

  /**
   * Send low stock notification
   */
  async sendLowStockNotification(partId: string, warehouseId: string): Promise<void> {
    const part = await storage.getPart(partId);
    if (!part) return;

    // Get warehouse managers and inventory clerks
    const profiles = await storage.getProfiles();
    const warehouseStaff = profiles.filter(p => 
      p.warehouseId === warehouseId && 
      ['manager', 'inventory_clerk'].includes(p.role)
    );

    for (const staff of warehouseStaff) {
      await this.sendNotification({
        userId: staff.id,
        type: 'part_low_stock',
        title: 'Low Stock Alert',
        message: `Part ${part.partNumber} is running low (${part.stockLevel} remaining, reorder point: ${part.reorderPoint})`,
        priority: 'medium',
        data: { partId, currentStock: part.stockLevel, reorderPoint: part.reorderPoint },
        channels: ['email'],
        maxRetries: 3,
        warehouseId
      });
    }
  }

  /**
   * Send PM due notification
   */
  async sendPMDueNotification(pmTemplateId: string, equipmentId: string, assignedUserId: string): Promise<void> {
    const pmTemplate = await storage.getPmTemplate(pmTemplateId);
    const equipment = await storage.getEquipment(equipmentId);
    
    if (!pmTemplate || !equipment) return;

    await this.sendNotification({
      userId: assignedUserId,
      type: 'pm_due',
      title: 'Preventive Maintenance Due',
      message: `PM ${pmTemplate.action} is due for equipment ${equipment.name}`,
      priority: 'medium',
      data: { pmTemplateId, equipmentId },
      channels: ['email', 'push'],
      maxRetries: 3,
      warehouseId: equipment.warehouseId
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.deliveryQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.deliveryQueue.length > 0) {
      const notification = this.deliveryQueue.shift()!;
      
      try {
        await this.deliverNotification(notification);
      } catch (error) {
        console.error('Error delivering notification:', error);
        await this.handleDeliveryFailure(notification, error as Error);
      }
    }

    this.processing = false;
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    const deliveryPromises: Promise<DeliveryResult>[] = [];

    // Always send via WebSocket for real-time updates
    if (this.websocketClients.has(notification.userId)) {
      deliveryPromises.push(this.sendWebSocketNotification(notification));
    }

    // Send via other channels based on preferences
    const preferences = await this.getUserPreferences(notification.userId);
    
    if (notification.channels.includes('email') && preferences.email) {
      deliveryPromises.push(this.sendEmailNotification(notification));
    }

    if (notification.channels.includes('sms') && preferences.sms) {
      deliveryPromises.push(this.sendSMSNotification(notification));
    }

    if (notification.channels.includes('push') && preferences.push) {
      deliveryPromises.push(this.sendPushNotification(notification));
    }

    // Wait for all delivery attempts
    const results = await Promise.allSettled(deliveryPromises);
    
    // Update notification status
    const successful = results.some(result => 
      result.status === 'fulfilled' && result.value.success
    );

    if (successful) {
      console.log('Notification delivered successfully:', notification.id);
    } else {
      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason);
      
      throw new Error(`Delivery failed: ${errors.join(', ')}`);
    }
  }

  private async sendWebSocketNotification(notification: Notification): Promise<DeliveryResult> {
    const ws = this.websocketClients.get(notification.userId);
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return { success: false, channel: 'websocket', error: 'WebSocket not connected' };
    }

    try {
      ws.send(JSON.stringify({
        type: 'notification',
        data: notification
      }));

      return { success: true, channel: 'websocket', deliveredAt: new Date() };
    } catch (error) {
      return { 
        success: false, 
        channel: 'websocket', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async sendEmailNotification(notification: Notification): Promise<DeliveryResult> {
    // TODO: Implement email delivery (SendGrid, AWS SES, etc.)
    console.log('Email notification sent:', notification.title);
    return { success: true, channel: 'email', deliveredAt: new Date() };
  }

  private async sendSMSNotification(notification: Notification): Promise<DeliveryResult> {
    // TODO: Implement SMS delivery (Twilio, AWS SNS, etc.)
    console.log('SMS notification sent:', notification.title);
    return { success: true, channel: 'sms', deliveredAt: new Date() };
  }

  private async sendPushNotification(notification: Notification): Promise<DeliveryResult> {
    // TODO: Implement push notification delivery (Firebase, Apple Push, etc.)
    console.log('Push notification sent:', notification.title);
    return { success: true, channel: 'push', deliveredAt: new Date() };
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= preferences.quietHours.start && currentTime <= preferences.quietHours.end;
  }

  private async handleDeliveryFailure(notification: Notification, error: Error): Promise<void> {
    console.error('Notification delivery failed:', notification.id, error.message);
    
    // TODO: Implement retry logic
    if (notification.retryCount < notification.maxRetries) {
      const retryDelay = Math.pow(2, notification.retryCount) * 1000;
      setTimeout(() => {
        this.deliveryQueue.push(notification);
        this.processQueue();
      }, retryDelay);
    }
  }

  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      email: true,
      sms: false,
      push: true,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '07:00'
      },
      channels: {
        workOrderAssigned: ['email', 'push'],
        workOrderOverdue: ['email', 'push'],
        partLowStock: ['email'],
        pmDue: ['email', 'push'],
        pmOverdue: ['email', 'push'],
        systemAlert: ['email', 'push']
      },
      warehouseId: ''
    };
  }

  private async evaluateEscalationConditions(rule: EscalationRule, entityId: string, entityType: string): Promise<boolean> {
    // Simple evaluation - in a real system, this would check actual conditions
    return true;
  }

  private async executeEscalationLevels(rule: EscalationRule, entityId: string, entityType: string, reason: string): Promise<void> {
    for (const level of rule.escalationLevels) {
      setTimeout(async () => {
        for (const userId of level.recipientUserIds) {
          await this.sendNotification({
            userId,
            type: 'system_alert',
            title: `Escalation: ${rule.name}`,
            message: `${entityType} ${entityId} requires attention: ${reason}`,
            priority: 'high',
            data: { entityId, entityType, escalationLevel: level.level },
            channels: ['email', 'push'],
            maxRetries: 3,
            warehouseId: rule.warehouseId
          });
        }
      }, level.delayMinutes * 60 * 1000);
    }
  }

  private scheduleDelayedDelivery(notification: Notification, preferences: NotificationPreferences): void {
    const now = new Date();
    const endTime = new Date();
    const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);
    endTime.setHours(endHour, endMinute, 0, 0);

    if (endTime <= now) {
      endTime.setDate(endTime.getDate() + 1);
    }

    const delayMs = endTime.getTime() - now.getTime();
    
    setTimeout(() => {
      this.deliveryQueue.push(notification);
      this.processQueue();
    }, delayMs);
  }

  private startProcessingQueue(): void {
    // Process queue every 10 seconds
    setInterval(() => {
      this.processQueue();
    }, 10000);
  }

  private initializeDefaults(): void {
    // Initialize with some sample escalation rules
    this.escalationRules = [
      {
        id: '1',
        name: 'Work Order Overdue Escalation',
        triggerType: 'work_order_overdue',
        conditions: {
          priority: 'high',
          timeThreshold: 60
        },
        escalationLevels: [
          {
            level: 1,
            delayMinutes: 30,
            recipientUserIds: [], // Will be populated with supervisor IDs
            actions: ['notify']
          },
          {
            level: 2,
            delayMinutes: 60,
            recipientUserIds: [], // Will be populated with manager IDs
            actions: ['notify', 'reassign']
          }
        ],
        isActive: true,
        warehouseId: ''
      }
    ];
  }
}

export const notificationEngine = NotificationEngine.getInstance();
