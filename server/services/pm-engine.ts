import { PmTemplate, Equipment, WorkOrder, InsertWorkOrder, WorkOrderChecklistItem } from "@shared/schema";
import { storage } from "../storage";

export interface PMSchedule {
  equipmentId: string;
  templateId: string;
  nextDueDate: Date;
  lastCompletedDate?: Date;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  isOverdue: boolean;
  complianceStatus: 'compliant' | 'due' | 'overdue';
}

export interface ComplianceStatus {
  equipmentId: string;
  compliancePercentage: number;
  missedPMCount: number;
  totalPMCount: number;
  lastPMDate?: Date;
  nextPMDate?: Date;
}

export class PMEngine {
  private static instance: PMEngine;
  
  private constructor() {}
  
  public static getInstance(): PMEngine {
    if (!PMEngine.instance) {
      PMEngine.instance = new PMEngine();
    }
    return PMEngine.instance;
  }

  /**
   * Calculate next due date based on frequency and last completion
   */
  private calculateNextDueDate(frequency: string, lastCompletedDate?: Date): Date {
    const baseDate = lastCompletedDate || new Date();
    const nextDate = new Date(baseDate);
    
    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'annually':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1); // Default to monthly
    }
    
    return nextDate;
  }

  /**
   * Generate PM work orders for due equipment
   */
  public async generatePMWorkOrders(warehouseId: string): Promise<WorkOrder[]> {
    try {
      const templates = await storage.getPmTemplates(warehouseId);
      const equipment = await storage.getEquipment(warehouseId);
      const existingWorkOrders = await storage.getWorkOrders(warehouseId);
      
      const generatedWorkOrders: WorkOrder[] = [];
      
      for (const template of templates) {
        // Find equipment matching this template's model
        const matchingEquipment = equipment.filter(eq => 
          eq.model === template.model && 
          eq.status === 'active'
        );
        
        for (const equip of matchingEquipment) {
          const schedule = await this.getPMSchedule(equip.id, template.id);
          
          // Check if PM is due and no existing PM work order exists
          if (schedule.complianceStatus === 'due' || schedule.complianceStatus === 'overdue') {
            const hasExistingPM = existingWorkOrders.some(wo => 
              wo.type === 'preventive' && 
              wo.equipmentId === equip.id &&
              wo.status !== 'completed' &&
              wo.status !== 'closed'
            );
            
            if (!hasExistingPM) {
              const workOrder = await this.createPMWorkOrder(equip, template, warehouseId);
              generatedWorkOrders.push(workOrder);
            }
          }
        }
      }
      
      return generatedWorkOrders;
    } catch (error) {
      console.error('Error generating PM work orders:', error);
      throw error;
    }
  }

  /**
   * Create a PM work order for specific equipment and template
   */
  private async createPMWorkOrder(equipment: Equipment, template: PmTemplate, warehouseId: string): Promise<WorkOrder> {
    const foNumber = `PM-${Date.now()}-${equipment.assetTag}`;
    
    const workOrderData: InsertWorkOrder = {
      foNumber,
      type: 'preventive',
      description: `Preventive Maintenance: ${template.component} - ${template.action}`,
      area: equipment.area || '',
      assetModel: equipment.model,
      status: 'new',
      priority: 'medium',
      requestedBy: 'system-pm-engine', // System-generated
      equipmentId: equipment.id,
      dueDate: this.calculateNextDueDate(template.frequency),
      estimatedHours: '2.00', // Default estimate
      warehouseId,
      notes: `Auto-generated PM based on ${template.frequency} maintenance schedule`,
    };
    
    const workOrder = await storage.createWorkOrder(workOrderData);
    
    // Create checklist items from template
    await this.createPMChecklistItems(workOrder.id, template);
    
    // Create notification for PM due
    await this.createPMNotification(workOrder);
    
    return workOrder;
  }

  /**
   * Create checklist items for PM work order
   */
  private async createPMChecklistItems(workOrderId: string, template: PmTemplate): Promise<void> {
    const checklistItem = {
      workOrderId,
      component: template.component,
      action: template.action,
      status: 'pending' as const,
      notes: '',
      sortOrder: 0,
    };
    
    await storage.createWorkOrderChecklistItem(checklistItem);
  }

  /**
   * Create notification for PM due
   */
  private async createPMNotification(workOrder: WorkOrder): Promise<void> {
    // Find supervisors and managers in the warehouse
    const profiles = await storage.getProfiles();
    const supervisors = profiles.filter(p => 
      p.warehouseId === workOrder.warehouseId &&
      (p.role === 'supervisor' || p.role === 'manager')
    );
    
    for (const supervisor of supervisors) {
      await storage.createNotification({
        userId: supervisor.id,
        type: 'pm_due',
        title: 'Preventive Maintenance Due',
        message: `PM work order ${workOrder.foNumber} has been created for ${workOrder.assetModel}`,
        workOrderId: workOrder.id,
        equipmentId: workOrder.equipmentId,
      });
    }
  }

  /**
   * Get PM schedule for specific equipment and template
   */
  public async getPMSchedule(equipmentId: string, templateId: string): Promise<PMSchedule> {
    const template = await storage.getPmTemplate(templateId);
    if (!template) {
      throw new Error(`PM template ${templateId} not found`);
    }
    
    // Get completed PM work orders for this equipment
    const workOrders = await storage.getWorkOrders(template.warehouseId);
    const completedPMOrders = workOrders.filter(wo => 
      wo.type === 'preventive' &&
      wo.equipmentId === equipmentId &&
      wo.status === 'completed'
    ).sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());
    
    const lastCompletedDate = completedPMOrders.length > 0 
      ? new Date(completedPMOrders[0].completedAt || completedPMOrders[0].createdAt)
      : undefined;
    
    const nextDueDate = this.calculateNextDueDate(template.frequency, lastCompletedDate);
    const now = new Date();
    
    const isOverdue = nextDueDate < now;
    const isDue = nextDueDate <= new Date(now.getTime() + 24 * 60 * 60 * 1000); // Due within 24 hours
    
    let complianceStatus: 'compliant' | 'due' | 'overdue' = 'compliant';
    if (isOverdue) {
      complianceStatus = 'overdue';
    } else if (isDue) {
      complianceStatus = 'due';
    }
    
    return {
      equipmentId,
      templateId,
      nextDueDate,
      lastCompletedDate,
      frequency: template.frequency,
      isOverdue,
      complianceStatus,
    };
  }

  /**
   * Check compliance status for equipment
   */
  public async checkComplianceStatus(equipmentId: string, warehouseId: string): Promise<ComplianceStatus> {
    const templates = await storage.getPmTemplates(warehouseId);
    const equipment = await storage.getEquipment(warehouseId);
    const targetEquipment = equipment.find(e => e.id === equipmentId);
    
    if (!targetEquipment) {
      throw new Error(`Equipment ${equipmentId} not found`);
    }
    
    // Get relevant templates for this equipment model
    const relevantTemplates = templates.filter(t => t.model === targetEquipment.model);
    
    if (relevantTemplates.length === 0) {
      return {
        equipmentId,
        compliancePercentage: 100,
        missedPMCount: 0,
        totalPMCount: 0,
      };
    }
    
    let missedPMCount = 0;
    let totalPMCount = relevantTemplates.length;
    let lastPMDate: Date | undefined;
    let nextPMDate: Date | undefined;
    
    for (const template of relevantTemplates) {
      const schedule = await this.getPMSchedule(equipmentId, template.id);
      
      if (schedule.complianceStatus === 'overdue') {
        missedPMCount++;
      }
      
      if (schedule.lastCompletedDate && (!lastPMDate || schedule.lastCompletedDate > lastPMDate)) {
        lastPMDate = schedule.lastCompletedDate;
      }
      
      if (!nextPMDate || schedule.nextDueDate < nextPMDate) {
        nextPMDate = schedule.nextDueDate;
      }
    }
    
    const compliancePercentage = totalPMCount > 0 
      ? Math.round(((totalPMCount - missedPMCount) / totalPMCount) * 100)
      : 100;
    
    return {
      equipmentId,
      compliancePercentage,
      missedPMCount,
      totalPMCount,
      lastPMDate,
      nextPMDate,
    };
  }

  /**
   * Update PM schedule when work order is completed
   */
  public async updatePMSchedule(workOrderId: string): Promise<void> {
    const workOrder = await storage.getWorkOrder(workOrderId);
    if (!workOrder || workOrder.type !== 'preventive') {
      return;
    }
    
    // The schedule is automatically updated when we query for next due date
    // since we look at the most recent completed PM work order
    console.log(`PM schedule updated for work order ${workOrderId}`);
  }

  /**
   * Run PM automation process (called by scheduled job)
   */
  public async runPMAutomation(warehouseId: string): Promise<{ generated: number; errors: string[] }> {
    try {
      const generatedWorkOrders = await this.generatePMWorkOrders(warehouseId);
      
      console.log(`Generated ${generatedWorkOrders.length} PM work orders for warehouse ${warehouseId}`);
      
      return {
        generated: generatedWorkOrders.length,
        errors: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('PM automation error:', errorMessage);
      
      return {
        generated: 0,
        errors: [errorMessage],
      };
    }
  }
}

export const pmEngine = PMEngine.getInstance();
