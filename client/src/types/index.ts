export * from '../../../shared/schema';

export interface DashboardStats {
  activeWorkOrders: number;
  overdueWorkOrders: number;
  totalWorkOrders: number;
  pendingWorkOrders: number;
  completedWorkOrders: number;
  totalEquipment: number;
  activeEquipment: number;
  equipmentOnlinePercentage: number;
  lowStockParts: number;
  totalParts: number;
}

export interface WorkOrderFilters {
  status?: string[];
  assignedTo?: string;
  priority?: string[];
  equipmentId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface QRScanResult {
  text: string;
  rawBytes?: Uint8Array;
  format?: string;
}

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, any>;
  timestamp: string;
  userId: string;
  synced: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'technician' | 'supervisor' | 'manager' | 'admin' | 'inventory_clerk' | 'contractor' | 'requester';
  warehouseId: string;
  active: boolean;
}

// File upload and attachment types
export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  workOrderId?: string;
  equipmentId?: string;
  pmTemplateId?: string;
  vendorId?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface AttachmentUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
}

export interface FileUploadOptions {
  workOrderId?: string;
  equipmentId?: string;
  pmTemplateId?: string;
  vendorId?: string;
  maxSize?: number;
  allowedTypes?: string[];
  compress?: boolean;
  quality?: number;
}

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  effectiveType?: string;
}

export interface UpcomingMaintenanceItem {
  id: string;
  equipmentTag: string;
  equipmentDescription: string;
  dueDate: string;
  type: 'preventive' | 'inspection' | 'calibration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  isOverdue: boolean;
}

export interface Alert {
  id: string;
  type: 'equipment_failure' | 'low_stock' | 'overdue_maintenance' | 'safety_issue';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  equipmentId?: string;
  workOrderId?: string;
  partId?: string;
}
