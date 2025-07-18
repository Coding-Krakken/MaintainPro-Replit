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
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  phoneNumber: text("phone_number"),
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Authentication Credentials
export const userCredentials = pgTable("user_credentials", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  mustChangePassword: boolean("must_change_password").default(false),
  passwordExpiresAt: timestamp("password_expires_at"),
  previousPasswords: jsonb("previous_passwords"), // Store hashes of last 5 passwords
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Sessions
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  sessionToken: text("session_token").notNull().unique(),
  refreshToken: text("refresh_token").notNull().unique(),
  deviceInfo: jsonb("device_info"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Multi-Factor Authentication
export const userMfa = pgTable("user_mfa", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  type: text("type").notNull().$type<'totp' | 'sms' | 'email'>(),
  secret: text("secret").notNull(), // Encrypted TOTP secret or phone/email
  isEnabled: boolean("is_enabled").default(false),
  backupCodes: jsonb("backup_codes"), // Encrypted backup codes
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Security Audit Logs
export const securityAuditLogs = pgTable("security_audit_logs", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => profiles.id),
  sessionId: uuid("session_id").references(() => userSessions.id),
  action: text("action").notNull(),
  resource: text("resource"),
  resourceId: text("resource_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  riskLevel: text("risk_level").$type<'low' | 'medium' | 'high' | 'critical'>().default('low'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Role Permissions
export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey(),
  role: text("role").notNull().$type<'technician' | 'supervisor' | 'manager' | 'admin' | 'inventory_clerk' | 'contractor' | 'requester'>(),
  resource: text("resource").notNull(), // e.g., 'work_orders', 'equipment', 'parts'
  action: text("action").notNull(), // e.g., 'create', 'read', 'update', 'delete'
  allowed: boolean("allowed").notNull().default(false),
  conditions: jsonb("conditions"), // Optional conditions for permission
  createdAt: timestamp("created_at").defaultNow(),
});

// API Rate Limiting
export const rateLimits = pgTable("rate_limits", {
  id: uuid("id").primaryKey(),
  identifier: text("identifier").notNull(), // IP address or user ID
  endpoint: text("endpoint").notNull(),
  requestCount: integer("request_count").default(0),
  windowStart: timestamp("window_start").defaultNow(),
  blockedUntil: timestamp("blocked_until"),
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

// Escalation Rules
export const escalationRules = pgTable("escalation_rules", {
  id: uuid("id").primaryKey(),
  workOrderType: text("work_order_type").notNull().$type<'corrective' | 'preventive' | 'emergency'>(),
  priority: text("priority").notNull().$type<'low' | 'medium' | 'high' | 'critical'>(),
  timeoutHours: integer("timeout_hours").notNull(),
  escalationAction: text("escalation_action").notNull().$type<'notify_supervisor' | 'notify_manager' | 'auto_reassign'>(),
  escalateTo: uuid("escalate_to").references(() => profiles.id),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Escalation History
export const escalationHistory = pgTable("escalation_history", {
  id: uuid("id").primaryKey(),
  workOrderId: uuid("work_order_id").references(() => workOrders.id).notNull(),
  ruleId: uuid("rule_id").references(() => escalationRules.id),
  escalationLevel: integer("escalation_level").notNull(),
  escalatedFrom: uuid("escalated_from").references(() => profiles.id),
  escalatedTo: uuid("escalated_to").references(() => profiles.id),
  action: text("action").notNull(),
  reason: text("reason"),
  escalatedAt: timestamp("escalated_at").defaultNow(),
});

// Job Queue for background processing
export const jobQueue = pgTable("job_queue", {
  id: uuid("id").primaryKey(),
  jobType: text("job_type").notNull().$type<'escalation_check' | 'pm_generation' | 'notification_send'>(),
  payload: jsonb("payload"),
  status: text("status").notNull().$type<'pending' | 'processing' | 'completed' | 'failed'>().default('pending'),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  scheduledAt: timestamp("scheduled_at"),
  processedAt: timestamp("processed_at"),
  failedAt: timestamp("failed_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema exports for forms
export const insertProfileSchema = createInsertSchema(profiles);
export const insertUserCredentialsSchema = createInsertSchema(userCredentials);
export const insertUserSessionSchema = createInsertSchema(userSessions);
export const insertUserMfaSchema = createInsertSchema(userMfa);
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);
export const insertSecurityAuditLogSchema = createInsertSchema(securityAuditLogs);
export const insertRolePermissionSchema = createInsertSchema(rolePermissions);
export const insertRateLimitSchema = createInsertSchema(rateLimits);

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

// Escalation rule schema
export const insertEscalationRuleSchema = createInsertSchema(escalationRules, {
  workOrderType: z.enum(['corrective', 'preventive', 'emergency']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  escalationAction: z.enum(['notify_supervisor', 'notify_manager', 'auto_reassign']),
  timeoutHours: z.number().min(1, 'Timeout must be at least 1 hour'),
});

export const insertEscalationHistorySchema = createInsertSchema(escalationHistory);

export const insertJobQueueSchema = createInsertSchema(jobQueue, {
  jobType: z.enum(['escalation_check', 'pm_generation', 'notification_send']),
});

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

export type EscalationRule = typeof escalationRules.$inferSelect;
export type InsertEscalationRule = z.infer<typeof insertEscalationRuleSchema>;

export type EscalationHistory = typeof escalationHistory.$inferSelect;
export type InsertEscalationHistory = z.infer<typeof insertEscalationHistorySchema>;

export type JobQueue = typeof jobQueue.$inferSelect;
export type InsertJobQueue = z.infer<typeof insertJobQueueSchema>;
