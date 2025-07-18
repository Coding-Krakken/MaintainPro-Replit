import { randomUUID } from 'crypto';

export interface AuditLogEntry {
  id: string;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface AuditQuery {
  userId?: string;
  action?: string;
  resource?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  eventsByRiskLevel: Record<string, number>;
  eventsByAction: Record<string, number>;
  eventsByResource: Record<string, number>;
  uniqueUsers: number;
  uniqueIPs: number;
}

export class AuditService {
  // In a real implementation, these would be stored in a database
  private static auditLogs: AuditLogEntry[] = [];
  private static readonly MAX_LOGS_IN_MEMORY = 10000;

  static async logEvent(
    action: string,
    resource: string,
    details: Record<string, any>,
    context: {
      userId?: string;
      sessionId?: string;
      ipAddress: string;
      userAgent: string;
      resourceId?: string;
      success?: boolean;
      riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<string> {
    const logEntry: AuditLogEntry = {
      id: randomUUID(),
      userId: context.userId,
      sessionId: context.sessionId,
      action,
      resource,
      resourceId: context.resourceId,
      details: this.sanitizeDetails(details),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      success: context.success ?? true,
      riskLevel: context.riskLevel ?? this.determineRiskLevel(action, resource, details),
      timestamp: new Date()
    };

    // Add to in-memory store
    this.auditLogs.push(logEntry);

    // Maintain memory limit
    if (this.auditLogs.length > this.MAX_LOGS_IN_MEMORY) {
      this.auditLogs.shift(); // Remove oldest entry
    }

    // In a real implementation, save to database
    console.log('Audit Log:', JSON.stringify(logEntry, null, 2));

    return logEntry.id;
  }

  static async logLogin(
    userId: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    details: Record<string, any> = {}
  ): Promise<string> {
    return this.logEvent(
      'login',
      'authentication',
      {
        ...details,
        attemptResult: success ? 'success' : 'failure'
      },
      {
        userId,
        ipAddress,
        userAgent,
        success,
        riskLevel: success ? 'low' : 'medium'
      }
    );
  }

  static async logLogout(
    userId: string,
    sessionId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    return this.logEvent(
      'logout',
      'authentication',
      { sessionId },
      {
        userId,
        sessionId,
        ipAddress,
        userAgent,
        success: true,
        riskLevel: 'low'
      }
    );
  }

  static async logPasswordChange(
    userId: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    forced: boolean = false
  ): Promise<string> {
    return this.logEvent(
      'password_change',
      'user_account',
      { forced },
      {
        userId,
        ipAddress,
        userAgent,
        success,
        riskLevel: 'medium'
      }
    );
  }

  static async logMFAEvent(
    userId: string,
    action: 'enable' | 'disable' | 'verify' | 'backup_used',
    ipAddress: string,
    userAgent: string,
    success: boolean,
    details: Record<string, any> = {}
  ): Promise<string> {
    return this.logEvent(
      `mfa_${action}`,
      'authentication',
      details,
      {
        userId,
        ipAddress,
        userAgent,
        success,
        riskLevel: action === 'disable' ? 'high' : 'medium'
      }
    );
  }

  static async logDataAccess(
    userId: string,
    resource: string,
    resourceId: string,
    action: string,
    ipAddress: string,
    userAgent: string,
    success: boolean = true
  ): Promise<string> {
    const riskLevel = this.assessDataAccessRisk(resource, action);
    
    return this.logEvent(
      action,
      resource,
      { accessType: 'data_access' },
      {
        userId,
        ipAddress,
        userAgent,
        resourceId,
        success,
        riskLevel
      }
    );
  }

  static async logAdminAction(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    ipAddress: string,
    userAgent: string,
    details: Record<string, any> = {},
    success: boolean = true
  ): Promise<string> {
    return this.logEvent(
      action,
      resource,
      { ...details, adminAction: true },
      {
        userId,
        ipAddress,
        userAgent,
        resourceId,
        success,
        riskLevel: 'high' // Admin actions are always high risk
      }
    );
  }

  static async logSecurityEvent(
    action: string,
    details: Record<string, any>,
    context: {
      userId?: string;
      sessionId?: string;
      ipAddress: string;
      userAgent: string;
      riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<string> {
    return this.logEvent(
      action,
      'security',
      details,
      {
        ...context,
        success: true, // Security events are logged regardless
        riskLevel: context.riskLevel ?? 'high'
      }
    );
  }

  static async queryLogs(query: AuditQuery): Promise<{
    logs: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    let filteredLogs = [...this.auditLogs];

    // Apply filters
    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
    }

    if (query.action) {
      filteredLogs = filteredLogs.filter(log => log.action === query.action);
    }

    if (query.resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === query.resource);
    }

    if (query.riskLevel) {
      filteredLogs = filteredLogs.filter(log => log.riskLevel === query.riskLevel);
    }

    if (query.success !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.success === query.success);
    }

    if (query.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endDate!);
    }

    if (query.ipAddress) {
      filteredLogs = filteredLogs.filter(log => log.ipAddress === query.ipAddress);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filteredLogs.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;

    const paginatedLogs = filteredLogs.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      logs: paginatedLogs,
      total,
      hasMore
    };
  }

  static async getAuditStats(timeframe?: { start: Date; end: Date }): Promise<AuditStats> {
    let logs = [...this.auditLogs];

    if (timeframe) {
      logs = logs.filter(log => 
        log.timestamp >= timeframe.start && log.timestamp <= timeframe.end
      );
    }

    const stats: AuditStats = {
      totalEvents: logs.length,
      successfulEvents: logs.filter(log => log.success).length,
      failedEvents: logs.filter(log => !log.success).length,
      eventsByRiskLevel: {},
      eventsByAction: {},
      eventsByResource: {},
      uniqueUsers: new Set(logs.map(log => log.userId).filter(Boolean)).size,
      uniqueIPs: new Set(logs.map(log => log.ipAddress)).size
    };

    // Count events by risk level
    for (const log of logs) {
      stats.eventsByRiskLevel[log.riskLevel] = (stats.eventsByRiskLevel[log.riskLevel] || 0) + 1;
    }

    // Count events by action
    for (const log of logs) {
      stats.eventsByAction[log.action] = (stats.eventsByAction[log.action] || 0) + 1;
    }

    // Count events by resource
    for (const log of logs) {
      stats.eventsByResource[log.resource] = (stats.eventsByResource[log.resource] || 0) + 1;
    }

    return stats;
  }

  static async getSecurityAlerts(timeframe?: { start: Date; end: Date }): Promise<AuditLogEntry[]> {
    let logs = [...this.auditLogs];

    if (timeframe) {
      logs = logs.filter(log => 
        log.timestamp >= timeframe.start && log.timestamp <= timeframe.end
      );
    }

    // Filter for high-risk security events
    return logs.filter(log => 
      (log.riskLevel === 'high' || log.riskLevel === 'critical') &&
      (!log.success || log.resource === 'security')
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  static async getFailedLoginAttempts(
    timeframe: { start: Date; end: Date },
    ipAddress?: string
  ): Promise<AuditLogEntry[]> {
    return this.queryLogs({
      action: 'login',
      success: false,
      startDate: timeframe.start,
      endDate: timeframe.end,
      ipAddress
    }).then(result => result.logs);
  }

  static async getUserActivity(
    userId: string,
    timeframe?: { start: Date; end: Date }
  ): Promise<AuditLogEntry[]> {
    return this.queryLogs({
      userId,
      startDate: timeframe?.start,
      endDate: timeframe?.end
    }).then(result => result.logs);
  }

  private static sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    
    // Remove sensitive information
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private static determineRiskLevel(
    action: string,
    resource: string,
    details: Record<string, any>
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Admin actions
    if (details.adminAction) {
      return 'high';
    }

    // Authentication events
    if (resource === 'authentication') {
      if (action === 'login' && details.attemptResult === 'failure') {
        return 'medium';
      }
      if (action.startsWith('mfa_')) {
        return 'medium';
      }
    }

    // Data modification
    if (['create', 'update', 'delete'].includes(action)) {
      return 'medium';
    }

    // Security events
    if (resource === 'security') {
      return 'high';
    }

    return 'low';
  }

  private static assessDataAccessRisk(resource: string, action: string): 'low' | 'medium' | 'high' | 'critical' {
    const highRiskResources = ['users', 'audit_logs', 'settings'];
    const moderateRiskActions = ['create', 'update', 'delete'];

    if (highRiskResources.includes(resource)) {
      return 'high';
    }

    if (moderateRiskActions.includes(action)) {
      return 'medium';
    }

    return 'low';
  }

  static async exportLogs(
    query: AuditQuery,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const result = await this.queryLogs({ ...query, limit: 10000 }); // Large limit for export
    
    if (format === 'csv') {
      return this.convertToCSV(result.logs);
    }
    
    return JSON.stringify(result.logs, null, 2);
  }

  private static convertToCSV(logs: AuditLogEntry[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'id',
      'timestamp',
      'userId',
      'action',
      'resource',
      'resourceId',
      'success',
      'riskLevel',
      'ipAddress',
      'userAgent',
      'details'
    ];

    const rows = logs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.userId || '',
      log.action,
      log.resource,
      log.resourceId || '',
      log.success.toString(),
      log.riskLevel,
      log.ipAddress,
      log.userAgent,
      JSON.stringify(log.details)
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  static clearOldLogs(retentionDays: number = 90): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const initialCount = this.auditLogs.length;
    this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoffDate);
    
    return initialCount - this.auditLogs.length;
  }
}
