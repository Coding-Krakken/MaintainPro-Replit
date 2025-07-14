export const API_ENDPOINTS = {
  PROFILES: '/api/profiles',
  WORK_ORDERS: '/api/work-orders',
  EQUIPMENT: '/api/equipment',
  PARTS: '/api/parts',
  VENDORS: '/api/vendors',
  PM_TEMPLATES: '/api/pm-templates',
  NOTIFICATIONS: '/api/notifications',
  ATTACHMENTS: '/api/attachments',
  DASHBOARD_STATS: '/api/dashboard/stats',
} as const;

export const WORK_ORDER_STATUSES = {
  NEW: 'new',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  VERIFIED: 'verified',
  CLOSED: 'closed',
} as const;

export const WORK_ORDER_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const WORK_ORDER_TYPES = {
  CORRECTIVE: 'corrective',
  PREVENTIVE: 'preventive',
  EMERGENCY: 'emergency',
} as const;

export const EQUIPMENT_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired',
} as const;

export const EQUIPMENT_CRITICALITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const USER_ROLES = {
  TECHNICIAN: 'technician',
  SUPERVISOR: 'supervisor',
  MANAGER: 'manager',
  ADMIN: 'admin',
  INVENTORY_CLERK: 'inventory_clerk',
  CONTRACTOR: 'contractor',
  REQUESTER: 'requester',
} as const;

export const NOTIFICATION_TYPES = {
  WO_ASSIGNED: 'wo_assigned',
  WO_OVERDUE: 'wo_overdue',
  PART_LOW_STOCK: 'part_low_stock',
  PM_DUE: 'pm_due',
  EQUIPMENT_ALERT: 'equipment_alert',
} as const;

export const PM_FREQUENCIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUALLY: 'annually',
} as const;

export const VENDOR_TYPES = {
  SUPPLIER: 'supplier',
  CONTRACTOR: 'contractor',
} as const;

export const FILE_UPLOAD_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain'],
  COMPRESSION_QUALITY: 0.8,
} as const;

export const QR_SCANNER_CONFIG = {
  VIDEO_CONSTRAINTS: {
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  SCAN_TIMEOUT: 30000, // 30 seconds
} as const;

export const OFFLINE_CONFIG = {
  CACHE_VERSION: 'v1',
  SYNC_RETRY_ATTEMPTS: 3,
  SYNC_RETRY_DELAY: 5000, // 5 seconds
  MAX_OFFLINE_ACTIONS: 100,
} as const;

export const UI_CONFIG = {
  MOBILE_BREAKPOINT: 768,
  TOAST_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  PAGINATION_SIZE: 20,
} as const;

export const LOCAL_STORAGE_KEYS = {
  USER_ID: 'userId',
  WAREHOUSE_ID: 'warehouseId',
  OFFLINE_ACTIONS: 'offlineActions',
  LAST_SYNC: 'lastSync',
  APP_SETTINGS: 'appSettings',
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  NOT_FOUND: 'The requested resource was not found.',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit of 5MB.',
  INVALID_FILE_TYPE: 'Invalid file type. Please select a supported file.',
  CAMERA_PERMISSION_DENIED: 'Camera permission is required to scan QR codes.',
  QR_SCAN_FAILED: 'Failed to scan QR code. Please try again.',
} as const;

export const SUCCESS_MESSAGES = {
  WORK_ORDER_CREATED: 'Work order created successfully',
  WORK_ORDER_UPDATED: 'Work order updated successfully',
  EQUIPMENT_CREATED: 'Equipment added successfully',
  EQUIPMENT_UPDATED: 'Equipment updated successfully',
  PART_CREATED: 'Part added successfully',
  PART_UPDATED: 'Part updated successfully',
  FILE_UPLOADED: 'File uploaded successfully',
  NOTIFICATION_READ: 'Notification marked as read',
  DATA_SYNCED: 'Data synchronized successfully',
} as const;

export const ROUTE_PATHS = {
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  WORK_ORDERS: '/work-orders',
  EQUIPMENT: '/equipment',
  INVENTORY: '/inventory',
  PREVENTIVE: '/preventive',
  VENDORS: '/vendors',
  REPORTS: '/reports',
  SETTINGS: '/settings',
} as const;
