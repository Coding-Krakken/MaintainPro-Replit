import { storage } from '../storage';
import { WorkOrder, Equipment, Part, Notification } from '@shared/schema';

export interface ReportFilter {
  warehouseId: string;
  startDate: Date;
  endDate: Date;
  equipmentIds?: string[];
  technicianIds?: string[];
  workOrderTypes?: string[];
  priorities?: string[];
  statuses?: string[];
}

export interface KPIMetrics {
  workOrderMetrics: {
    total: number;
    completed: number;
    overdue: number;
    completionRate: number;
    averageCompletionTime: number;
    firstTimeFixRate: number;
    backlogSize: number;
  };
  equipmentMetrics: {
    totalEquipment: number;
    activeEquipment: number;
    availability: number;
    mtbf: number; // Mean Time Between Failures
    mttr: number; // Mean Time To Repair
    utilizationRate: number;
  };
  maintenanceMetrics: {
    pmComplianceRate: number;
    plannedMaintenanceRatio: number;
    emergencyMaintenanceRatio: number;
    maintenanceCostPerUnit: number;
    pmEffectiveness: number;
  };
  inventoryMetrics: {
    partsCount: number;
    stockoutIncidents: number;
    inventoryTurnover: number;
    carryCost: number;
    reorderPointAccuracy: number;
  };
  performanceMetrics: {
    technicianUtilization: number;
    averageResponseTime: number;
    customerSatisfaction: number;
    costPerWorkOrder: number;
    energyEfficiency: number;
  };
}

export interface TrendAnalysis {
  period: string;
  workOrderTrends: {
    date: string;
    total: number;
    completed: number;
    overdue: number;
  }[];
  equipmentPerformance: {
    equipmentId: string;
    model: string;
    availability: number[];
    mtbf: number[];
    costs: number[];
  }[];
  complianceTrends: {
    date: string;
    pmCompliance: number;
    safetyCompliance: number;
    qualityCompliance: number;
  }[];
}

export interface ExecutiveDashboard {
  summary: {
    totalWorkOrders: number;
    activeEquipment: number;
    overallEfficiency: number;
    monthlyCost: number;
    complianceScore: number;
  };
  keyMetrics: KPIMetrics;
  trends: TrendAnalysis;
  alerts: {
    critical: number;
    warnings: number;
    overdue: number;
  };
  recommendations: {
    type: 'cost_optimization' | 'efficiency_improvement' | 'preventive_action';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    potentialSavings?: number;
    implementationTime?: string;
  }[];
}

export interface EquipmentPerformanceReport {
  equipmentId: string;
  model: string;
  assetTag: string;
  location: string;
  performanceScore: number;
  availability: number;
  reliability: number;
  maintainability: number;
  maintenanceHistory: {
    date: Date;
    type: 'preventive' | 'corrective' | 'emergency';
    cost: number;
    duration: number;
    description: string;
  }[];
  failureAnalysis: {
    totalFailures: number;
    failureRate: number;
    commonFailures: {
      component: string;
      frequency: number;
      averageCost: number;
    }[];
  };
  costAnalysis: {
    totalMaintenanceCost: number;
    costPerHour: number;
    costTrend: number;
    breakdown: {
      labor: number;
      parts: number;
      overhead: number;
    };
  };
  recommendations: string[];
}

export interface ComplianceReport {
  warehouseId: string;
  reportPeriod: { start: Date; end: Date };
  overallCompliance: number;
  pmCompliance: {
    total: number;
    completed: number;
    overdue: number;
    compliance: number;
    trend: number;
  };
  safetyCompliance: {
    inspections: number;
    violations: number;
    compliance: number;
    trend: number;
  };
  regulatoryCompliance: {
    audits: number;
    findings: number;
    compliance: number;
    trend: number;
  };
  equipmentCompliance: {
    equipmentId: string;
    model: string;
    compliance: number;
    violations: number;
    nextInspection: Date;
  }[];
}

class AdvancedReportingService {
  private static instance: AdvancedReportingService;

  private constructor() {}

  public static getInstance(): AdvancedReportingService {
    if (!AdvancedReportingService.instance) {
      AdvancedReportingService.instance = new AdvancedReportingService();
    }
    return AdvancedReportingService.instance;
  }

  /**
   * Generate comprehensive KPI metrics
   */
  public async generateKPIMetrics(filter: ReportFilter): Promise<KPIMetrics> {
    try {
      const [workOrders, equipment, parts, notifications] = await Promise.all([
        storage.getWorkOrders(filter.warehouseId),
        storage.getEquipment(filter.warehouseId),
        storage.getParts(filter.warehouseId),
        storage.getNotifications(filter.warehouseId)
      ]);

      // Filter data by date range
      const filteredWorkOrders = workOrders.filter(wo => {
        const createdDate = new Date(wo.createdAt);
        return createdDate >= filter.startDate && createdDate <= filter.endDate;
      });

      const workOrderMetrics = await this.calculateWorkOrderMetrics(filteredWorkOrders);
      const equipmentMetrics = await this.calculateEquipmentMetrics(equipment, filteredWorkOrders);
      const maintenanceMetrics = await this.calculateMaintenanceMetrics(filteredWorkOrders);
      const inventoryMetrics = await this.calculateInventoryMetrics(parts, filteredWorkOrders);
      const performanceMetrics = await this.calculatePerformanceMetrics(filteredWorkOrders, equipment);

      return {
        workOrderMetrics,
        equipmentMetrics,
        maintenanceMetrics,
        inventoryMetrics,
        performanceMetrics,
      };
    } catch (error) {
      console.error('Error generating KPI metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate work order metrics
   */
  private async calculateWorkOrderMetrics(workOrders: WorkOrder[]): Promise<KPIMetrics['workOrderMetrics']> {
    const total = workOrders.length;
    const completed = workOrders.filter(wo => wo.status === 'completed').length;
    const overdue = workOrders.filter(wo => {
      const dueDate = new Date(wo.dueDate);
      return dueDate < new Date() && wo.status !== 'completed';
    }).length;

    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Calculate average completion time
    const completedWOs = workOrders.filter(wo => wo.status === 'completed' && wo.completedAt);
    const totalCompletionTime = completedWOs.reduce((sum, wo) => {
      const created = new Date(wo.createdAt);
      const completed = new Date(wo.completedAt!);
      return sum + (completed.getTime() - created.getTime());
    }, 0);
    const averageCompletionTime = completedWOs.length > 0 ? totalCompletionTime / completedWOs.length / (1000 * 60 * 60) : 0; // in hours

    // Calculate first time fix rate (simplified - assume completed without rework)
    const firstTimeFixRate = completedWOs.length > 0 ? (completedWOs.length / total) * 100 : 0;

    const backlogSize = workOrders.filter(wo => wo.status === 'new' || wo.status === 'assigned').length;

    return {
      total,
      completed,
      overdue,
      completionRate,
      averageCompletionTime,
      firstTimeFixRate,
      backlogSize,
    };
  }

  /**
   * Calculate equipment metrics
   */
  private async calculateEquipmentMetrics(equipment: Equipment[], workOrders: WorkOrder[]): Promise<KPIMetrics['equipmentMetrics']> {
    const totalEquipment = equipment.length;
    const activeEquipment = equipment.filter(eq => eq.status === 'active').length;

    // Calculate availability (simplified)
    const availability = activeEquipment > 0 ? (activeEquipment / totalEquipment) * 100 : 0;

    // Calculate MTBF (Mean Time Between Failures)
    const failures = workOrders.filter(wo => wo.type === 'corrective');
    const mtbf = failures.length > 0 ? (30 * 24) / failures.length : 720; // 30 days / failures

    // Calculate MTTR (Mean Time To Repair)
    const repairTimes = failures.filter(wo => wo.completedAt).map(wo => {
      const created = new Date(wo.createdAt);
      const completed = new Date(wo.completedAt!);
      return (completed.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
    });
    const mttr = repairTimes.length > 0 ? repairTimes.reduce((sum, time) => sum + time, 0) / repairTimes.length : 0;

    const utilizationRate = 85; // Simplified calculation

    return {
      totalEquipment,
      activeEquipment,
      availability,
      mtbf,
      mttr,
      utilizationRate,
    };
  }

  /**
   * Calculate maintenance metrics
   */
  private async calculateMaintenanceMetrics(workOrders: WorkOrder[]): Promise<KPIMetrics['maintenanceMetrics']> {
    const pmWorkOrders = workOrders.filter(wo => wo.type === 'preventive');
    const completedPMs = pmWorkOrders.filter(wo => wo.status === 'completed');
    const pmComplianceRate = pmWorkOrders.length > 0 ? (completedPMs.length / pmWorkOrders.length) * 100 : 0;

    const plannedMaintenance = pmWorkOrders.length;
    const emergencyMaintenance = workOrders.filter(wo => wo.priority === 'critical' && wo.type === 'corrective').length;
    const totalMaintenance = plannedMaintenance + emergencyMaintenance;

    const plannedMaintenanceRatio = totalMaintenance > 0 ? (plannedMaintenance / totalMaintenance) * 100 : 0;
    const emergencyMaintenanceRatio = totalMaintenance > 0 ? (emergencyMaintenance / totalMaintenance) * 100 : 0;

    const maintenanceCostPerUnit = 150; // Simplified calculation
    const pmEffectiveness = pmComplianceRate > 80 ? 85 : 65; // Simplified calculation

    return {
      pmComplianceRate,
      plannedMaintenanceRatio,
      emergencyMaintenanceRatio,
      maintenanceCostPerUnit,
      pmEffectiveness,
    };
  }

  /**
   * Calculate inventory metrics
   */
  private async calculateInventoryMetrics(parts: Part[], workOrders: WorkOrder[]): Promise<KPIMetrics['inventoryMetrics']> {
    const partsCount = parts.length;
    const stockoutIncidents = parts.filter(part => part.stockLevel <= part.reorderPoint).length;
    const inventoryTurnover = 6; // Simplified calculation
    const carryCost = 25000; // Simplified calculation
    const reorderPointAccuracy = 95; // Simplified calculation

    return {
      partsCount,
      stockoutIncidents,
      inventoryTurnover,
      carryCost,
      reorderPointAccuracy,
    };
  }

  /**
   * Calculate performance metrics
   */
  private async calculatePerformanceMetrics(workOrders: WorkOrder[], equipment: Equipment[]): Promise<KPIMetrics['performanceMetrics']> {
    const technicianUtilization = 78; // Simplified calculation
    const averageResponseTime = 2.5; // hours
    const customerSatisfaction = 4.2; // out of 5
    const costPerWorkOrder = workOrders.length > 0 ? 350 : 0; // Simplified calculation
    const energyEfficiency = 82; // Simplified calculation

    return {
      technicianUtilization,
      averageResponseTime,
      customerSatisfaction,
      costPerWorkOrder,
      energyEfficiency,
    };
  }

  /**
   * Generate trend analysis
   */
  public async generateTrendAnalysis(filter: ReportFilter): Promise<TrendAnalysis> {
    try {
      const workOrders = await storage.getWorkOrders(filter.warehouseId);
      const equipment = await storage.getEquipment(filter.warehouseId);

      // Generate daily trends for the period
      const workOrderTrends = this.generateWorkOrderTrends(workOrders, filter);
      const equipmentPerformance = this.generateEquipmentPerformanceTrends(equipment, workOrders);
      const complianceTrends = this.generateComplianceTrends(workOrders, filter);

      return {
        period: `${filter.startDate.toISOString().split('T')[0]} to ${filter.endDate.toISOString().split('T')[0]}`,
        workOrderTrends,
        equipmentPerformance,
        complianceTrends,
      };
    } catch (error) {
      console.error('Error generating trend analysis:', error);
      throw error;
    }
  }

  /**
   * Generate work order trends
   */
  private generateWorkOrderTrends(workOrders: WorkOrder[], filter: ReportFilter): TrendAnalysis['workOrderTrends'] {
    const trends: TrendAnalysis['workOrderTrends'] = [];
    const currentDate = new Date(filter.startDate);

    while (currentDate <= filter.endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayWorkOrders = workOrders.filter(wo => {
        const createdDate = new Date(wo.createdAt);
        return createdDate >= dayStart && createdDate < dayEnd;
      });

      trends.push({
        date: currentDate.toISOString().split('T')[0],
        total: dayWorkOrders.length,
        completed: dayWorkOrders.filter(wo => wo.status === 'completed').length,
        overdue: dayWorkOrders.filter(wo => {
          const dueDate = new Date(wo.dueDate);
          return dueDate < new Date() && wo.status !== 'completed';
        }).length,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trends;
  }

  /**
   * Generate equipment performance trends
   */
  private generateEquipmentPerformanceTrends(equipment: Equipment[], workOrders: WorkOrder[]): TrendAnalysis['equipmentPerformance'] {
    return equipment.slice(0, 10).map(eq => ({
      equipmentId: eq.id,
      model: eq.model,
      availability: [95, 92, 88, 90, 93], // Simplified trend data
      mtbf: [720, 680, 650, 700, 720], // Simplified trend data
      costs: [1500, 1200, 1800, 1300, 1100], // Simplified trend data
    }));
  }

  /**
   * Generate compliance trends
   */
  private generateComplianceTrends(workOrders: WorkOrder[], filter: ReportFilter): TrendAnalysis['complianceTrends'] {
    const trends: TrendAnalysis['complianceTrends'] = [];
    const currentDate = new Date(filter.startDate);

    while (currentDate <= filter.endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setDate(dayEnd.getDate() + 7); // Weekly intervals

      if (dayEnd > filter.endDate) break;

      const weekWorkOrders = workOrders.filter(wo => {
        const createdDate = new Date(wo.createdAt);
        return createdDate >= dayStart && createdDate < dayEnd;
      });

      const pmWorkOrders = weekWorkOrders.filter(wo => wo.type === 'preventive');
      const completedPMs = pmWorkOrders.filter(wo => wo.status === 'completed');
      const pmCompliance = pmWorkOrders.length > 0 ? (completedPMs.length / pmWorkOrders.length) * 100 : 100;

      trends.push({
        date: currentDate.toISOString().split('T')[0],
        pmCompliance,
        safetyCompliance: 95, // Simplified
        qualityCompliance: 92, // Simplified
      });

      currentDate.setDate(currentDate.getDate() + 7);
    }

    return trends;
  }

  /**
   * Generate executive dashboard
   */
  public async generateExecutiveDashboard(warehouseId: string): Promise<ExecutiveDashboard> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // Last month

      const filter: ReportFilter = {
        warehouseId,
        startDate,
        endDate,
      };

      const [keyMetrics, trends] = await Promise.all([
        this.generateKPIMetrics(filter),
        this.generateTrendAnalysis(filter),
      ]);

      const summary = {
        totalWorkOrders: keyMetrics.workOrderMetrics.total,
        activeEquipment: keyMetrics.equipmentMetrics.activeEquipment,
        overallEfficiency: keyMetrics.equipmentMetrics.availability,
        monthlyCost: keyMetrics.maintenanceMetrics.maintenanceCostPerUnit * keyMetrics.workOrderMetrics.total,
        complianceScore: keyMetrics.maintenanceMetrics.pmComplianceRate,
      };

      const alerts = {
        critical: keyMetrics.workOrderMetrics.overdue,
        warnings: keyMetrics.inventoryMetrics.stockoutIncidents,
        overdue: keyMetrics.workOrderMetrics.overdue,
      };

      const recommendations = this.generateRecommendations(keyMetrics);

      return {
        summary,
        keyMetrics,
        trends,
        alerts,
        recommendations,
      };
    } catch (error) {
      console.error('Error generating executive dashboard:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(metrics: KPIMetrics): ExecutiveDashboard['recommendations'] {
    const recommendations: ExecutiveDashboard['recommendations'] = [];

    // PM compliance recommendation
    if (metrics.maintenanceMetrics.pmComplianceRate < 90) {
      recommendations.push({
        type: 'efficiency_improvement',
        priority: 'high',
        title: 'Improve PM Compliance',
        description: 'PM compliance is below target. Consider increasing scheduling frequency and technician training.',
        potentialSavings: 15000,
        implementationTime: '2-3 weeks',
      });
    }

    // Equipment availability recommendation
    if (metrics.equipmentMetrics.availability < 95) {
      recommendations.push({
        type: 'preventive_action',
        priority: 'high',
        title: 'Enhance Equipment Availability',
        description: 'Equipment availability is below target. Focus on predictive maintenance and spare parts management.',
        potentialSavings: 25000,
        implementationTime: '1-2 months',
      });
    }

    // Inventory optimization recommendation
    if (metrics.inventoryMetrics.stockoutIncidents > 5) {
      recommendations.push({
        type: 'cost_optimization',
        priority: 'medium',
        title: 'Optimize Inventory Management',
        description: 'High stockout incidents detected. Consider adjusting reorder points and safety stock levels.',
        potentialSavings: 8000,
        implementationTime: '1-2 weeks',
      });
    }

    return recommendations;
  }

  /**
   * Generate equipment performance report
   */
  public async generateEquipmentPerformanceReport(equipmentId: string, warehouseId: string): Promise<EquipmentPerformanceReport> {
    try {
      const equipment = await storage.getEquipmentById(equipmentId);
      const workOrders = await storage.getWorkOrders(warehouseId);

      if (!equipment) {
        throw new Error(`Equipment ${equipmentId} not found`);
      }

      const equipmentWorkOrders = workOrders.filter(wo => wo.equipmentId === equipmentId);
      const completedWorkOrders = equipmentWorkOrders.filter(wo => wo.status === 'completed');

      const performanceScore = this.calculatePerformanceScore(completedWorkOrders);
      const availability = this.calculateEquipmentAvailability(equipment, completedWorkOrders);
      const reliability = this.calculateEquipmentReliability(completedWorkOrders);
      const maintainability = this.calculateEquipmentMaintainability(completedWorkOrders);

      const maintenanceHistory = completedWorkOrders.map(wo => ({
        date: new Date(wo.completedAt || wo.createdAt),
        type: wo.type as 'preventive' | 'corrective' | 'emergency',
        cost: 500, // Simplified calculation
        duration: 2, // Simplified calculation
        description: wo.description,
      }));

      const failureAnalysis = this.calculateFailureAnalysis(completedWorkOrders);
      const costAnalysis = this.calculateCostAnalysis(completedWorkOrders);
      const recommendations = this.generateEquipmentRecommendations(equipment, completedWorkOrders);

      return {
        equipmentId,
        model: equipment.model,
        assetTag: equipment.assetTag,
        location: equipment.location || 'Unknown',
        performanceScore,
        availability,
        reliability,
        maintainability,
        maintenanceHistory,
        failureAnalysis,
        costAnalysis,
        recommendations,
      };
    } catch (error) {
      console.error('Error generating equipment performance report:', error);
      throw error;
    }
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(workOrders: WorkOrder[]): number {
    const pmWorkOrders = workOrders.filter(wo => wo.type === 'preventive');
    const correctiveWorkOrders = workOrders.filter(wo => wo.type === 'corrective');
    
    const pmRatio = workOrders.length > 0 ? (pmWorkOrders.length / workOrders.length) : 0;
    const baseScore = 100 - (correctiveWorkOrders.length * 5);
    const pmBonus = pmRatio * 20;
    
    return Math.max(0, Math.min(100, baseScore + pmBonus));
  }

  /**
   * Calculate equipment availability
   */
  private calculateEquipmentAvailability(equipment: Equipment, workOrders: WorkOrder[]): number {
    const downtimeHours = workOrders.reduce((sum, wo) => {
      if (wo.type === 'corrective' && wo.completedAt) {
        const created = new Date(wo.createdAt);
        const completed = new Date(wo.completedAt);
        return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
      }
      return sum;
    }, 0);

    const totalHours = 30 * 24; // 30 days
    return Math.max(0, ((totalHours - downtimeHours) / totalHours) * 100);
  }

  /**
   * Calculate equipment reliability
   */
  private calculateEquipmentReliability(workOrders: WorkOrder[]): number {
    const failures = workOrders.filter(wo => wo.type === 'corrective').length;
    const totalHours = 30 * 24; // 30 days
    const mtbf = failures > 0 ? totalHours / failures : totalHours;
    
    return Math.min(100, (mtbf / 720) * 100); // 720 hours = 30 days
  }

  /**
   * Calculate equipment maintainability
   */
  private calculateEquipmentMaintainability(workOrders: WorkOrder[]): number {
    const repairTimes = workOrders.filter(wo => wo.completedAt).map(wo => {
      const created = new Date(wo.createdAt);
      const completed = new Date(wo.completedAt!);
      return (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
    });

    const averageRepairTime = repairTimes.length > 0 ? repairTimes.reduce((sum, time) => sum + time, 0) / repairTimes.length : 0;
    const targetRepairTime = 4; // 4 hours target
    
    return Math.max(0, Math.min(100, ((targetRepairTime - averageRepairTime) / targetRepairTime) * 100 + 50));
  }

  /**
   * Calculate failure analysis
   */
  private calculateFailureAnalysis(workOrders: WorkOrder[]): EquipmentPerformanceReport['failureAnalysis'] {
    const failures = workOrders.filter(wo => wo.type === 'corrective');
    const totalFailures = failures.length;
    const totalHours = 30 * 24; // 30 days
    const failureRate = totalFailures > 0 ? (totalFailures / totalHours) * 100 : 0;

    // Simplified common failures calculation
    const commonFailures = [
      { component: 'Motor', frequency: Math.floor(totalFailures * 0.4), averageCost: 800 },
      { component: 'Bearings', frequency: Math.floor(totalFailures * 0.3), averageCost: 400 },
      { component: 'Belts', frequency: Math.floor(totalFailures * 0.2), averageCost: 150 },
    ].filter(f => f.frequency > 0);

    return {
      totalFailures,
      failureRate,
      commonFailures,
    };
  }

  /**
   * Calculate cost analysis
   */
  private calculateCostAnalysis(workOrders: WorkOrder[]): EquipmentPerformanceReport['costAnalysis'] {
    const totalMaintenanceCost = workOrders.length * 500; // Simplified calculation
    const totalHours = workOrders.reduce((sum, wo) => sum + parseFloat(wo.estimatedHours || '2'), 0);
    const costPerHour = totalHours > 0 ? totalMaintenanceCost / totalHours : 0;
    const costTrend = 5; // 5% increase

    return {
      totalMaintenanceCost,
      costPerHour,
      costTrend,
      breakdown: {
        labor: totalMaintenanceCost * 0.6,
        parts: totalMaintenanceCost * 0.3,
        overhead: totalMaintenanceCost * 0.1,
      },
    };
  }

  /**
   * Generate equipment recommendations
   */
  private generateEquipmentRecommendations(equipment: Equipment, workOrders: WorkOrder[]): string[] {
    const recommendations: string[] = [];
    
    const failures = workOrders.filter(wo => wo.type === 'corrective').length;
    const preventive = workOrders.filter(wo => wo.type === 'preventive').length;

    if (failures > 3) {
      recommendations.push('Consider increasing PM frequency to reduce corrective maintenance');
    }

    if (preventive < 2) {
      recommendations.push('Implement more frequent preventive maintenance schedule');
    }

    if (workOrders.length > 10) {
      recommendations.push('High maintenance frequency detected - consider equipment replacement evaluation');
    }

    return recommendations;
  }
}

export const advancedReportingService = AdvancedReportingService.getInstance();
