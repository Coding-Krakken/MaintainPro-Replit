interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

interface RoleDefinition {
  name: string;
  permissions: Permission[];
  inherits?: string[];
}

export type UserRole = 'technician' | 'supervisor' | 'manager' | 'admin' | 'inventory_clerk' | 'contractor' | 'requester';
export type Action = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'assign' | 'escalate' | 'close';
export type Resource = 'work_orders' | 'equipment' | 'parts' | 'vendors' | 'users' | 'pm_templates' | 'reports' | 'settings' | 'audit_logs';

export interface AccessControlContext {
  userId: string;
  role: UserRole;
  warehouseId: string;
  sessionId: string;
  ipAddress?: string;
  resourceId?: string;
  resourceOwnerId?: string;
}

export class RBACService {
  private static roleDefinitions: Map<UserRole, RoleDefinition> = new Map([
    // Technician - Basic operational access
    ['technician', {
      name: 'Technician',
      permissions: [
        { resource: 'work_orders', action: 'read' },
        { resource: 'work_orders', action: 'update', conditions: { assignedTo: 'self' } },
        { resource: 'equipment', action: 'read' },
        { resource: 'equipment', action: 'update', conditions: { field: 'status' } },
        { resource: 'parts', action: 'read' },
        { resource: 'parts', action: 'update', conditions: { field: 'stockLevel' } },
        { resource: 'reports', action: 'read', conditions: { type: 'assigned_work_orders' } }
      ]
    }],

    // Inventory Clerk - Parts and inventory management
    ['inventory_clerk', {
      name: 'Inventory Clerk',
      permissions: [
        { resource: 'parts', action: 'read' },
        { resource: 'parts', action: 'create' },
        { resource: 'parts', action: 'update' },
        { resource: 'equipment', action: 'read' },
        { resource: 'vendors', action: 'read' },
        { resource: 'vendors', action: 'create' },
        { resource: 'vendors', action: 'update' },
        { resource: 'work_orders', action: 'read' },
        { resource: 'reports', action: 'read', conditions: { type: 'inventory' } }
      ]
    }],

    // Contractor - Limited access for external workers
    ['contractor', {
      name: 'Contractor',
      permissions: [
        { resource: 'work_orders', action: 'read', conditions: { assignedTo: 'self' } },
        { resource: 'work_orders', action: 'update', conditions: { assignedTo: 'self', field: 'status' } },
        { resource: 'equipment', action: 'read', conditions: { relatedToAssignedWork: true } },
        { resource: 'parts', action: 'read', conditions: { relatedToAssignedWork: true } }
      ]
    }],

    // Requester - Can request work orders
    ['requester', {
      name: 'Requester',
      permissions: [
        { resource: 'work_orders', action: 'create' },
        { resource: 'work_orders', action: 'read', conditions: { requestedBy: 'self' } },
        { resource: 'equipment', action: 'read' }
      ]
    }],

    // Supervisor - Manages team and work orders
    ['supervisor', {
      name: 'Supervisor',
      inherits: ['technician'],
      permissions: [
        { resource: 'work_orders', action: 'create' },
        { resource: 'work_orders', action: 'update' },
        { resource: 'work_orders', action: 'assign' },
        { resource: 'work_orders', action: 'approve' },
        { resource: 'work_orders', action: 'escalate' },
        { resource: 'equipment', action: 'create' },
        { resource: 'equipment', action: 'update' },
        { resource: 'parts', action: 'create' },
        { resource: 'parts', action: 'update' },
        { resource: 'pm_templates', action: 'read' },
        { resource: 'pm_templates', action: 'create' },
        { resource: 'pm_templates', action: 'update' },
        { resource: 'users', action: 'read', conditions: { warehouse: 'same' } },
        { resource: 'reports', action: 'read', conditions: { scope: 'team' } }
      ]
    }],

    // Manager - Full operational control
    ['manager', {
      name: 'Manager',
      inherits: ['supervisor'],
      permissions: [
        { resource: 'work_orders', action: 'delete' },
        { resource: 'equipment', action: 'delete' },
        { resource: 'parts', action: 'delete' },
        { resource: 'pm_templates', action: 'delete' },
        { resource: 'vendors', action: 'delete' },
        { resource: 'users', action: 'create', conditions: { warehouse: 'same' } },
        { resource: 'users', action: 'update', conditions: { warehouse: 'same' } },
        { resource: 'users', action: 'delete', conditions: { warehouse: 'same' } },
        { resource: 'reports', action: 'read' },
        { resource: 'settings', action: 'read' },
        { resource: 'settings', action: 'update', conditions: { scope: 'warehouse' } },
        { resource: 'audit_logs', action: 'read', conditions: { warehouse: 'same' } }
      ]
    }],

    // Admin - System-wide access
    ['admin', {
      name: 'Administrator',
      permissions: [
        { resource: '*', action: '*' } // Full access to everything
      ]
    }]
  ]);

  static hasPermission(
    context: AccessControlContext,
    resource: Resource | '*',
    action: Action | '*'
  ): boolean {
    try {
      const rolePermissions = this.getAllPermissions(context.role);
      
      // Check for wildcard permissions (admin role)
      const hasWildcard = rolePermissions.some(p => 
        (p.resource === '*' || p.resource === resource) &&
        (p.action === '*' || p.action === action)
      );
      
      if (hasWildcard) {
        return true;
      }

      // Find specific permission
      const permission = rolePermissions.find(p => 
        p.resource === resource && p.action === action
      );

      if (!permission) {
        return false;
      }

      // Check conditions if they exist
      if (permission.conditions) {
        return this.evaluateConditions(permission.conditions, context);
      }

      return true;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  static getAllPermissions(role: UserRole): Permission[] {
    const permissions: Permission[] = [];
    const visited = new Set<UserRole>();
    
    const collectPermissions = (currentRole: UserRole) => {
      if (visited.has(currentRole)) {
        return; // Prevent circular inheritance
      }
      visited.add(currentRole);
      
      const roleDefinition = this.roleDefinitions.get(currentRole);
      if (!roleDefinition) {
        return;
      }
      
      // Add current role permissions
      permissions.push(...roleDefinition.permissions);
      
      // Recursively add inherited permissions
      if (roleDefinition.inherits) {
        for (const inheritedRole of roleDefinition.inherits) {
          collectPermissions(inheritedRole as UserRole);
        }
      }
    };
    
    collectPermissions(role);
    return permissions;
  }

  private static evaluateConditions(
    conditions: Record<string, any>,
    context: AccessControlContext
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      switch (key) {
        case 'assignedTo':
          if (value === 'self' && context.resourceOwnerId !== context.userId) {
            return false;
          }
          break;
          
        case 'requestedBy':
          if (value === 'self' && context.resourceOwnerId !== context.userId) {
            return false;
          }
          break;
          
        case 'warehouse':
          if (value === 'same' && context.warehouseId !== context.warehouseId) {
            return false;
          }
          break;
          
        case 'field':
          // This would need additional context about which field is being updated
          // For now, we'll allow it if specified
          break;
          
        case 'type':
        case 'scope':
          // These would need additional validation based on the specific resource
          break;
          
        default:
          console.warn(`Unknown condition: ${key}`);
          return false;
      }
    }
    
    return true;
  }

  static canAccessResource(
    context: AccessControlContext,
    resource: Resource,
    resourceData?: any
  ): boolean {
    // Basic read permission check
    if (!this.hasPermission(context, resource, 'read')) {
      return false;
    }

    // Additional resource-specific checks
    if (resourceData) {
      switch (resource) {
        case 'work_orders':
          // Check if user can access this specific work order
          const workOrder = resourceData;
          if (context.role === 'technician' || context.role === 'contractor') {
            return workOrder.assignedTo === context.userId;
          }
          if (context.role === 'requester') {
            return workOrder.requestedBy === context.userId;
          }
          break;
          
        case 'users':
          // Users can only access users in same warehouse (unless admin)
          const user = resourceData;
          if (context.role !== 'admin' && user.warehouseId !== context.warehouseId) {
            return false;
          }
          break;
      }
    }

    return true;
  }

  static getPermissionMatrix(role: UserRole): Record<string, string[]> {
    const permissions = this.getAllPermissions(role);
    const matrix: Record<string, string[]> = {};
    
    for (const permission of permissions) {
      if (!matrix[permission.resource]) {
        matrix[permission.resource] = [];
      }
      if (!matrix[permission.resource].includes(permission.action)) {
        matrix[permission.resource].push(permission.action);
      }
    }
    
    return matrix;
  }

  static getRoleHierarchy(): Record<UserRole, number> {
    return {
      'requester': 1,
      'contractor': 2,
      'technician': 3,
      'inventory_clerk': 3,
      'supervisor': 4,
      'manager': 5,
      'admin': 6
    };
  }

  static canEscalateTo(fromRole: UserRole, toRole: UserRole): boolean {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy[toRole] > hierarchy[fromRole];
  }

  static getAvailableActions(role: UserRole, resource: Resource): Action[] {
    const permissions = this.getAllPermissions(role);
    const actions: Action[] = [];
    
    for (const permission of permissions) {
      if (permission.resource === resource || permission.resource === '*') {
        if (permission.action === '*') {
          return ['create', 'read', 'update', 'delete', 'approve', 'assign', 'escalate', 'close'];
        } else if (!actions.includes(permission.action as Action)) {
          actions.push(permission.action as Action);
        }
      }
    }
    
    return actions;
  }

  static validateRoleChange(
    currentUserRole: UserRole,
    targetUserId: string,
    newRole: UserRole,
    context: AccessControlContext
  ): { allowed: boolean; reason?: string } {
    const hierarchy = this.getRoleHierarchy();
    const currentUserLevel = hierarchy[currentUserRole];
    const newRoleLevel = hierarchy[newRole];
    
    // Can't promote someone to a role higher than your own
    if (newRoleLevel >= currentUserLevel) {
      return {
        allowed: false,
        reason: 'Cannot assign a role higher than or equal to your own'
      };
    }
    
    // Can't modify admin roles unless you're an admin
    if (newRole === 'admin' && currentUserRole !== 'admin') {
      return {
        allowed: false,
        reason: 'Only administrators can assign admin roles'
      };
    }
    
    return { allowed: true };
  }
}
