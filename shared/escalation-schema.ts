import { pgTable, text, integer, boolean, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { profiles, warehouses, workOrders } from "./schema";

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

// Schema exports
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
export type EscalationRule = typeof escalationRules.$inferSelect;
export type InsertEscalationRule = z.infer<typeof insertEscalationRuleSchema>;

export type EscalationHistory = typeof escalationHistory.$inferSelect;
export type InsertEscalationHistory = z.infer<typeof insertEscalationHistorySchema>;

export type JobQueue = typeof jobQueue.$inferSelect;
export type InsertJobQueue = z.infer<typeof insertJobQueueSchema>;
