import { eq, and } from 'drizzle-orm';
import { db } from './db';
import { IStorage } from './storage';
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
  Profile,
  InsertProfile,
  Warehouse,
  InsertWarehouse,
  Equipment,
  InsertEquipment,
  WorkOrder,
  InsertWorkOrder,
  WorkOrderChecklistItem,
  Part,
  InsertPart,
  PartsUsage,
  Vendor,
  InsertVendor,
  PmTemplate,
  InsertPmTemplate,
  Notification,
  InsertNotification,
  Attachment,
  InsertAttachment,
  SystemLog,
} from '../shared/schema';

export class DatabaseStorage implements IStorage {
  private generateId(): string {
    return crypto.randomUUID();
  }

  // Initialize the database with sample data
  async initializeData(): Promise<void> {
    // Check if data already exists
    const existingWarehouses = await db.select().from(warehouses).limit(1);
    if (existingWarehouses.length > 0) {
      return; // Data already exists
    }

    // Create sample warehouse
    const [warehouse] = await db.insert(warehouses).values({
      id: this.generateId(),
      name: 'Main Warehouse',
      address: '123 Industrial Way, Manufacturing City, MC 12345',
      timezone: 'America/New_York',
      operatingHoursStart: '07:00',
      operatingHoursEnd: '19:00',
      emergencyContact: '+1-555-0199',
      active: true,
    } as any).returning();

    // Create sample users
    const users = [
      {
        id: this.generateId(),
        email: 'supervisor@company.com',
        firstName: 'John',
        lastName: 'Smith',
        role: 'supervisor' as const,
        warehouseId: warehouse.id,
        active: true,
      },
      {
        id: this.generateId(),
        email: 'technician@company.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'technician' as const,
        warehouseId: warehouse.id,
        active: true,
      },
      {
        id: this.generateId(),
        email: 'manager@company.com',
        firstName: 'Mike',
        lastName: 'Johnson',
        role: 'manager' as const,
        warehouseId: warehouse.id,
        active: true,
      },
    ];

    const insertedUsers = await db.insert(profiles).values(users).returning();

    // Create sample equipment
    const equipmentList = [
      {
        id: this.generateId(),
        assetTag: 'PUMP-001',
        description: 'Centrifugal Water Pump',
        area: 'Production Floor A',
        model: 'WP-500',
        status: 'active' as const,
        criticality: 'high' as const,
        warehouseId: warehouse.id,
        specifications: {},
        installationDate: new Date('2020-01-15'),
        lastMaintenanceDate: new Date('2024-11-15'),
        nextMaintenanceDate: new Date('2025-02-15'),
        warrantyExpiration: new Date('2025-01-15'),
      },
      {
        id: this.generateId(),
        assetTag: 'CONV-002',
        description: 'Conveyor Belt System',
        area: 'Packaging Line 1',
        model: 'CB-1200',
        status: 'active' as const,
        criticality: 'medium' as const,
        warehouseId: warehouse.id,
        specifications: {},
        installationDate: new Date('2021-03-10'),
        lastMaintenanceDate: new Date('2024-12-01'),
        nextMaintenanceDate: new Date('2025-03-01'),
        warrantyExpiration: new Date('2026-03-10'),
      },
    ];

    const insertedEquipment = await db.insert(equipment).values(equipmentList).returning();

    // Create sample parts
    const partsList = [
      {
        id: this.generateId(),
        partNumber: 'SEAL-001',
        description: 'Pump Seal Kit',
        category: 'Seals & Gaskets',
        location: 'Aisle A, Shelf 3',
        unitOfMeasure: 'EA',
        unitCost: '45.99',
        stockLevel: 12,
        reorderPoint: 5,
        maxStock: 25,
        vendor: 'Industrial Supply Co',
        warehouseId: warehouse.id,
        active: true,
      },
      {
        id: this.generateId(),
        partNumber: 'BELT-002',
        description: 'Conveyor Belt',
        category: 'Belts',
        location: 'Aisle B, Shelf 1',
        unitOfMeasure: 'FT',
        unitCost: '12.50',
        stockLevel: 3,
        reorderPoint: 10,
        maxStock: 50,
        vendor: 'Belt Solutions Inc',
        warehouseId: warehouse.id,
        active: true,
      },
    ];

    await db.insert(parts).values(partsList).returning();

    // Create sample notifications
    const notificationsList = [
      {
        id: this.generateId(),
        userId: insertedUsers[0].id,
        type: 'wo_assigned' as const,
        title: 'New Work Order Assigned',
        message: 'Work order WO-001 has been assigned to you',
        read: false,
        workOrderId: null,
        equipmentId: null,
        partId: null,
      },
      {
        id: this.generateId(),
        userId: insertedUsers[1].id,
        type: 'part_low_stock' as const,
        title: 'Low Stock Alert',
        message: 'Conveyor Belt stock is below reorder point',
        read: false,
        workOrderId: null,
        equipmentId: null,
        partId: null,
      },
    ];

    await db.insert(notifications).values(notificationsList).returning();

    console.log('Database initialized with sample data');
  }

  // Profiles
  async getProfile(id: string): Promise<Profile | undefined> {
    const result = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    return result[0];
  }

  async getProfileByEmail(email: string): Promise<Profile | undefined> {
    const result = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
    return result[0];
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const newProfile = {
      id: this.generateId(),
      ...(profile as any),
      createdAt: new Date(),
    };
    const [created] = await db.insert(profiles).values(newProfile).returning();
    return created;
  }

  async updateProfile(id: string, profile: Partial<InsertProfile>): Promise<Profile> {
    const [updated] = await db.update(profiles)
      .set(profile)
      .where(eq(profiles.id, id))
      .returning();
    return updated;
  }

  async getProfiles(): Promise<Profile[]> {
    return await db.select().from(profiles);
  }

  // Warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    return await db.select().from(warehouses);
  }

  async getWarehouse(id: string): Promise<Warehouse | undefined> {
    const result = await db.select().from(warehouses).where(eq(warehouses.id, id)).limit(1);
    return result[0];
  }

  async createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse> {
    const newWarehouse = {
      id: this.generateId(),
      ...(warehouse as any),
      createdAt: new Date(),
    };
    const [created] = await db.insert(warehouses).values(newWarehouse).returning();
    return created;
  }

  // Equipment
  async getEquipment(warehouseId: string): Promise<Equipment[]> {
    return await db.select().from(equipment).where(eq(equipment.warehouseId, warehouseId));
  }

  async getEquipmentById(id: string): Promise<Equipment | undefined> {
    const result = await db.select().from(equipment).where(eq(equipment.id, id)).limit(1);
    return result[0];
  }

  async getEquipmentByAssetTag(assetTag: string): Promise<Equipment | undefined> {
    const result = await db.select().from(equipment).where(eq(equipment.assetTag, assetTag)).limit(1);
    return result[0];
  }

  async createEquipment(equipmentData: InsertEquipment): Promise<Equipment> {
    const newEquipment = {
      id: this.generateId(),
      ...(equipmentData as any),
      createdAt: new Date(),
    };
    const [created] = await db.insert(equipment).values(newEquipment).returning();
    return created;
  }

  async updateEquipment(id: string, equipmentData: Partial<InsertEquipment>): Promise<Equipment> {
    const [updated] = await db.update(equipment)
      .set(equipmentData)
      .where(eq(equipment.id, id))
      .returning();
    return updated;
  }

  // Work Orders
  async getWorkOrders(warehouseId: string, filters?: any): Promise<WorkOrder[]> {
    return await db.select().from(workOrders).where(eq(workOrders.warehouseId, warehouseId));
  }

  async getWorkOrder(id: string): Promise<WorkOrder | undefined> {
    const result = await db.select().from(workOrders).where(eq(workOrders.id, id)).limit(1);
    return result[0];
  }

  async createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder> {
    const newWorkOrder = {
      id: this.generateId(),
      ...(workOrder as any),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [created] = await db.insert(workOrders).values(newWorkOrder).returning();
    return created;
  }

  async updateWorkOrder(id: string, workOrder: Partial<InsertWorkOrder>): Promise<WorkOrder> {
    const updateData = {
      ...(workOrder as any),
      updatedAt: new Date(),
    };
    const [updated] = await db.update(workOrders)
      .set(updateData)
      .where(eq(workOrders.id, id))
      .returning();
    return updated;
  }

  async getWorkOrdersByAssignee(userId: string): Promise<WorkOrder[]> {
    return await db.select().from(workOrders).where(eq(workOrders.assignedTo, userId));
  }

  // Work Order Checklist Items
  async getChecklistItems(workOrderId: string): Promise<WorkOrderChecklistItem[]> {
    return await db.select().from(workOrderChecklistItems)
      .where(eq(workOrderChecklistItems.workOrderId, workOrderId));
  }

  async createChecklistItem(item: Omit<WorkOrderChecklistItem, 'id' | 'createdAt'>): Promise<WorkOrderChecklistItem> {
    const newItem = {
      ...item,
      id: this.generateId(),
      createdAt: new Date(),
    };
    const [created] = await db.insert(workOrderChecklistItems).values(newItem).returning();
    return created;
  }

  async updateChecklistItem(id: string, item: Partial<WorkOrderChecklistItem>): Promise<WorkOrderChecklistItem> {
    const [updated] = await db.update(workOrderChecklistItems)
      .set(item)
      .where(eq(workOrderChecklistItems.id, id))
      .returning();
    return updated;
  }

  async createWorkOrderChecklistItem(item: Omit<WorkOrderChecklistItem, 'id' | 'createdAt'>): Promise<WorkOrderChecklistItem> {
    return this.createChecklistItem(item);
  }

  // Parts
  async getParts(warehouseId: string): Promise<Part[]> {
    return await db.select().from(parts).where(eq(parts.warehouseId, warehouseId));
  }

  async getPart(id: string): Promise<Part | undefined> {
    const result = await db.select().from(parts).where(eq(parts.id, id)).limit(1);
    return result[0];
  }

  async getPartByNumber(partNumber: string): Promise<Part | undefined> {
    const result = await db.select().from(parts).where(eq(parts.partNumber, partNumber)).limit(1);
    return result[0];
  }

  async createPart(part: InsertPart): Promise<Part> {
    const newPart = {
      id: this.generateId(),
      ...(part as any),
      createdAt: new Date(),
    };
    const [created] = await db.insert(parts).values(newPart).returning();
    return created;
  }

  async updatePart(id: string, part: Partial<InsertPart>): Promise<Part> {
    const [updated] = await db.update(parts)
      .set(part)
      .where(eq(parts.id, id))
      .returning();
    return updated;
  }

  async getPartsUsage(workOrderId: string): Promise<PartsUsage[]> {
    return await db.select().from(partsUsage).where(eq(partsUsage.workOrderId, workOrderId));
  }

  async createPartsUsage(usage: Omit<PartsUsage, 'id' | 'createdAt'>): Promise<PartsUsage> {
    const newUsage = {
      ...usage,
      id: this.generateId(),
      createdAt: new Date(),
    };
    const [created] = await db.insert(partsUsage).values(newUsage).returning();
    return created;
  }

  // Vendors
  async getVendors(warehouseId: string): Promise<Vendor[]> {
    return await db.select().from(vendors).where(eq(vendors.warehouseId, warehouseId));
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const result = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
    return result[0];
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const newVendor = {
      id: this.generateId(),
      ...(vendor as any),
      createdAt: new Date(),
    };
    const [created] = await db.insert(vendors).values(newVendor).returning();
    return created;
  }

  // PM Templates
  async getPmTemplates(warehouseId: string): Promise<PmTemplate[]> {
    return await db.select().from(pmTemplates).where(eq(pmTemplates.warehouseId, warehouseId));
  }

  async getPmTemplate(id: string): Promise<PmTemplate | undefined> {
    const result = await db.select().from(pmTemplates).where(eq(pmTemplates.id, id)).limit(1);
    return result[0];
  }

  async createPmTemplate(template: InsertPmTemplate): Promise<PmTemplate> {
    const newTemplate = {
      id: this.generateId(),
      ...(template as any),
      createdAt: new Date(),
    };
    const [created] = await db.insert(pmTemplates).values(newTemplate).returning();
    return created;
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const newNotification = {
      id: this.generateId(),
      ...(notification as any),
      createdAt: new Date(),
    };
    const [created] = await db.insert(notifications).values(newNotification).returning();
    return created;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications)
      .set({ read: true } as any)
      .where(eq(notifications.id, id));
  }

  // Attachments
  async getAttachments(workOrderId?: string, equipmentId?: string): Promise<Attachment[]> {
    let query = db.select().from(attachments);
    
    if (workOrderId) {
      query = query.where(eq(attachments.workOrderId, workOrderId)) as any;
    } else if (equipmentId) {
      query = query.where(eq(attachments.equipmentId, equipmentId)) as any;
    }
    
    return await query;
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const newAttachment = {
      id: this.generateId(),
      ...(attachment as any),
      createdAt: new Date(),
    };
    const [created] = await db.insert(attachments).values(newAttachment).returning();
    return created;
  }

  // System Logs
  async createSystemLog(log: Omit<SystemLog, 'id' | 'createdAt'>): Promise<SystemLog> {
    const newLog = {
      ...log,
      id: this.generateId(),
      createdAt: new Date(),
    };
    const [created] = await db.insert(systemLogs).values(newLog).returning();
    return created;
  }
}