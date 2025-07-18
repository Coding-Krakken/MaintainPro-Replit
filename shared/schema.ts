import { pgTable, text, serial, integer, boolean, timestamp, uuid, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users and Authentication
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().$type<'technician' | 'supervisor' | 'manager' | 'admin' | 'inventory_clerk' | 'contractor' | 'requester'>(),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Warehouses
export const warehouses = pgTable("warehouses", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  timezone: text("timezone").default("UTC"),
  operatingHoursStart: text("operating_hours_start").default("08:00"),
  operatingHoursEnd: text("operating_hours_end").default("17:00"),
  emergencyContact: text("emergency_contact"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Equipment
export const equipment = pgTable("equipment", {
  id: uuid("id").primaryKey(),
  assetTag: text("asset_tag").notNull().unique(),
  model: text("model").notNull(),
  description: text("description"),
  area: text("area"),
  status: text("status").notNull().$type<'active' | 'inactive' | 'maintenance' | 'retired'>(),
  criticality: text("criticality").notNull().$type<'low' | 'medium' | 'high' | 'critical'>(),
  installDate: timestamp("install_date"),
  warrantyExpiry: timestamp("warranty_expiry"),
  manufacturer: text("manufacturer"),
  serialNumber: text("serial_number"),
  specifications: jsonb("specifications"),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Work Orders
export const workOrders = pgTable("work_orders", {
  id: uuid("id").primaryKey(),
  foNumber: text("fo_number").notNull().unique(),
  type: text("type").notNull().$type<'corrective' | 'preventive' | 'emergency'>(),
  description: text("description").notNull(),
  area: text("area"),
  assetModel: text("asset_model"),
  status: text("status").notNull().$type<'new' | 'assigned' | 'in_progress' | 'completed' | 'verified' | 'closed'>(),
  priority: text("priority").notNull().$type<'low' | 'medium' | 'high' | 'critical'>(),
  requestedBy: uuid("requested_by").references(() => profiles.id).notNull(),
  assignedTo: uuid("assigned_to").references(() => profiles.id),
  equipmentId: uuid("equipment_id").references(() => equipment.id),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  verifiedBy: uuid("verified_by").references(() => profiles.id),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),
  notes: text("notes"),
  followUp: boolean("follow_up").default(false),
  escalated: boolean("escalated").default(false),
  escalationLevel: integer("escalation_level").default(0),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work Order Checklist Items
export const workOrderChecklistItems = pgTable("work_order_checklist_items", {
  id: uuid("id").primaryKey(),
  workOrderId: uuid("work_order_id").references(() => workOrders.id).notNull(),
  component: text("component").notNull(),
  action: text("action").notNull(),
  status: text("status").$type<'pending' | 'done' | 'skipped' | 'issue'>().default('pending'),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Parts Inventory
export const parts = pgTable("parts", {
  id: uuid("id").primaryKey(),
  partNumber: text("part_number").notNull().unique(),
  description: text("description").notNull(),
  category: text("category"),
  unitOfMeasure: text("unit_of_measure").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  stockLevel: integer("stock_level").default(0),
  reorderPoint: integer("reorder_point").default(0),
  maxStock: integer("max_stock"),
  location: text("location"),
  vendor: text("vendor"),
  active: boolean("active").default(true),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Parts Usage (for work orders)
export const partsUsage = pgTable("parts_usage", {
  id: uuid("id").primaryKey(),
  workOrderId: uuid("work_order_id").references(() => workOrders.id).notNull(),
  partId: uuid("part_id").references(() => parts.id).notNull(),
  quantityUsed: integer("quantity_used").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  usedBy: uuid("used_by").references(() => profiles.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendors
export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().$type<'supplier' | 'contractor'>(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  contactPerson: text("contact_person"),
  active: boolean("active").default(true),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// PM Templates
export const pmTemplates = pgTable("pm_templates", {
  id: uuid("id").primaryKey(),
  model: text("model").notNull(),
  component: text("component").notNull(),
  action: text("action").notNull(),
  description: text("description"),
  estimatedDuration: integer("estimated_duration").default(60),
  frequency: text("frequency").notNull().$type<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'>(),
  customFields: jsonb("custom_fields"),
  active: boolean("active").default(true),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  type: text("type").notNull().$type<'wo_assigned' | 'wo_overdue' | 'part_low_stock' | 'pm_due' | 'equipment_alert'>(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  workOrderId: uuid("work_order_id").references(() => workOrders.id),
  equipmentId: uuid("equipment_id").references(() => equipment.id),
  partId: uuid("part_id").references(() => parts.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// File Attachments
export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  fileType: text("file_type"),
  workOrderId: uuid("work_order_id").references(() => workOrders.id),
  equipmentId: uuid("equipment_id").references(() => equipment.id),
  uploadedBy: uuid("uploaded_by").references(() => profiles.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// System Logs (Audit Trail)
export const systemLogs = pgTable("system_logs", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => profiles.id),
  action: text("action").notNull(),
  tableName: text("table_name"),
  recordId: uuid("record_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema exports for forms
export const insertProfileSchema = createInsertSchema(profiles);

export const insertWarehouseSchema = createInsertSchema(warehouses);

export const insertEquipmentSchema = createInsertSchema(equipment);

// Enhanced work order schema with proper validation
export const insertWorkOrderSchema = createInsertSchema(workOrders, {
  type: z.enum(['corrective', 'preventive', 'emergency']),
  status: z.enum(['new', 'assigned', 'in_progress', 'completed', 'verified', 'closed']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  foNumber: z.string().min(1, 'FO Number is required'),
  description: z.string().min(1, 'Description is required'),
}).extend({
  area: z.string().optional(),
  assetModel: z.string().optional(),
  notes: z.string().optional(),
  estimatedHours: z.string().optional(),
  actualHours: z.string().optional(),
  requestedBy: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  equipmentId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  dueDate: z.union([z.string(), z.date()]).optional(),
  escalated: z.boolean().optional(),
  escalationLevel: z.number().optional(),
  followUp: z.boolean().optional(),
  updatedAt: z.date().optional(),
});

export const insertPartSchema = createInsertSchema(parts);

// Enhanced vendor schema with proper validation
export const insertVendorSchema = createInsertSchema(vendors, {
  type: z.enum(['supplier', 'contractor']),
  name: z.string().min(1, 'Name is required'),
});

export const insertPmTemplateSchema = createInsertSchema(pmTemplates);

export const insertNotificationSchema = createInsertSchema(notifications);

export const insertAttachmentSchema = createInsertSchema(attachments);

// Type exports
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;

export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;

export type WorkOrderChecklistItem = typeof workOrderChecklistItems.$inferSelect;

export type Part = typeof parts.$inferSelect;
export type InsertPart = z.infer<typeof insertPartSchema>;

export type PartsUsage = typeof partsUsage.$inferSelect;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type PmTemplate = typeof pmTemplates.$inferSelect;
export type InsertPmTemplate = z.infer<typeof insertPmTemplateSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

export type SystemLog = typeof systemLogs.$inferSelect;
