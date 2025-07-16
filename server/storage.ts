import { 
  profiles, 
  warehouses, 
  equipment, 
  workOrders, 
  workOrderChecklistItems,
  parts, 
  partsUsage,
  vendors,
  pmTemplates,
  notifications,
  attachments,
  systemLogs,
  type Profile, 
  type InsertProfile,
  type Warehouse,
  type InsertWarehouse,
  type Equipment,
  type InsertEquipment,
  type WorkOrder,
  type InsertWorkOrder,
  type WorkOrderChecklistItem,
  type Part,
  type InsertPart,
  type PartsUsage,
  type Vendor,
  type InsertVendor,
  type PmTemplate,
  type InsertPmTemplate,
  type Notification,
  type InsertNotification,
  type Attachment,
  type InsertAttachment,
  type SystemLog
} from "@shared/schema";

export interface IStorage {
  // Profiles
  getProfile(id: string): Promise<Profile | undefined>;
  getProfiles(): Promise<Profile[]>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, profile: Partial<InsertProfile>): Promise<Profile>;
  
  // Warehouses
  getWarehouses(): Promise<Warehouse[]>;
  getWarehouse(id: string): Promise<Warehouse | undefined>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  
  // Equipment
  getEquipment(warehouseId: string): Promise<Equipment[]>;
  getEquipmentById(id: string): Promise<Equipment | undefined>;
  getEquipmentByAssetTag(assetTag: string): Promise<Equipment | undefined>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: string, equipment: Partial<InsertEquipment>): Promise<Equipment>;
  
  // Work Orders
  getWorkOrders(warehouseId: string, filters?: any): Promise<WorkOrder[]>;
  getWorkOrder(id: string): Promise<WorkOrder | undefined>;
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  updateWorkOrder(id: string, workOrder: Partial<InsertWorkOrder>): Promise<WorkOrder>;
  deleteWorkOrder(id: string): Promise<void>;
  getWorkOrdersByAssignee(userId: string): Promise<WorkOrder[]>;
  
  // Work Order Checklist Items
  getChecklistItems(workOrderId: string): Promise<WorkOrderChecklistItem[]>;
  createChecklistItem(item: Omit<WorkOrderChecklistItem, 'id' | 'createdAt'>): Promise<WorkOrderChecklistItem>;
  createWorkOrderChecklistItem(item: Omit<WorkOrderChecklistItem, 'id' | 'createdAt'>): Promise<WorkOrderChecklistItem>;
  updateChecklistItem(id: string, item: Partial<WorkOrderChecklistItem>): Promise<WorkOrderChecklistItem>;
  
  // Parts
  getParts(warehouseId: string): Promise<Part[]>;
  getPart(id: string): Promise<Part | undefined>;
  getPartByNumber(partNumber: string): Promise<Part | undefined>;
  createPart(part: InsertPart): Promise<Part>;
  updatePart(id: string, part: Partial<InsertPart>): Promise<Part>;
  getPartsUsage(workOrderId: string): Promise<PartsUsage[]>;
  createPartsUsage(usage: Omit<PartsUsage, 'id' | 'createdAt'>): Promise<PartsUsage>;
  
  // Vendors
  getVendors(warehouseId: string): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  
  // PM Templates
  getPmTemplates(warehouseId: string): Promise<PmTemplate[]>;
  getPmTemplate(id: string): Promise<PmTemplate | null>;
  createPmTemplate(template: InsertPmTemplate): Promise<PmTemplate>;
  updatePmTemplate(id: string, updates: Partial<InsertPmTemplate>): Promise<PmTemplate | null>;
  deletePmTemplate(id: string): Promise<void>;
  
  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  
  // Attachments
  getAttachments(workOrderId?: string, equipmentId?: string): Promise<Attachment[]>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  
  // System Logs
  createSystemLog(log: Omit<SystemLog, 'id' | 'createdAt'>): Promise<SystemLog>;
}

export class MemStorage implements IStorage {
  private profiles: Map<string, Profile>;
  private warehouses: Map<string, Warehouse>;
  private equipment: Map<string, Equipment>;
  private workOrders: Map<string, WorkOrder>;
  private checklistItems: Map<string, WorkOrderChecklistItem>;
  private parts: Map<string, Part>;
  private partsUsage: Map<string, PartsUsage>;
  private vendors: Map<string, Vendor>;
  private pmTemplates: Map<string, PmTemplate>;
  private notifications: Map<string, Notification>;
  private attachments: Map<string, Attachment>;
  private systemLogs: Map<string, SystemLog>;

  constructor() {
    this.profiles = new Map();
    this.warehouses = new Map();
    this.equipment = new Map();
    this.workOrders = new Map();
    this.checklistItems = new Map();
    this.parts = new Map();
    this.partsUsage = new Map();
    this.vendors = new Map();
    this.pmTemplates = new Map();
    this.notifications = new Map();
    this.attachments = new Map();
    this.systemLogs = new Map();
    
    this.seedData();
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  private seedData() {
    // Create default warehouse
    const warehouseId = 'default-warehouse-id'; // Use fixed ID for demo
    const warehouse: Warehouse = {
      id: warehouseId,
      name: "Main Warehouse",
      address: "123 Industrial Blvd, Manufacturing City, MC 12345",
      timezone: "America/New_York",
      operatingHoursStart: "06:00",
      operatingHoursEnd: "18:00",
      emergencyContact: "+1-555-EMERGENCY",
      active: true,
      createdAt: new Date(),
    };
    this.warehouses.set(warehouseId, warehouse);

    // Create default users
    const supervisorId = 'supervisor-id'; // Use fixed ID for demo
    const technicianId = 'technician-id'; // Use fixed ID for demo
    const managerId = 'manager-id'; // Use fixed ID for demo
    
    const supervisor: Profile = {
      id: supervisorId,
      email: "supervisor@maintainpro.com",
      firstName: "John",
      lastName: "Smith",
      role: "supervisor",
      warehouseId,
      active: true,
      createdAt: new Date(),
    };
    
    const technician: Profile = {
      id: technicianId,
      email: "technician@maintainpro.com",
      firstName: "Mike",
      lastName: "Johnson",
      role: "technician",
      warehouseId,
      active: true,
      createdAt: new Date(),
    };
    
    const manager: Profile = {
      id: managerId,
      email: "manager@maintainpro.com",
      firstName: "Sarah",
      lastName: "Wilson",
      role: "manager",
      warehouseId,
      active: true,
      createdAt: new Date(),
    };

    this.profiles.set(supervisorId, supervisor);
    this.profiles.set(technicianId, technician);
    this.profiles.set(managerId, manager);

    // Create sample equipment
    const equipmentId1 = this.generateId();
    const equipmentId2 = this.generateId();
    const equipmentId3 = this.generateId();
    
    const equipment1: Equipment = {
      id: equipmentId1,
      assetTag: "UAS-001",
      model: "CB-2000X",
      description: "Conveyor Belt System",
      area: "Warehouse A",
      status: "active",
      criticality: "high",
      installDate: new Date("2020-01-15"),
      warrantyExpiry: new Date("2025-01-15"),
      manufacturer: "ConveyorCorp",
      serialNumber: "CB2000X-001",
      specifications: { speed: "2.5 m/s", capacity: "500 kg" },
      warehouseId,
      createdAt: new Date(),
    };
    
    const equipment2: Equipment = {
      id: equipmentId2,
      assetTag: "HVAC-205",
      model: "HVAC-PRO-500",
      description: "HVAC System - Main Floor",
      area: "Main Floor",
      status: "active",
      criticality: "medium",
      installDate: new Date("2019-06-20"),
      warrantyExpiry: new Date("2024-06-20"),
      manufacturer: "ClimateControl Inc",
      serialNumber: "HVAC500-205",
      specifications: { capacity: "50 tons", efficiency: "95%" },
      warehouseId,
      createdAt: new Date(),
    };
    
    const equipment3: Equipment = {
      id: equipmentId3,
      assetTag: "FLT-001",
      model: "Forklift-3000",
      description: "Electric Forklift",
      area: "Loading Dock",
      status: "active",
      criticality: "medium",
      installDate: new Date("2021-03-10"),
      warrantyExpiry: new Date("2026-03-10"),
      manufacturer: "LiftMaster",
      serialNumber: "FL3000-001",
      specifications: { capacity: "3000 lbs", battery: "48V" },
      warehouseId,
      createdAt: new Date(),
    };

    this.equipment.set(equipmentId1, equipment1);
    this.equipment.set(equipmentId2, equipment2);
    this.equipment.set(equipmentId3, equipment3);

    // Create sample work orders
    const workOrderId1 = this.generateId();
    const workOrderId2 = this.generateId();
    const workOrderId3 = this.generateId();
    
    const workOrder1: WorkOrder = {
      completedAt: null,
      verifiedBy: null,
      actualHours: null,
      id: workOrderId1,
      foNumber: "WO-001",
      type: "corrective",
      description: "Conveyor Belt Maintenance - Belt alignment adjustment required",
      area: "Warehouse A",
      assetModel: "CB-2000X",
      status: "in_progress",
      priority: "high",
      requestedBy: supervisorId,
      assignedTo: technicianId,
      equipmentId: equipmentId1,
      dueDate: new Date(),
      estimatedHours: "4.00",
      notes: "Belt showing signs of misalignment. Customer reported unusual noise.",
      followUp: false,
      escalated: false,
      escalationLevel: 0,
      warehouseId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const workOrder2: WorkOrder = {
      completedAt: null,
      verifiedBy: null,
      actualHours: null,
      id: workOrderId2,
      foNumber: "WO-002",
      type: "preventive",
      description: "HVAC System Check - Monthly maintenance",
      area: "Main Floor",
      assetModel: "HVAC-PRO-500",
      status: "new",
      priority: "medium",
      requestedBy: supervisorId,
      assignedTo: technicianId,
      equipmentId: equipmentId2,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      estimatedHours: "2.00",
      notes: "Monthly PM check - filters, coils, and system performance",
      followUp: false,
      escalated: false,
      escalationLevel: 0,
      warehouseId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const workOrder3: WorkOrder = {
      verifiedBy: managerId,
      id: workOrderId3,
      foNumber: "WO-003",
      type: "preventive",
      description: "Monthly PM - Forklift 001",
      area: "Loading Dock",
      assetModel: "Forklift-3000",
      status: "completed",
      priority: "low",
      requestedBy: supervisorId,
      assignedTo: technicianId,
      equipmentId: equipmentId3,
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      estimatedHours: "1.50",
      actualHours: "1.25",
      notes: "Completed monthly inspection. All systems operational.",
      followUp: false,
      escalated: false,
      escalationLevel: 0,
      warehouseId,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    };

    this.workOrders.set(workOrderId1, workOrder1);
    this.workOrders.set(workOrderId2, workOrder2);
    this.workOrders.set(workOrderId3, workOrder3);

    // Create sample parts
    const partId1 = this.generateId();
    const partId2 = this.generateId();
    const partId3 = this.generateId();
    
    const part1: Part = {
      id: partId1,
      partNumber: "HYT106.0432",
      description: "Hydraulic Filter",
      category: "Filters",
      unitOfMeasure: "EA",
      unitCost: "45.99",
      stockLevel: 8,
      reorderPoint: 10,
      maxStock: 50,
      location: "A-12-3",
      vendor: "HydraulicSupply Co.",
      active: true,
      warehouseId,
      createdAt: new Date(),
    };
    
    const part2: Part = {
      id: partId2,
      partNumber: "BELT-CB-2000",
      description: "Conveyor Belt - 2000mm",
      category: "Belts",
      unitOfMeasure: "M",
      unitCost: "125.50",
      stockLevel: 25,
      reorderPoint: 15,
      maxStock: 100,
      location: "B-5-1",
      vendor: "ConveyorCorp",
      active: true,
      warehouseId,
      createdAt: new Date(),
    };
    
    const part3: Part = {
      id: partId3,
      partNumber: "HVAC-FILTER-500",
      description: "HVAC Air Filter - 500 Series",
      category: "Filters",
      unitOfMeasure: "EA",
      unitCost: "29.99",
      stockLevel: 5,
      reorderPoint: 8,
      maxStock: 30,
      location: "C-8-2",
      vendor: "ClimateControl Inc",
      active: true,
      warehouseId,
      createdAt: new Date(),
    };

    this.parts.set(partId1, part1);
    this.parts.set(partId2, part2);
    this.parts.set(partId3, part3);

    // Create sample notifications
    const notificationId1 = this.generateId();
    const notificationId2 = this.generateId();
    const notificationId3 = this.generateId();
    
    const notification1: Notification = {
      id: notificationId1,
      userId: technicianId,
      type: "wo_assigned",
      title: "New Work Order Assigned",
      message: "Work Order WO-001 has been assigned to you",
      read: false,
      workOrderId: workOrderId1,
      equipmentId: equipmentId1,
      partId: null,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    };
    
    const notification2: Notification = {
      id: notificationId2,
      userId: supervisorId,
      type: "part_low_stock",
      title: "Low Stock Alert",
      message: "Part HYT106.0432 is below reorder point",
      read: false,
      partId: partId1,
      equipmentId: null,
      workOrderId: null,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    };
    
    const notification3: Notification = {
      id: notificationId3,
      userId: supervisorId,
      type: "wo_overdue",
      title: "Work Order Overdue",
      message: "Work Order WO-001 is past due date",
      read: true,
      workOrderId: workOrderId1,
      equipmentId: equipmentId1,
      partId: null,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    };

    this.notifications.set(notificationId1, notification1);
    this.notifications.set(notificationId2, notification2);
    this.notifications.set(notificationId3, notification3);

    // Create PM Templates
    const pmTemplate1Id = this.generateId();
    const pmTemplate1: PmTemplate = {
      id: pmTemplate1Id,
      model: "Pump Model A",
      component: "Oil Filter",
      action: "Replace oil filter and check for leaks",
      frequency: "monthly",
      customFields: { oilType: "10W-30", filterSize: "Standard" },
      active: true,
      warehouseId,
      createdAt: new Date(),
    };

    const pmTemplate2Id = this.generateId();
    const pmTemplate2: PmTemplate = {
      id: pmTemplate2Id,
      model: "Pump Model A",
      component: "Belt",
      action: "Inspect belt tension and alignment",
      frequency: "weekly",
      customFields: { beltType: "V-Belt", tension: "Medium" },
      active: true,
      warehouseId,
      createdAt: new Date(),
    };

    const pmTemplate3Id = this.generateId();
    const pmTemplate3: PmTemplate = {
      id: pmTemplate3Id,
      model: "Conveyor System",
      component: "Bearings",
      action: "Lubricate bearings and check for wear",
      frequency: "monthly",
      customFields: { lubricant: "Multi-purpose grease" },
      active: true,
      warehouseId,
      createdAt: new Date(),
    };

    this.pmTemplates.set(pmTemplate1Id, pmTemplate1);
    this.pmTemplates.set(pmTemplate2Id, pmTemplate2);
    this.pmTemplates.set(pmTemplate3Id, pmTemplate3);
  }

  // Profile methods
  async getProfile(id: string): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }

  async getProfiles(): Promise<Profile[]> {
    return Array.from(this.profiles.values());
  }

  async getProfileByEmail(email: string): Promise<Profile | undefined> {
    return Array.from(this.profiles.values()).find(profile => profile.email === email);
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const id = this.generateId();
    const profile: Profile = {
      id,
      ...(insertProfile as any),
      createdAt: new Date(),
    };
    this.profiles.set(id, profile);
    return profile;
  }

  async updateProfile(id: string, updateProfile: Partial<InsertProfile>): Promise<Profile> {
    const existing = this.profiles.get(id);
    if (!existing) throw new Error('Profile not found');
    
    const updated: Profile = { ...existing, ...updateProfile };
    this.profiles.set(id, updated);
    return updated;
  }

  // Warehouse methods
  async getWarehouses(): Promise<Warehouse[]> {
    return Array.from(this.warehouses.values()).filter(w => w.active);
  }

  async getWarehouse(id: string): Promise<Warehouse | undefined> {
    return this.warehouses.get(id);
  }

  async createWarehouse(insertWarehouse: any): Promise<Warehouse> {
    const id = this.generateId();
    const warehouse: Warehouse = {
      id,
      ...insertWarehouse,
      active: insertWarehouse.active ?? true,
      createdAt: new Date(),
    };
    this.warehouses.set(id, warehouse);
    return warehouse;
  }

  // Equipment methods
  async getEquipment(warehouseId: string): Promise<Equipment[]> {
    return Array.from(this.equipment.values()).filter(e => e.warehouseId === warehouseId);
  }

  async getEquipmentById(id: string): Promise<Equipment | undefined> {
    return this.equipment.get(id);
  }

  async getEquipmentByAssetTag(assetTag: string): Promise<Equipment | undefined> {
    return Array.from(this.equipment.values()).find(e => e.assetTag === assetTag);
  }

  async createEquipment(insertEquipment: any): Promise<Equipment> {
    const id = insertEquipment.id || this.generateId();
    const equipment: Equipment = {
      id,
      ...insertEquipment,
      createdAt: new Date(),
    };
    this.equipment.set(id, equipment);
    return equipment;
  }

  async updateEquipment(id: string, updateEquipment: Partial<InsertEquipment>): Promise<Equipment> {
    const existing = this.equipment.get(id);
    if (!existing) throw new Error('Equipment not found');
    
    const updated: Equipment = { ...existing, ...updateEquipment };
    this.equipment.set(id, updated);
    return updated;
  }

  // Work Order methods
  async getWorkOrders(warehouseId: string, filters?: any): Promise<WorkOrder[]> {
    let workOrders = Array.from(this.workOrders.values()).filter(wo => wo.warehouseId === warehouseId);
    
    if (filters?.status) {
      workOrders = workOrders.filter(wo => filters.status.includes(wo.status));
    }
    if (filters?.assignedTo) {
      workOrders = workOrders.filter(wo => wo.assignedTo === filters.assignedTo);
    }
    if (filters?.priority) {
      workOrders = workOrders.filter(wo => filters.priority.includes(wo.priority));
    }
    
    return workOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getWorkOrder(id: string): Promise<WorkOrder | undefined> {
    return this.workOrders.get(id);
  }

  async createWorkOrder(insertWorkOrder: InsertWorkOrder): Promise<WorkOrder> {
    const id = (insertWorkOrder as any).id || this.generateId();
    const foNumber = (insertWorkOrder as any).foNumber || `WO-${String(this.workOrders.size + 1).padStart(3, '0')}`;
    const workOrder: WorkOrder = {
      id,
      foNumber,
      ...(insertWorkOrder as any),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.workOrders.set(id, workOrder);
    return workOrder;
  }

  async updateWorkOrder(id: string, updateWorkOrder: Partial<InsertWorkOrder>): Promise<WorkOrder> {
    const existing = this.workOrders.get(id);
    if (!existing) throw new Error('Work order not found');
    
    const updated: WorkOrder = { 
      ...existing, 
      ...updateWorkOrder,
      updatedAt: new Date(),
    };
    this.workOrders.set(id, updated);
    return updated;
  }

  async deleteWorkOrder(id: string): Promise<void> {
    const existing = this.workOrders.get(id);
    if (!existing) throw new Error('Work order not found');
    
    this.workOrders.delete(id);
  }

  async getWorkOrdersByAssignee(userId: string): Promise<WorkOrder[]> {
    return Array.from(this.workOrders.values())
      .filter(wo => wo.assignedTo === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Checklist items
  async getChecklistItems(workOrderId: string): Promise<WorkOrderChecklistItem[]> {
    return Array.from(this.checklistItems.values())
      .filter(item => item.workOrderId === workOrderId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createChecklistItem(item: Omit<WorkOrderChecklistItem, 'id' | 'createdAt'>): Promise<WorkOrderChecklistItem> {
    const id = this.generateId();
    const checklistItem: WorkOrderChecklistItem = {
      ...item,
      id,
      createdAt: new Date(),
    };
    this.checklistItems.set(id, checklistItem);
    return checklistItem;
  }

  async createWorkOrderChecklistItem(item: Omit<WorkOrderChecklistItem, 'id' | 'createdAt'>): Promise<WorkOrderChecklistItem> {
    return this.createChecklistItem(item);
  }

  async updateChecklistItem(id: string, item: Partial<WorkOrderChecklistItem>): Promise<WorkOrderChecklistItem> {
    const existing = this.checklistItems.get(id);
    if (!existing) throw new Error('Checklist item not found');
    
    const updated: WorkOrderChecklistItem = { ...existing, ...item };
    this.checklistItems.set(id, updated);
    return updated;
  }

  // Parts methods
  async getParts(warehouseId: string): Promise<Part[]> {
    return Array.from(this.parts.values()).filter(p => p.warehouseId === warehouseId && p.active);
  }

  async getPart(id: string): Promise<Part | undefined> {
    return this.parts.get(id);
  }

  async getPartByNumber(partNumber: string): Promise<Part | undefined> {
    return Array.from(this.parts.values()).find(p => p.partNumber === partNumber);
  }

  async createPart(insertPart: InsertPart): Promise<Part> {
    const id = this.generateId();
    const part: Part = {
      id,
      ...(insertPart as any),
      createdAt: new Date(),
    };
    this.parts.set(id, part);
    return part;
  }

  async updatePart(id: string, updatePart: Partial<InsertPart>): Promise<Part> {
    const existing = this.parts.get(id);
    if (!existing) throw new Error('Part not found');
    
    const updated: Part = { ...existing, ...updatePart };
    this.parts.set(id, updated);
    return updated;
  }

  async getPartsUsage(workOrderId: string): Promise<PartsUsage[]> {
    return Array.from(this.partsUsage.values()).filter(pu => pu.workOrderId === workOrderId);
  }

  async createPartsUsage(usage: Omit<PartsUsage, 'id' | 'createdAt'>): Promise<PartsUsage> {
    const id = this.generateId();
    const partsUsage: PartsUsage = {
      ...usage,
      id,
      createdAt: new Date(),
    };
    this.partsUsage.set(id, partsUsage);
    return partsUsage;
  }

  // Vendor methods
  async getVendors(warehouseId: string): Promise<Vendor[]> {
    return Array.from(this.vendors.values()).filter(v => v.warehouseId === warehouseId && v.active);
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    return this.vendors.get(id);
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const id = this.generateId();
    const vendor: Vendor = {
      id,
      ...(insertVendor as any),
      createdAt: new Date(),
    };
    this.vendors.set(id, vendor);
    return vendor;
  }

  // PM Template methods
  async getPmTemplates(warehouseId: string): Promise<PmTemplate[]> {
    return Array.from(this.pmTemplates.values()).filter(t => t.warehouseId === warehouseId && t.active);
  }

  async getPmTemplate(id: string): Promise<PmTemplate | null> {
    const template = this.pmTemplates.get(id);
    return template ? { ...template } : null;
  }

  async createPmTemplate(insertTemplate: InsertPmTemplate): Promise<PmTemplate> {
    const id = this.generateId();
    const template: PmTemplate = {
      id,
      ...(insertTemplate as any),
      createdAt: new Date(),
    };
    this.pmTemplates.set(id, template);
    return template;
  }

  async updatePmTemplate(id: string, updates: Partial<InsertPmTemplate>): Promise<PmTemplate | null> {
    const existing = this.pmTemplates.get(id);
    if (!existing) return null;
    
    const updated: PmTemplate = { ...existing, ...updates };
    this.pmTemplates.set(id, updated);
    return updated;
  }

  async deletePmTemplate(id: string): Promise<void> {
    this.pmTemplates.delete(id);
  }

  // Notification methods
  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.generateId();
    const notification: Notification = {
      id,
      ...(insertNotification as any),
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationRead(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
      this.notifications.set(id, notification);
    }
  }

  // Attachment methods
  async getAttachments(workOrderId?: string, equipmentId?: string): Promise<Attachment[]> {
    return Array.from(this.attachments.values()).filter(a => 
      (workOrderId && a.workOrderId === workOrderId) ||
      (equipmentId && a.equipmentId === equipmentId)
    );
  }

  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const id = this.generateId();
    const attachment: Attachment = {
      id,
      ...(insertAttachment as any),
      createdAt: new Date(),
    };
    this.attachments.set(id, attachment);
    return attachment;
  }

  // System log methods
  async createSystemLog(log: Omit<SystemLog, 'id' | 'createdAt'>): Promise<SystemLog> {
    const id = this.generateId();
    const systemLog: SystemLog = {
      ...log,
      id,
      createdAt: new Date(),
    };
    this.systemLogs.set(id, systemLog);
    return systemLog;
  }
}

// Fallback to in-memory storage if database connection fails
export const storage = new MemStorage();
