import { WorkOrder, Profile, Notification, InsertNotification } from "@shared/schema";
import { storage } from "../storage";

export interface EscalationRule {
  id: string;
  name: string;
  priority: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  timeThresholdHours: number;
  escalateToRole: 'supervisor' | 'manager' | 'admin';
  notificationChannels: ('email' | 'push' | 'sms')[];
  active: boolean;
  warehouseId: string;
}

export interface EscalationAction {
  workOrderId: string;
  escalationLevel: number;
  escalatedToUserId: string;
  escalatedAt: Date;
  reason: string;
  previousAssignee?: string;
}

export class EscalationEngine {
  private static instance: EscalationEngine;
  
  // Default escalation rules - can be made configurable later
  private defaultRules: EscalationRule[] = [
    {
      id: 'emergency-4h',
      name: 'Emergency Work Orders',
      priority: 'critical',
      timeThresholdHours: 4,
      escalateToRole: 'manager',
      notificationChannels: ['email', 'push'],
      active: true,
      warehouseId: 'default' // Will be replaced with actual warehouse IDs
    },
    {
      id: 'high-12h',
      name: 'High Priority Work Orders',
      priority: 'high',
      timeThresholdHours: 12,
      escalateToRole: 'supervisor',
      notificationChannels: ['email', 'push'],
      active: true,
      warehouseId: 'default'
    },
    {
      id: 'standard-24h',
      name: 'Standard Work Orders',
      priority: 'medium',
      timeThresholdHours: 24,
      escalateToRole: 'supervisor',
      notificationChannels: ['email'],
      active: true,
      warehouseId: 'default'
    },
    {
      id: 'low-72h',
      name: 'Low Priority Work Orders',
      priority: 'low',
      timeThresholdHours: 72,
      escalateToRole: 'supervisor',
      notificationChannels: ['email'],
      active: true,
      warehouseId: 'default'
    }
  ];
  
  private constructor() {}
  
  public static getInstance(): EscalationEngine {
    if (!EscalationEngine.instance) {
      EscalationEngine.instance = new EscalationEngine();
    }
    return EscalationEngine.instance;
  }

  /**
   * Check all work orders for escalation conditions
   */
  async checkForEscalations(): Promise<EscalationAction[]> {
    const actions: EscalationAction[] = [];
    
    try {
      // Get all warehouses to process each one
      const warehouses = await storage.getWarehouses();
      
      for (const warehouse of warehouses) {
        const workOrders = await storage.getWorkOrders(warehouse.id);
        const overdueWorkOrders = this.findOverdueWorkOrders(workOrders);
        
        for (const workOrder of overdueWorkOrders) {
          const rule = this.getEscalationRule(workOrder.priority, warehouse.id);
          if (!rule) continue;
          
          const action = await this.escalateWorkOrder(workOrder, rule);
          if (action) {
            actions.push(action);
          }
        }
      }
      
      return actions;
    } catch (error) {
      console.error('Error checking for escalations:', error);
      return [];
    }
  }

  /**
   * Find work orders that are overdue for escalation
   */
  private findOverdueWorkOrders(workOrders: WorkOrder[]): WorkOrder[] {
    const now = new Date();
    
    return workOrders.filter(wo => {
      // Only escalate work orders that are new or assigned
      if (!['new', 'assigned'].includes(wo.status)) {
        return false;
      }
      
      // Skip already escalated work orders at max level
      if (wo.escalationLevel >= 3) {
        return false;
      }
      
      // Calculate hours since creation or last escalation
      const createdAt = new Date(wo.createdAt);
      const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      const rule = this.getEscalationRule(wo.priority, wo.warehouseId);
      if (!rule) return false;
      
      // Check if threshold has been exceeded
      return hoursSinceCreated >= rule.timeThresholdHours;
    });
  }

  /**
   * Get the appropriate escalation rule for priority and warehouse
   */
  private getEscalationRule(priority: string, warehouseId: string): EscalationRule | null {
    // For now, use default rules (later this can be warehouse-specific)
    return this.defaultRules.find(rule => 
      rule.priority === priority && rule.active
    ) || null;
  }

  /**
   * Escalate a specific work order
   */
  private async escalateWorkOrder(workOrder: WorkOrder, rule: EscalationRule): Promise<EscalationAction | null> {
    try {
      // Find users with the target role in the same warehouse
      const profiles = await storage.getProfiles();
      const escalationTargets = profiles.filter(profile => 
        profile.role === rule.escalateToRole && 
        profile.warehouseId === workOrder.warehouseId &&
        profile.active
      );
      
      if (escalationTargets.length === 0) {
        console.warn(`No ${rule.escalateToRole} found for escalation in warehouse ${workOrder.warehouseId}`);
        return null;
      }
      
      // Select the first available target (could be improved with load balancing)
      const escalationTarget = escalationTargets[0];
      
      // Update work order
      const newEscalationLevel = (workOrder.escalationLevel || 0) + 1;
      await storage.updateWorkOrder(workOrder.id, {
        escalated: true,
        escalationLevel: newEscalationLevel,
        assignedTo: escalationTarget.id,
        updatedAt: new Date(),
      });
      
      // Create notification
      await this.createEscalationNotification(workOrder, escalationTarget, rule, newEscalationLevel);
      
      // Create escalation action record
      const action: EscalationAction = {
        workOrderId: workOrder.id,
        escalationLevel: newEscalationLevel,
        escalatedToUserId: escalationTarget.id,
        escalatedAt: new Date(),
        reason: `Auto-escalated after ${rule.timeThresholdHours} hours (${rule.name})`,
        previousAssignee: workOrder.assignedTo || undefined,
      };
      
      console.log(`Escalated work order ${workOrder.foNumber} to ${escalationTarget.firstName} ${escalationTarget.lastName} (Level ${newEscalationLevel})`);
      
      return action;
    } catch (error) {
      console.error(`Error escalating work order ${workOrder.id}:`, error);
      return null;
    }
  }

  /**
   * Create notification for escalation
   */
  private async createEscalationNotification(
    workOrder: WorkOrder, 
    escalationTarget: Profile, 
    rule: EscalationRule, 
    escalationLevel: number
  ): Promise<void> {
    const notification: InsertNotification = {
      userId: escalationTarget.id,
      type: 'wo_assigned',
      title: `Work Order Escalated - Level ${escalationLevel}`,
      message: `Work Order ${workOrder.foNumber} has been escalated to you. Priority: ${workOrder.priority.toUpperCase()}. Description: ${workOrder.description}`,
      read: false,
      workOrderId: workOrder.id,
      createdAt: new Date(),
    };
    
    await storage.createNotification(notification);
  }

  /**
   * Get escalation statistics for dashboard
   */
  async getEscalationStats(warehouseId: string): Promise<{
    totalEscalated: number;
    escalatedToday: number;
    byLevel: Record<number, number>;
    byPriority: Record<string, number>;
  }> {
    try {
      const workOrders = await storage.getWorkOrders(warehouseId);
      const escalated = workOrders.filter(wo => wo.escalated);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const escalatedToday = escalated.filter(wo => {
        const updatedAt = new Date(wo.updatedAt);
        return updatedAt >= today;
      });
      
      const byLevel: Record<number, number> = {};
      const byPriority: Record<string, number> = {};
      
      escalated.forEach(wo => {
        const level = wo.escalationLevel || 1;
        byLevel[level] = (byLevel[level] || 0) + 1;
        byPriority[wo.priority] = (byPriority[wo.priority] || 0) + 1;
      });
      
      return {
        totalEscalated: escalated.length,
        escalatedToday: escalatedToday.length,
        byLevel,
        byPriority,
      };
    } catch (error) {
      console.error('Error getting escalation stats:', error);
      return {
        totalEscalated: 0,
        escalatedToday: 0,
        byLevel: {},
        byPriority: {},
      };
    }
  }

  /**
   * Manual escalation (for supervisors/managers)
   */
  async manuallyEscalateWorkOrder(
    workOrderId: string, 
    escalateToUserId: string, 
    reason: string,
    escalatedByUserId: string
  ): Promise<EscalationAction | null> {
    try {
      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        throw new Error('Work order not found');
      }
      
      const escalationTarget = await storage.getProfile(escalateToUserId);
      if (!escalationTarget) {
        throw new Error('Escalation target user not found');
      }
      
      const newEscalationLevel = (workOrder.escalationLevel || 0) + 1;
      
      // Update work order
      await storage.updateWorkOrder(workOrderId, {
        escalated: true,
        escalationLevel: newEscalationLevel,
        assignedTo: escalateToUserId,
        updatedAt: new Date(),
      });
      
      // Create notification
      const notification: InsertNotification = {
        userId: escalateToUserId,
        type: 'wo_assigned',
        title: `Work Order Manually Escalated`,
        message: `Work Order ${workOrder.foNumber} has been manually escalated to you. Reason: ${reason}`,
        read: false,
        workOrderId: workOrderId,
        createdAt: new Date(),
      };
      
      await storage.createNotification(notification);
      
      return {
        workOrderId,
        escalationLevel: newEscalationLevel,
        escalatedToUserId,
        escalatedAt: new Date(),
        reason: `Manual escalation: ${reason}`,
        previousAssignee: workOrder.assignedTo || undefined,
      };
    } catch (error) {
      console.error('Error manually escalating work order:', error);
      return null;
    }
  }

  /**
   * Get escalation rules for a warehouse (for configuration UI)
   */
  getEscalationRules(warehouseId: string): EscalationRule[] {
    // For now return default rules, later this can be warehouse-specific
    return this.defaultRules.map(rule => ({
      ...rule,
      warehouseId
    }));
  }

  /**
   * Update escalation rules (for configuration)
   */
  async updateEscalationRules(warehouseId: string, rules: EscalationRule[]): Promise<void> {
    // For now, this is a placeholder
    // In a real implementation, this would save to database
    console.log(`Updated escalation rules for warehouse ${warehouseId}:`, rules);
  }
}

export const escalationEngine = EscalationEngine.getInstance();
