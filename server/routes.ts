import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pmEngine } from "./services/pm-engine";
import { 
  insertWorkOrderSchema, 
  insertEquipmentSchema, 
  insertPartSchema,
  insertNotificationSchema,
  insertAttachmentSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Railway
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || "development"
    });
  });

  // Authentication middleware (simplified for demo)
  const getCurrentUser = (req: any) => {
    // In real implementation, this would verify JWT token
    return req.headers['x-user-id'] || 'default-user-id';
  };

  const getCurrentWarehouse = (req: any) => {
    return req.headers['x-warehouse-id'] || 'default-warehouse-id';
  };

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
      const warehouseId = getCurrentWarehouse(req);
      const templates = await storage.getPmTemplates(warehouseId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to get PM templates" });
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

  const httpServer = createServer(app);
  return httpServer;
}
