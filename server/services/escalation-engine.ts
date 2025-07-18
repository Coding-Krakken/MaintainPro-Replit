import { WorkOrder, Profile, Notification, InsertNotification, EscalationRule, InsertEscalationRule, EscalationHistory, InsertEscalationHistory } from "@shared/schema";
import { storage } from "../storage";
import { db } from "../db";
import { escalationRules, escalationHistory } from "@shared/schema";
import { eq, and } from "drizzle-orm";

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
  
  private constructor() {}
  
  public static getInstance(): EscalationEngine {
    if (!EscalationEngine.instance) {
      EscalationEngine.instance = new EscalationEngine();
    }
    return EscalationEngine.instance;
  }

  /**
   * Initialize default escalation rules for a warehouse if none exist
   */
  async initializeDefaultRules(warehouseId: string): Promise<void> {
    try {
      // Check if rules already exist for this warehouse
      const existingRules = await db.select().from(escalationRules)
        .where(eq(escalationRules.warehouseId, warehouseId));
      
      if (existingRules.length > 0) {
        return; // Rules already exist
      }

      // Create default escalation rules  
      const defaultRules = [
        {
          id: crypto.randomUUID(),
          workOrderType: 'emergency' as const,
          priority: 'critical' as const,
          timeoutHours: 4,
          escalationAction: 'notify_manager' as const,
          warehouseId,
          active: true,
          createdAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          workOrderType: 'corrective' as const,
          priority: 'high' as const,
          timeoutHours: 12,
          escalationAction: 'notify_supervisor' as const,
          warehouseId,
          active: true,
          createdAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          workOrderType: 'corrective' as const,
          priority: 'medium' as const,
          timeoutHours: 24,
          escalationAction: 'notify_supervisor' as const,
          warehouseId,
          active: true,
          createdAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          workOrderType: 'preventive' as const,
          priority: 'low' as const,
          timeoutHours: 72,
          escalationAction: 'notify_supervisor' as const,
          warehouseId,
          active: true,
          createdAt: new Date(),
        }
      ];

      await db.insert(escalationRules).values(defaultRules);
      console.log(`Initialized ${defaultRules.length} default escalation rules for warehouse ${warehouseId}`);
    } catch (error) {
      console.error('Error initializing default escalation rules:', error);
    }
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
        // Initialize default rules if needed
        await this.initializeDefaultRules(warehouse.id);
        
        const workOrders = await storage.getWorkOrders(warehouse.id);
        const overdueWorkOrders = await this.findOverdueWorkOrders(workOrders, warehouse.id);
        
        for (const workOrder of overdueWorkOrders) {
          const rule = await this.getEscalationRule(workOrder.type, workOrder.priority, warehouse.id);
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
  private async findOverdueWorkOrders(workOrders: WorkOrder[], warehouseId: string): Promise<WorkOrder[]> {
    const now = new Date();
    const overdueWorkOrders: WorkOrder[] = [];
    
    for (const wo of workOrders) {
      // Only escalate work orders that are new or assigned
      if (!['new', 'assigned'].includes(wo.status)) {
        continue;
      }
      
      // Skip already escalated work orders at max level
      if (wo.escalationLevel >= 3) {
        continue;
      }
      
      // Get escalation rule for this work order
      const rule = await this.getEscalationRule(wo.type, wo.priority, warehouseId);
      if (!rule) continue;
      
      // Calculate hours since creation or last escalation
      const createdAt = new Date(wo.createdAt);
      const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      // Check if threshold has been exceeded
      if (hoursSinceCreated >= rule.timeoutHours) {
        overdueWorkOrders.push(wo);
      }
    }
    
    return overdueWorkOrders;
  }

  /**
   * Get the appropriate escalation rule for work order type, priority and warehouse
   */
  private async getEscalationRule(
    workOrderType: 'corrective' | 'preventive' | 'emergency',
    priority: 'low' | 'medium' | 'high' | 'critical',
    warehouseId: string
  ): Promise<EscalationRule | null> {
    try {
      const rules = await db.select().from(escalationRules)
        .where(and(
          eq(escalationRules.workOrderType, workOrderType),
          eq(escalationRules.priority, priority),
          eq(escalationRules.warehouseId, warehouseId),
          eq(escalationRules.active, true)
        ));
      
      return rules[0] || null;
    } catch (error) {
      console.error('Error getting escalation rule:', error);
      return null;
    }
  }

  /**
   * Escalate a specific work order
   */
  private async escalateWorkOrder(workOrder: WorkOrder, rule: EscalationRule): Promise<EscalationAction | null> {
    try {
      let escalationTarget: Profile | null = null;
      
      // Find escalation target based on rule configuration
      if (rule.escalateTo) {
        // Direct assignment to specific user
        escalationTarget = await storage.getProfile(rule.escalateTo);
        if (!escalationTarget || !escalationTarget.active) {
          console.warn(`Escalation target user ${rule.escalateTo} not found or inactive`);
          return null;
        }
      } else {
        // Find users based on escalation action
        const profiles = await storage.getProfiles();
        let targetRole: string | null = null;
        
        switch (rule.escalationAction) {
          case 'notify_supervisor':
            targetRole = 'supervisor';
            break;
          case 'notify_manager':
            targetRole = 'manager';
            break;
          default:
            console.warn(`Unsupported escalation action: ${rule.escalationAction}`);
            return null;
        }
        
        const escalationTargets = profiles.filter(profile => 
          profile.role === targetRole && 
          profile.warehouseId === workOrder.warehouseId &&
          profile.active
        );
        
        if (escalationTargets.length === 0) {
          console.warn(`No ${targetRole} found for escalation in warehouse ${workOrder.warehouseId}`);
          return null;
        }
        
        // Select the first available target (could be improved with load balancing)
        escalationTarget = escalationTargets[0];
      }
      
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
      
      // Save escalation history
      const historyRecord = {
        id: crypto.randomUUID(),
        workOrderId: workOrder.id,
        ruleId: rule.id,
        escalationLevel: newEscalationLevel,
        escalatedFrom: workOrder.assignedTo || null,
        escalatedTo: escalationTarget.id,
        action: rule.escalationAction,
        reason: `Auto-escalated after ${rule.timeoutHours} hours`,
        escalatedAt: new Date(),
      };
      
      await db.insert(escalationHistory).values(historyRecord);
      
      // Create escalation action record
      const action: EscalationAction = {
        workOrderId: workOrder.id,
        escalationLevel: newEscalationLevel,
        escalatedToUserId: escalationTarget.id,
        escalatedAt: new Date(),
        reason: `Auto-escalated after ${rule.timeoutHours} hours`,
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
      
      // Save escalation history
      const historyRecord = {
        id: crypto.randomUUID(),
        workOrderId: workOrderId,
        ruleId: null, // Manual escalation, no rule
        escalationLevel: newEscalationLevel,
        escalatedFrom: workOrder.assignedTo || null,
        escalatedTo: escalateToUserId,
        action: 'manual_escalation',
        reason: `Manual escalation by user: ${reason}`,
        escalatedAt: new Date(),
      };
      
      await db.insert(escalationHistory).values(historyRecord);
      
      return {
        workOrderId,
        escalationLevel: newEscalationLevel,
        escalatedToUserId: escalateToUserId,
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
  async getEscalationRules(warehouseId: string): Promise<EscalationRule[]> {
    try {
      await this.initializeDefaultRules(warehouseId);
      return await db.select().from(escalationRules)
        .where(eq(escalationRules.warehouseId, warehouseId));
    } catch (error) {
      console.error('Error getting escalation rules:', error);
      return [];
    }
  }

  /**
   * Update escalation rules (for configuration)
   */
  async updateEscalationRule(ruleId: string, updates: Partial<InsertEscalationRule>): Promise<void> {
    try {
      await db.update(escalationRules)
        .set(updates)
        .where(eq(escalationRules.id, ruleId));
      console.log(`Updated escalation rule ${ruleId}`);
    } catch (error) {
      console.error('Error updating escalation rule:', error);
      throw error;
    }
  }

  /**
   * Create new escalation rule
   */
  async createEscalationRule(rule: any): Promise<string> {
    try {
      const ruleId = crypto.randomUUID();
      const newRule = {
        id: ruleId,
        workOrderType: rule.workOrderType,
        priority: rule.priority,
        timeoutHours: rule.timeoutHours,
        escalationAction: rule.escalationAction,
        escalateTo: rule.escalateTo || null,
        warehouseId: rule.warehouseId || null,
        active: rule.active ?? true,
        createdAt: new Date(),
      };
      await db.insert(escalationRules).values(newRule);
      console.log(`Created new escalation rule ${ruleId}`);
      return ruleId;
    } catch (error) {
      console.error('Error creating escalation rule:', error);
      throw error;
    }
  }

  /**
   * Get escalation history for a work order
   */
  async getEscalationHistory(workOrderId: string): Promise<EscalationHistory[]> {
    try {
      return await db.select().from(escalationHistory)
        .where(eq(escalationHistory.workOrderId, workOrderId));
    } catch (error) {
      console.error('Error getting escalation history:', error);
      return [];
    }
  }
}

export const escalationEngine = EscalationEngine.getInstance();
