import { pmEngine } from './pm-engine';
import { storage } from '../storage';

export interface PMSchedulingRule {
  id: string;
  name: string;
  warehouseId: string;
  equipmentModels: string[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'custom';
  customFrequencyDays?: number;
  conditions: {
    operatingHours?: number;
    cycleCount?: number;
    lastMaintenanceDate?: Date;
    criticalityLevel?: 'low' | 'medium' | 'high' | 'critical';
  };
  triggerType: 'time_based' | 'usage_based' | 'condition_based';
  autoGenerate: boolean;
  leadTimeDays: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTechnicians: string[];
  requiredParts: string[];
  estimatedDuration: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PMSchedulingConfig {
  warehouseId: string;
  globalSettings: {
    autoSchedulingEnabled: boolean;
    defaultLeadTime: number;
    workingDays: number[];
    workingHours: { start: string; end: string };
    maxConcurrentPMs: number;
    priorityWeights: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  escalationRules: {
    overduePMHours: number;
    missedPMHours: number;
    escalationLevels: {
      level: number;
      delayHours: number;
      recipients: string[];
      actions: ('notify' | 'reassign' | 'escalate')[];
    }[];
  };
  complianceTargets: {
    overallComplianceRate: number;
    criticalEquipmentRate: number;
    maxOverdueDays: number;
  };
}

export interface PMSchedulingResult {
  scheduledPMs: {
    workOrderId: string;
    equipmentId: string;
    templateId: string;
    scheduledDate: Date;
    priority: string;
    estimatedDuration: number;
  }[];
  conflicts: {
    equipmentId: string;
    conflictType: 'technician_unavailable' | 'parts_unavailable' | 'equipment_occupied';
    message: string;
    resolution: string;
  }[];
  statistics: {
    totalScheduled: number;
    byPriority: Record<string, number>;
    byModel: Record<string, number>;
    utilizationRate: number;
  };
}

class PMSchedulerEnhanced {
  private static instance: PMSchedulerEnhanced;
  private schedulingRules: Map<string, PMSchedulingRule[]> = new Map();
  private schedulingConfigs: Map<string, PMSchedulingConfig> = new Map();
  private isRunning = false;
  private schedulingInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): PMSchedulerEnhanced {
    if (!PMSchedulerEnhanced.instance) {
      PMSchedulerEnhanced.instance = new PMSchedulerEnhanced();
    }
    return PMSchedulerEnhanced.instance;
  }

  /**
   * Load scheduling rules for a warehouse
   */
  public async loadSchedulingRules(warehouseId: string): Promise<PMSchedulingRule[]> {
    try {
      // In a real implementation, this would come from database
      // For now, we'll create default rules based on PM templates
      const templates = await storage.getPmTemplates(warehouseId);
      const rules: PMSchedulingRule[] = [];

      for (const template of templates) {
        const rule: PMSchedulingRule = {
          id: `rule_${template.id}`,
          name: `${template.model} - ${template.component}`,
          warehouseId,
          equipmentModels: [template.model],
          frequency: template.frequency,
          conditions: {},
          triggerType: 'time_based',
          autoGenerate: true,
          leadTimeDays: 1,
          priority: 'medium',
          assignedTechnicians: [],
          requiredParts: [],
          estimatedDuration: 2,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        rules.push(rule);
      }

      this.schedulingRules.set(warehouseId, rules);
      return rules;
    } catch (error) {
      console.error('Error loading scheduling rules:', error);
      throw error;
    }
  }

  /**
   * Load scheduling configuration for a warehouse
   */
  public async loadSchedulingConfig(warehouseId: string): Promise<PMSchedulingConfig> {
    try {
      // Default configuration
      const config: PMSchedulingConfig = {
        warehouseId,
        globalSettings: {
          autoSchedulingEnabled: true,
          defaultLeadTime: 2,
          workingDays: [1, 2, 3, 4, 5], // Monday to Friday
          workingHours: { start: '08:00', end: '17:00' },
          maxConcurrentPMs: 10,
          priorityWeights: {
            critical: 4,
            high: 3,
            medium: 2,
            low: 1,
          },
        },
        escalationRules: {
          overduePMHours: 24,
          missedPMHours: 48,
          escalationLevels: [
            {
              level: 1,
              delayHours: 4,
              recipients: ['supervisor'],
              actions: ['notify'],
            },
            {
              level: 2,
              delayHours: 8,
              recipients: ['manager'],
              actions: ['notify', 'reassign'],
            },
            {
              level: 3,
              delayHours: 24,
              recipients: ['director'],
              actions: ['escalate'],
            },
          ],
        },
        complianceTargets: {
          overallComplianceRate: 95,
          criticalEquipmentRate: 100,
          maxOverdueDays: 3,
        },
      };

      this.schedulingConfigs.set(warehouseId, config);
      return config;
    } catch (error) {
      console.error('Error loading scheduling config:', error);
      throw error;
    }
  }

  /**
   * Generate optimized PM schedule for a warehouse
   */
  public async generateOptimizedSchedule(warehouseId: string, startDate: Date, endDate: Date): Promise<PMSchedulingResult> {
    try {
      const rules = await this.loadSchedulingRules(warehouseId);
      const config = await this.loadSchedulingConfig(warehouseId);
      const equipment = await storage.getEquipment(warehouseId);
      const existingWorkOrders = await storage.getWorkOrders(warehouseId);

      const result: PMSchedulingResult = {
        scheduledPMs: [],
        conflicts: [],
        statistics: {
          totalScheduled: 0,
          byPriority: {},
          byModel: {},
          utilizationRate: 0,
        },
      };

      // Process each active rule
      for (const rule of rules.filter(r => r.isActive)) {
        const relevantEquipment = equipment.filter(eq => 
          rule.equipmentModels.includes(eq.model) && 
          eq.status === 'active'
        );

        for (const equip of relevantEquipment) {
          const schedule = await pmEngine.getPMSchedule(equip.id, rule.id);
          
          // Check if PM is due within the scheduling window
          if (schedule.nextDueDate >= startDate && schedule.nextDueDate <= endDate) {
            // Check for conflicts
            const conflicts = await this.checkSchedulingConflicts(equip.id, schedule.nextDueDate, rule, existingWorkOrders);
            
            if (conflicts.length === 0) {
              // Create optimized schedule entry
              const scheduledPM = {
                workOrderId: `pending_${equip.id}_${rule.id}`,
                equipmentId: equip.id,
                templateId: rule.id,
                scheduledDate: schedule.nextDueDate,
                priority: rule.priority,
                estimatedDuration: rule.estimatedDuration,
              };

              result.scheduledPMs.push(scheduledPM);
              
              // Update statistics
              result.statistics.byPriority[rule.priority] = (result.statistics.byPriority[rule.priority] || 0) + 1;
              result.statistics.byModel[equip.model] = (result.statistics.byModel[equip.model] || 0) + 1;
            } else {
              result.conflicts.push(...conflicts);
            }
          }
        }
      }

      // Sort by priority and date
      result.scheduledPMs.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
        
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      });

      result.statistics.totalScheduled = result.scheduledPMs.length;
      result.statistics.utilizationRate = this.calculateUtilizationRate(result.scheduledPMs, config);

      return result;
    } catch (error) {
      console.error('Error generating optimized schedule:', error);
      throw error;
    }
  }

  /**
   * Check for scheduling conflicts
   */
  private async checkSchedulingConflicts(
    equipmentId: string,
    scheduledDate: Date,
    rule: PMSchedulingRule,
    existingWorkOrders: any[]
  ): Promise<any[]> {
    const conflicts: any[] = [];

    // Check for existing work orders on the same equipment
    const conflictingWOs = existingWorkOrders.filter(wo => 
      wo.equipmentId === equipmentId && 
      wo.status !== 'completed' && 
      wo.status !== 'closed' &&
      Math.abs(new Date(wo.dueDate).getTime() - scheduledDate.getTime()) < 24 * 60 * 60 * 1000
    );

    if (conflictingWOs.length > 0) {
      conflicts.push({
        equipmentId,
        conflictType: 'equipment_occupied',
        message: `Equipment has existing work order scheduled for ${scheduledDate.toLocaleDateString()}`,
        resolution: 'Reschedule or combine with existing work order',
      });
    }

    // Check technician availability (simplified)
    if (rule.assignedTechnicians.length > 0) {
      const techWorkOrders = existingWorkOrders.filter(wo => 
        rule.assignedTechnicians.includes(wo.assignedTo || '') &&
        wo.status !== 'completed' &&
        wo.status !== 'closed' &&
        Math.abs(new Date(wo.dueDate).getTime() - scheduledDate.getTime()) < 4 * 60 * 60 * 1000
      );

      if (techWorkOrders.length > 0) {
        conflicts.push({
          equipmentId,
          conflictType: 'technician_unavailable',
          message: `Assigned technician unavailable at ${scheduledDate.toLocaleString()}`,
          resolution: 'Assign different technician or reschedule',
        });
      }
    }

    return conflicts;
  }

  /**
   * Calculate utilization rate
   */
  private calculateUtilizationRate(scheduledPMs: any[], config: PMSchedulingConfig): number {
    const totalDuration = scheduledPMs.reduce((sum, pm) => sum + pm.estimatedDuration, 0);
    const workingHours = 8; // 8 hours per day
    const workingDays = config.globalSettings.workingDays.length;
    const maxCapacity = workingHours * workingDays * 7; // Weekly capacity
    
    return Math.min((totalDuration / maxCapacity) * 100, 100);
  }

  /**
   * Process missed PM escalations
   */
  public async processMissedPMEscalations(warehouseId: string): Promise<void> {
    try {
      const config = await this.loadSchedulingConfig(warehouseId);
      const equipment = await storage.getEquipment(warehouseId);
      const now = new Date();

      for (const equip of equipment) {
        const complianceStatus = await pmEngine.checkComplianceStatus(equip.id, warehouseId);
        
        if (complianceStatus.compliancePercentage < config.complianceTargets.overallComplianceRate) {
          // Create escalation notifications
          const escalationLevel = this.determineEscalationLevel(complianceStatus, config);
          
          if (escalationLevel > 0) {
            await this.triggerEscalation(equip.id, escalationLevel, config, complianceStatus);
          }
        }
      }
    } catch (error) {
      console.error('Error processing missed PM escalations:', error);
    }
  }

  /**
   * Determine escalation level based on compliance
   */
  private determineEscalationLevel(complianceStatus: any, config: PMSchedulingConfig): number {
    if (complianceStatus.missedPMCount > 5) return 3;
    if (complianceStatus.missedPMCount > 2) return 2;
    if (complianceStatus.missedPMCount > 0) return 1;
    return 0;
  }

  /**
   * Trigger escalation notifications
   */
  private async triggerEscalation(
    equipmentId: string,
    level: number,
    config: PMSchedulingConfig,
    complianceStatus: any
  ): Promise<void> {
    const escalationRule = config.escalationRules.escalationLevels.find(el => el.level === level);
    
    if (escalationRule) {
      const equipment = await storage.getEquipmentById(equipmentId);
      const profiles = await storage.getProfiles();
      
      for (const recipientRole of escalationRule.recipients) {
        const recipients = profiles.filter(p => 
          p.warehouseId === config.warehouseId &&
          p.role === recipientRole
        );

        for (const recipient of recipients) {
          // Create notification record (notification engine removed)
          await storage.createNotification({
            userId: recipient.id,
            type: 'pm_escalation',
            title: `PM Escalation - Level ${level}`,
            message: `Equipment ${equipment?.assetTag} has ${complianceStatus.missedPMCount} missed PM(s). Compliance: ${complianceStatus.compliancePercentage}%`,
            relatedEntityId: equipmentId,
            relatedEntityType: 'equipment',
            priority: 'high',
            warehouseId: config.warehouseId,
          });
        }
      }
    }
  }

  /**
   * Start automated scheduling
   */
  public async startAutomatedScheduling(intervalMinutes: number = 60): Promise<void> {
    if (this.isRunning) {
      console.log('PM scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting automated PM scheduling with ${intervalMinutes} minute interval`);

    this.schedulingInterval = setInterval(async () => {
      try {
        const warehouses = await storage.getWarehouses();
        
        for (const warehouse of warehouses) {
          if (warehouse.active) {
            await this.processMissedPMEscalations(warehouse.id);
            
            // Generate schedules for the next 7 days
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + 7);
            
            const schedule = await this.generateOptimizedSchedule(warehouse.id, startDate, endDate);
            
            if (schedule.scheduledPMs.length > 0) {
              console.log(`Generated ${schedule.scheduledPMs.length} optimized PM schedules for ${warehouse.name}`);
            }
          }
        }
      } catch (error) {
        console.error('Error in automated scheduling:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automated scheduling
   */
  public stopAutomatedScheduling(): void {
    if (this.schedulingInterval) {
      clearInterval(this.schedulingInterval);
      this.schedulingInterval = null;
    }
    this.isRunning = false;
    console.log('Automated PM scheduling stopped');
  }

  /**
   * Get scheduling status
   */
  public getSchedulingStatus(): { isRunning: boolean; nextRun?: Date } {
    return {
      isRunning: this.isRunning,
      nextRun: this.isRunning ? new Date(Date.now() + 60 * 60 * 1000) : undefined,
    };
  }
}

export const pmSchedulerEnhanced = PMSchedulerEnhanced.getInstance();
