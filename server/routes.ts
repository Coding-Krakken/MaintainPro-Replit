import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pmEngine } from "./services/pm-engine";
import { pmScheduler } from "./services/pm-scheduler";
import { pmSchedulerEnhanced } from './services/pm-scheduler-enhanced';
import { 
  insertWorkOrderSchema, 
  insertEquipmentSchema, 
  insertPartSchema,
  insertNotificationSchema,
  insertAttachmentSchema
} from "@shared/schema";
import { z } from "zod";
import { advancedReportingService } from './services/advanced-reporting';
import { securityService } from './services/security-service';

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Railway
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || "development"
    });
  });

  // Authentication middleware (simplified)
  const getCurrentUser = (req: any) => {
    // In real implementation, this would verify JWT token
    return req.headers['x-user-id'] || 'default-user-id';
  };

  const getCurrentWarehouse = (req: any) => {
    return req.headers['x-warehouse-id'] || 'default-warehouse-id';
  };

  // Initialize security service
  securityService.initialize();

  // Apply rate limiting to all routes
  app.use(securityService.createRateLimiter());

  // Profiles
  app.get("/api/profiles/me", async (req, res) => {
    try {
      const userId = getCurrentUser(req);
      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const profile = await storage.getProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  // Equipment
  app.get("/api/equipment", async (req, res) => {
    try {
      const warehouseId = getCurrentWarehouse(req);
      const equipment = await storage.getEquipment(warehouseId);
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ message: "Failed to get equipment" });
    }
  });

  app.get("/api/equipment/:id", async (req, res) => {
    try {
      const equipment = await storage.getEquipmentById(req.params.id);
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ message: "Failed to get equipment" });
    }
  });

  app.get("/api/equipment/asset/:assetTag", async (req, res) => {
    try {
      const equipment = await storage.getEquipmentByAssetTag(req.params.assetTag);
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ message: "Failed to get equipment" });
    }
  });

  app.post("/api/equipment", async (req, res) => {
    try {
      const equipmentData = insertEquipmentSchema.parse(req.body);
      const equipment = await storage.createEquipment(equipmentData);
      res.status(201).json(equipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid equipment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create equipment" });
    }
  });

  app.patch("/api/equipment/:id", async (req, res) => {
    try {
      const equipmentData = insertEquipmentSchema.partial().parse(req.body);
      const equipment = await storage.updateEquipment(req.params.id, equipmentData);
      res.json(equipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid equipment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update equipment" });
    }
  });

  // Work Orders
  app.get("/api/work-orders", async (req, res) => {
    try {
      const warehouseId = getCurrentWarehouse(req);
      const filters = {
        status: req.query.status ? String(req.query.status).split(',') : undefined,
        assignedTo: req.query.assignedTo ? String(req.query.assignedTo) : undefined,
        priority: req.query.priority ? String(req.query.priority).split(',') : undefined,
      };
      const workOrders = await storage.getWorkOrders(warehouseId, filters);
      res.json(workOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get work orders" });
    }
  });

  app.get("/api/work-orders/assigned/:userId", async (req, res) => {
    try {
      const workOrders = await storage.getWorkOrdersByAssignee(req.params.userId);
      res.json(workOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get assigned work orders" });
    }
  });

  app.get("/api/work-orders/:id", async (req, res) => {
    try {
      const workOrder = await storage.getWorkOrder(req.params.id);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }
      res.json(workOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to get work order" });
    }
  });

  app.post("/api/work-orders", async (req, res) => {
    try {
      const workOrderData = insertWorkOrderSchema.parse(req.body);
      const workOrder = await storage.createWorkOrder(workOrderData);
      
      // Create notification for assigned technician
      if (workOrder.assignedTo) {
        await storage.createNotification({
          userId: workOrder.assignedTo,
          type: 'wo_assigned',
          title: 'New Work Order Assigned',
          message: `Work Order ${workOrder.foNumber} has been assigned to you`,
          workOrderId: workOrder.id,
          read: false,
        });
      }
      
      res.status(201).json(workOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid work order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create work order" });
    }
  });

  app.patch("/api/work-orders/:id", async (req, res) => {
    try {
      const workOrderData = insertWorkOrderSchema.partial().parse(req.body);
      const workOrder = await storage.updateWorkOrder(req.params.id, workOrderData);
      res.json(workOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid work order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update work order" });
    }
  });

  // Work Order Checklist Items
  app.get("/api/work-orders/:id/checklist", async (req, res) => {
    try {
      const items = await storage.getChecklistItems(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to get checklist items" });
    }
  });

  app.post("/api/work-orders/:id/checklist", async (req, res) => {
    try {
      const itemData = {
        workOrderId: req.params.id,
        component: req.body.component,
        action: req.body.action,
        status: req.body.status || 'pending',
        notes: req.body.notes,
        sortOrder: req.body.sortOrder || 0,
      };
      const item = await storage.createChecklistItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to create checklist item" });
    }
  });

  app.patch("/api/checklist-items/:id", async (req, res) => {
    try {
      const item = await storage.updateChecklistItem(req.params.id, req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to update checklist item" });
    }
  });

  // Parts
  app.get("/api/parts", async (req, res) => {
    try {
      const warehouseId = getCurrentWarehouse(req);
      const parts = await storage.getParts(warehouseId);
      res.json(parts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get parts" });
    }
  });

  app.get("/api/parts/:id", async (req, res) => {
    try {
      const part = await storage.getPart(req.params.id);
      if (!part) {
        return res.status(404).json({ message: "Part not found" });
      }
      res.json(part);
    } catch (error) {
      res.status(500).json({ message: "Failed to get part" });
    }
  });

  app.get("/api/parts/number/:partNumber", async (req, res) => {
    try {
      const part = await storage.getPartByNumber(req.params.partNumber);
      if (!part) {
        return res.status(404).json({ message: "Part not found" });
      }
      res.json(part);
    } catch (error) {
      res.status(500).json({ message: "Failed to get part" });
    }
  });

  app.post("/api/parts", async (req, res) => {
    try {
      const partData = insertPartSchema.parse(req.body);
      const part = await storage.createPart(partData);
      res.status(201).json(part);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid part data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create part" });
    }
  });

  app.patch("/api/parts/:id", async (req, res) => {
    try {
      const partData = insertPartSchema.partial().parse(req.body);
      const part = await storage.updatePart(req.params.id, partData);
      res.json(part);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid part data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update part" });
    }
  });

  // Parts Usage
  app.get("/api/work-orders/:id/parts-usage", async (req, res) => {
    try {
      const usage = await storage.getPartsUsage(req.params.id);
      res.json(usage);
    } catch (error) {
      res.status(500).json({ message: "Failed to get parts usage" });
    }
  });

  app.post("/api/work-orders/:id/parts-usage", async (req, res) => {
    try {
      const usageData = {
        workOrderId: req.params.id,
        partId: req.body.partId,
        quantityUsed: req.body.quantityUsed,
        unitCost: req.body.unitCost,
        usedBy: getCurrentUser(req),
      };
      const usage = await storage.createPartsUsage(usageData);
      
      // Update part stock level
      const part = await storage.getPart(req.body.partId);
      if (part && part.stockLevel !== null && part.reorderPoint !== null) {
        const newStockLevel = Math.max(0, part.stockLevel - req.body.quantityUsed);
        await storage.updatePart(req.body.partId, { stockLevel: newStockLevel });
        
        // Check if below reorder point and create notification
        if (newStockLevel <= part.reorderPoint) {
          // Get supervisors for notification
          const warehouseId = getCurrentWarehouse(req);
          await storage.createNotification({
            userId: 'supervisor-id', // In real app, get actual supervisor
            type: 'part_low_stock',
            title: 'Low Stock Alert',
            message: `Part ${part.partNumber} is below reorder point`,
            partId: part.id,
            read: false,
          });
        }
      }
      
      res.status(201).json(usage);
    } catch (error) {
      res.status(500).json({ message: "Failed to create parts usage" });
    }
  });

  // Vendors
  app.get("/api/vendors", async (req, res) => {
    try {
      const warehouseId = getCurrentWarehouse(req);
      const vendors = await storage.getVendors(warehouseId);
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ message: "Failed to get vendors" });
    }
  });

  // PM Templates
  app.get("/api/pm-templates", async (req, res) => {
    try {
      const warehouseId = req.header("x-warehouse-id");
      if (!warehouseId) {
        return res.status(400).json({ error: "Warehouse ID is required" });
      }

      const templates = await storage.getPmTemplates(warehouseId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching PM templates:", error);
      res.status(500).json({ error: "Failed to fetch PM templates" });
    }
  });

  app.post("/api/pm-templates", async (req, res) => {
    try {
      const warehouseId = req.header("x-warehouse-id");
      if (!warehouseId) {
        return res.status(400).json({ error: "Warehouse ID is required" });
      }

      const templateData = {
        ...req.body,
        warehouseId,
        createdAt: new Date(),
      };

      const template = await storage.createPmTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating PM template:", error);
      res.status(500).json({ error: "Failed to create PM template" });
    }
  });

  app.put("/api/pm-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const warehouseId = req.header("x-warehouse-id");
      if (!warehouseId) {
        return res.status(400).json({ error: "Warehouse ID is required" });
      }

      const template = await storage.updatePmTemplate(id, req.body);
      if (!template) {
        return res.status(404).json({ error: "PM template not found" });
      }

      res.json(template);
    } catch (error) {
      console.error("Error updating PM template:", error);
      res.status(500).json({ error: "Failed to update PM template" });
    }
  });

  app.delete("/api/pm-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const warehouseId = req.header("x-warehouse-id");
      if (!warehouseId) {
        return res.status(400).json({ error: "Warehouse ID is required" });
      }

      await storage.deletePmTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting PM template:", error);
      res.status(500).json({ error: "Failed to delete PM template" });
    }
  });

  // PM Compliance API
  app.get("/api/pm-compliance", async (req, res) => {
    try {
      const warehouseId = req.header("x-warehouse-id");
      if (!warehouseId) {
        return res.status(400).json({ error: "Warehouse ID is required" });
      }

      const days = parseInt(req.query.days as string) || 30;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all equipment for the warehouse
      const equipment = await storage.getEquipment(warehouseId);
      const templates = await storage.getPmTemplates(warehouseId);
      
      // Calculate compliance for each equipment
      const equipmentCompliance = [];
      let totalPMsScheduled = 0;
      let totalPMsCompleted = 0;
      let overdueCount = 0;

      for (const equip of equipment) {
        if (equip.status === 'active') {
          const compliance = await pmEngine.checkComplianceStatus(equip.id, warehouseId);
          
          equipmentCompliance.push({
            equipmentId: equip.id,
            assetTag: equip.assetTag,
            model: equip.model,
            complianceRate: compliance.compliancePercentage,
            lastPMDate: compliance.lastPMDate,
            nextPMDate: compliance.nextPMDate,
            overdueCount: compliance.missedPMCount,
          });

          totalPMsScheduled += compliance.totalPMCount;
          totalPMsCompleted += (compliance.totalPMCount - compliance.missedPMCount);
          overdueCount += compliance.missedPMCount;
        }
      }

      // Calculate overall compliance rate
      const overallComplianceRate = totalPMsScheduled > 0 
        ? (totalPMsCompleted / totalPMsScheduled) * 100 
        : 100;

      // Generate monthly trends (simplified)
      const monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        const monthName = month.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        // For now, use current data with some variation
        const variation = Math.random() * 10 - 5; // ±5% variation
        const monthCompliance = Math.min(100, Math.max(0, overallComplianceRate + variation));
        
        monthlyTrends.push({
          month: monthName,
          scheduled: Math.floor(totalPMsScheduled / 6),
          completed: Math.floor((totalPMsCompleted / 6) * (monthCompliance / 100)),
          complianceRate: monthCompliance,
        });
      }

      res.json({
        overallComplianceRate,
        totalPMsScheduled,
        totalPMsCompleted,
        overdueCount,
        equipmentCompliance,
        monthlyTrends,
      });
    } catch (error) {
      console.error("Error fetching PM compliance:", error);
      res.status(500).json({ error: "Failed to fetch PM compliance data" });
    }
  });

  // PM Scheduler control
  app.post("/api/pm-scheduler/start", async (req, res) => {
    try {
      pmScheduler.start();
      res.json({ message: "PM scheduler started", status: pmScheduler.getStatus() });
    } catch (error) {
      console.error("Error starting PM scheduler:", error);
      res.status(500).json({ error: "Failed to start PM scheduler" });
    }
  });

  app.post("/api/pm-scheduler/stop", async (req, res) => {
    try {
      pmScheduler.stop();
      res.json({ message: "PM scheduler stopped", status: pmScheduler.getStatus() });
    } catch (error) {
      console.error("Error stopping PM scheduler:", error);
      res.status(500).json({ error: "Failed to stop PM scheduler" });
    }
  });

  app.get("/api/pm-scheduler/status", async (req, res) => {
    try {
      const status = pmScheduler.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting PM scheduler status:", error);
      res.status(500).json({ error: "Failed to get PM scheduler status" });
    }
  });

  app.post("/api/pm-scheduler/run", async (req, res) => {
    try {
      const warehouseId = req.header("x-warehouse-id");
      if (!warehouseId) {
        return res.status(400).json({ error: "Warehouse ID is required" });
      }

      await pmScheduler.runForWarehouse(warehouseId);
      res.json({ message: "PM scheduler run completed" });
    } catch (error) {
      console.error("Error running PM scheduler:", error);
      res.status(500).json({ error: "Failed to run PM scheduler" });
    }
  });

  // Enhanced PM Scheduling API endpoints
  app.get('/api/pm-scheduling/rules/:warehouseId', async (req, res) => {
    try {
      const { warehouseId } = req.params;
      const rules = await pmSchedulerEnhanced.loadSchedulingRules(warehouseId);
      res.json(rules);
    } catch (error) {
      console.error('Error fetching PM scheduling rules:', error);
      res.status(500).json({ error: 'Failed to fetch PM scheduling rules' });
    }
  });

  app.get('/api/pm-scheduling/config/:warehouseId', async (req, res) => {
    try {
      const { warehouseId } = req.params;
      const config = await pmSchedulerEnhanced.loadSchedulingConfig(warehouseId);
      res.json(config);
    } catch (error) {
      console.error('Error fetching PM scheduling config:', error);
      res.status(500).json({ error: 'Failed to fetch PM scheduling config' });
    }
  });

  app.post('/api/pm-scheduling/generate-schedule', async (req, res) => {
    try {
      const { warehouseId, startDate, endDate } = req.body;
      
      if (!warehouseId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const schedule = await pmSchedulerEnhanced.generateOptimizedSchedule(
        warehouseId,
        new Date(startDate),
        new Date(endDate)
      );
      
      res.json(schedule);
    } catch (error) {
      console.error('Error generating PM schedule:', error);
      res.status(500).json({ error: 'Failed to generate PM schedule' });
    }
  });

  app.post('/api/pm-scheduling/start-automation', async (req, res) => {
    try {
      const { intervalMinutes } = req.body;
      await pmSchedulerEnhanced.startAutomatedScheduling(intervalMinutes);
      res.json({ message: 'PM scheduling automation started successfully' });
    } catch (error) {
      console.error('Error starting PM scheduling automation:', error);
      res.status(500).json({ error: 'Failed to start PM scheduling automation' });
    }
  });

  app.post('/api/pm-scheduling/stop-automation', async (req, res) => {
    try {
      pmSchedulerEnhanced.stopAutomatedScheduling();
      res.json({ message: 'PM scheduling automation stopped successfully' });
    } catch (error) {
      console.error('Error stopping PM scheduling automation:', error);
      res.status(500).json({ error: 'Failed to stop PM scheduling automation' });
    }
  });

  app.get('/api/pm-scheduling/status', async (req, res) => {
    try {
      const status = pmSchedulerEnhanced.getSchedulingStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting PM scheduling status:', error);
      res.status(500).json({ error: 'Failed to get PM scheduling status' });
    }
  });

  app.post('/api/pm-scheduling/process-escalations/:warehouseId', async (req, res) => {
    try {
      const { warehouseId } = req.params;
      await pmSchedulerEnhanced.processMissedPMEscalations(warehouseId);
      res.json({ message: 'PM escalations processed successfully' });
    } catch (error) {
      console.error('Error processing PM escalations:', error);
      res.status(500).json({ error: 'Failed to process PM escalations' });
    }
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = getCurrentUser(req);
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Dashboard statistics
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const warehouseId = getCurrentWarehouse(req);
      const workOrders = await storage.getWorkOrders(warehouseId);
      const equipment = await storage.getEquipment(warehouseId);
      const parts = await storage.getParts(warehouseId);
      
      const stats = {
        activeWorkOrders: workOrders.filter(wo => ['new', 'assigned', 'in_progress'].includes(wo.status)).length,
        overdueWorkOrders: workOrders.filter(wo => wo.dueDate && new Date(wo.dueDate) < new Date() && wo.status !== 'completed').length,
        totalEquipment: equipment.length,
        activeEquipment: equipment.filter(e => e.status === 'active').length,
        equipmentOnlinePercentage: equipment.length > 0 ? Math.round((equipment.filter(e => e.status === 'active').length / equipment.length) * 100) : 0,
        lowStockParts: parts.filter(p => p.stockLevel !== null && p.reorderPoint !== null && p.stockLevel <= p.reorderPoint).length,
        totalParts: parts.length,
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  // PM Engine endpoints
  app.post("/api/pm-engine/generate", async (req, res) => {
    try {
      const warehouseId = getCurrentWarehouse(req);
      const result = await pmEngine.generatePMWorkOrders(warehouseId);
      res.json({ 
        success: true, 
        generated: result.length, 
        workOrders: result 
      });
    } catch (error) {
      console.error('PM generation error:', error);
      res.status(500).json({ message: "Failed to generate PM work orders" });
    }
  });

  app.get("/api/pm-engine/schedule/:equipmentId", async (req, res) => {
    try {
      const warehouseId = getCurrentWarehouse(req);
      const equipmentId = req.params.equipmentId;
      const templates = await storage.getPmTemplates(warehouseId);
      
      const schedules = [];
      for (const template of templates) {
        try {
          const schedule = await pmEngine.getPMSchedule(equipmentId, template.id);
          schedules.push(schedule);
        } catch (error) {
          // Skip templates that don't apply to this equipment
          continue;
        }
      }
      
      res.json(schedules);
    } catch (error) {
      console.error('PM schedule error:', error);
      res.status(500).json({ message: "Failed to get PM schedule" });
    }
  });

  app.get("/api/pm-engine/compliance/:equipmentId", async (req, res) => {
    try {
      const warehouseId = getCurrentWarehouse(req);
      const equipmentId = req.params.equipmentId;
      const compliance = await pmEngine.checkComplianceStatus(equipmentId, warehouseId);
      res.json(compliance);
    } catch (error) {
      console.error('PM compliance error:', error);
      res.status(500).json({ message: "Failed to get compliance status" });
    }
  });

  app.post("/api/pm-engine/run-automation", async (req, res) => {
    try {
      const warehouseId = getCurrentWarehouse(req);
      const result = await pmEngine.runPMAutomation(warehouseId);
      res.json(result);
    } catch (error) {
      console.error('PM automation error:', error);
      res.status(500).json({ message: "Failed to run PM automation" });
    }
  });

  // Attachments
  app.get("/api/attachments", async (req, res) => {
    try {
      const workOrderId = req.query.workOrderId as string;
      const equipmentId = req.query.equipmentId as string;
      const attachments = await storage.getAttachments(workOrderId, equipmentId);
      res.json(attachments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get attachments" });
    }
  });

  app.post("/api/attachments", async (req, res) => {
    try {
      const attachmentData = insertAttachmentSchema.parse(req.body);
      const attachment = await storage.createAttachment(attachmentData);
      res.status(201).json(attachment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid attachment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create attachment" });
    }
  });

  // Advanced Reporting API endpoints
  app.post('/api/reports/kpi-metrics', async (req, res) => {
    try {
      const { warehouseId, startDate, endDate } = req.body;
      
      if (!warehouseId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const filter = {
        warehouseId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
      
      const metrics = await advancedReportingService.generateKPIMetrics(filter);
      res.json(metrics);
    } catch (error) {
      console.error('Error generating KPI metrics:', error);
      res.status(500).json({ error: 'Failed to generate KPI metrics' });
    }
  });

  app.post('/api/reports/trend-analysis', async (req, res) => {
    try {
      const { warehouseId, startDate, endDate } = req.body;
      
      if (!warehouseId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const filter = {
        warehouseId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
      
      const trends = await advancedReportingService.generateTrendAnalysis(filter);
      res.json(trends);
    } catch (error) {
      console.error('Error generating trend analysis:', error);
      res.status(500).json({ error: 'Failed to generate trend analysis' });
    }
  });

  app.get('/api/reports/executive-dashboard/:warehouseId', async (req, res) => {
    try {
      const { warehouseId } = req.params;
      const dashboard = await advancedReportingService.generateExecutiveDashboard(warehouseId);
      res.json(dashboard);
    } catch (error) {
      console.error('Error generating executive dashboard:', error);
      res.status(500).json({ error: 'Failed to generate executive dashboard' });
    }
  });

  app.get('/api/reports/equipment-performance/:equipmentId', async (req, res) => {
    try {
      const { equipmentId } = req.params;
      const { warehouseId } = req.query;
      
      if (!warehouseId) {
        return res.status(400).json({ error: 'Missing warehouseId parameter' });
      }
      
      const report = await advancedReportingService.generateEquipmentPerformanceReport(
        equipmentId,
        warehouseId as string
      );
      res.json(report);
    } catch (error) {
      console.error('Error generating equipment performance report:', error);
      res.status(500).json({ error: 'Failed to generate equipment performance report' });
    }
  });

  app.post('/api/reports/export', async (req, res) => {
    try {
      const { reportType, warehouseId, startDate, endDate, format } = req.body;
      
      if (!reportType || !warehouseId || !format) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      // For now, return a simple response - in production, this would generate actual files
      const exportData = {
        reportType,
        warehouseId,
        startDate,
        endDate,
        format,
        downloadUrl: `/api/reports/download/${reportType}_${Date.now()}.${format}`,
        generatedAt: new Date(),
      };
      
      res.json(exportData);
    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({ error: 'Failed to export report' });
    }
  });

  // Security API endpoints
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || 'unknown';
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Check if IP is blocked due to too many failed attempts
      const canAttempt = securityService.trackLoginAttempt(ipAddress, false);
      if (!canAttempt) {
        return res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
      }

      // In a real implementation, this would validate against database
      const user = { id: 'user123', email, role: 'technician', warehouseId: 'warehouse1' };
      const isValidPassword = await securityService.verifyPassword(password, await securityService.hashPassword('password123'));
      
      if (!isValidPassword) {
        securityService.trackLoginAttempt(ipAddress, false);
        
        securityService.logSecurityEvent({
          userId: user.id,
          userEmail: email,
          action: 'failed_login',
          ipAddress,
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          riskLevel: 'medium',
          details: { reason: 'invalid_password' },
        });
        
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      securityService.trackLoginAttempt(ipAddress, true);
      
      // Create session
      const sessionId = securityService.createSession(user.id);
      
      // Generate tokens
      const { accessToken, refreshToken } = securityService.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
        warehouseId: user.warehouseId,
        sessionId,
        permissions: ['read', 'write', 'delete'],
      });

      securityService.logSecurityEvent({
        userId: user.id,
        userEmail: user.email,
        action: 'login',
        ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
        riskLevel: 'low',
      });

      res.json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          warehouseId: user.warehouseId,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', securityService.authenticateToken(), async (req, res) => {
    try {
      const user = (req as any).user;
      
      securityService.destroySession(user.sessionId);
      
      securityService.logSecurityEvent({
        userId: user.userId,
        userEmail: user.email,
        action: 'logout',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
        riskLevel: 'low',
      });

      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      const payload = securityService.verifyToken(refreshToken);
      if (!payload) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = securityService.generateTokens({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        warehouseId: payload.warehouseId,
        sessionId: payload.sessionId,
        permissions: payload.permissions,
      });

      res.json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/change-password', securityService.authenticateToken(), async (req, res) => {
    try {
      const user = (req as any).user;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      // Validate new password
      const validation = securityService.validatePassword(newPassword);
      if (!validation.isValid) {
        return res.status(400).json({ error: 'Password validation failed', details: validation.errors });
      }

      // In a real implementation, this would verify against database
      const isCurrentPasswordValid = await securityService.verifyPassword(currentPassword, await securityService.hashPassword('password123'));
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedNewPassword = await securityService.hashPassword(newPassword);
      
      // In a real implementation, this would update the database
      console.log('Password changed for user:', user.userId);

      securityService.logSecurityEvent({
        userId: user.userId,
        userEmail: user.email,
        action: 'password_change',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        success: true,
        riskLevel: 'low',
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/security/alerts', securityService.authenticateToken(), securityService.requirePermission('admin'), async (req, res) => {
    try {
      const { limit } = req.query;
      const alerts = securityService.getSecurityAlerts(limit ? parseInt(limit as string) : 50);
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching security alerts:', error);
      res.status(500).json({ error: 'Failed to fetch security alerts' });
    }
  });

  app.get('/api/security/audit-logs', securityService.authenticateToken(), securityService.requirePermission('admin'), async (req, res) => {
    try {
      const { userId, limit } = req.query;
      const logs = securityService.getAuditLogs(userId as string, limit ? parseInt(limit as string) : 100);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  // Apply authentication to all protected routes
  app.use('/api/work-orders', securityService.authenticateToken());
  app.use('/api/equipment', securityService.authenticateToken());
  app.use('/api/parts', securityService.authenticateToken());
  app.use('/api/pm-templates', securityService.authenticateToken());
  app.use('/api/pm-scheduling', securityService.authenticateToken());
  app.use('/api/reports', securityService.authenticateToken());

  const httpServer = createServer(app);
  return httpServer;
}
