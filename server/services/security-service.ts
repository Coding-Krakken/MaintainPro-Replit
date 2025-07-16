import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
  };
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number; // days
  };
  session: {
    timeoutMinutes: number;
    maxConcurrentSessions: number;
  };
  audit: {
    enabled: boolean;
    logLevel: 'info' | 'warn' | 'error';
    retentionDays: number;
  };
}

export interface SecurityAuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: 'login' | 'logout' | 'failed_login' | 'password_change' | 'permission_change' | 'data_access';
  resource?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  details?: any;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  warehouseId: string;
  sessionId: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface SecurityAlert {
  id: string;
  type: 'brute_force' | 'suspicious_activity' | 'unauthorized_access' | 'data_breach' | 'privilege_escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

class SecurityService {
  private static instance: SecurityService;
  private config: SecurityConfig;
  private activeSessions: Map<string, { userId: string; lastActivity: Date }> = new Map();
  private failedLoginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private securityAlerts: SecurityAlert[] = [];
  private auditLogs: SecurityAuditLog[] = [];

  private constructor() {
    this.config = {
      jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-key',
        expiresIn: '15m',
        refreshExpiresIn: '7d',
        algorithm: 'HS256',
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90, // 90 days
      },
      session: {
        timeoutMinutes: 30,
        maxConcurrentSessions: 3,
      },
      audit: {
        enabled: true,
        logLevel: 'info',
        retentionDays: 365,
      },
    };
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Create rate limiter middleware
   */
  public createRateLimiter(): any {
    return rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      message: this.config.rateLimit.message,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        this.logSecurityEvent({
          userId: 'anonymous',
          userEmail: 'anonymous',
          action: 'failed_login',
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          riskLevel: 'medium',
          details: { reason: 'rate_limit_exceeded' },
        });
        
        res.status(429).json({
          error: 'Too many requests',
          message: this.config.rateLimit.message,
          retryAfter: Math.ceil(this.config.rateLimit.windowMs / 1000),
        });
      },
    });
  }

  /**
   * Generate JWT token
   */
  public generateTokens(payload: Omit<TokenPayload, 'iat' | 'exp'>): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(payload, this.config.jwt.secret, {
      expiresIn: this.config.jwt.expiresIn,
      algorithm: this.config.jwt.algorithm as jwt.Algorithm,
    });

    const refreshToken = jwt.sign(
      { userId: payload.userId, sessionId: payload.sessionId },
      this.config.jwt.secret,
      {
        expiresIn: this.config.jwt.refreshExpiresIn,
        algorithm: this.config.jwt.algorithm as jwt.Algorithm,
      }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verify JWT token
   */
  public verifyToken(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, this.config.jwt.secret) as TokenPayload;
      
      // Check if session is still active
      const session = this.activeSessions.get(payload.sessionId);
      if (!session || session.userId !== payload.userId) {
        return null;
      }

      // Update last activity
      session.lastActivity = new Date();
      
      return payload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * JWT authentication middleware
   */
  public authenticateToken() {
    return (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      const payload = this.verifyToken(token);
      if (!payload) {
        this.logSecurityEvent({
          userId: 'unknown',
          userEmail: 'unknown',
          action: 'failed_login',
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          riskLevel: 'medium',
          details: { reason: 'invalid_token' },
        });
        
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      // Add user info to request
      (req as any).user = payload;
      next();
    };
  }

  /**
   * Permission-based authorization middleware
   */
  public requirePermission(requiredPermission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user as TokenPayload;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!user.permissions.includes(requiredPermission) && !user.permissions.includes('admin')) {
        this.logSecurityEvent({
          userId: user.userId,
          userEmail: user.email,
          action: 'data_access',
          resource: requiredPermission,
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          riskLevel: 'high',
          details: { permission: requiredPermission },
        });
        
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  }

  /**
   * Validate password against policy
   */
  public validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const policy = this.config.passwordPolicy;

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Hash password
   */
  public async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   */
  public async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Track login attempts
   */
  public trackLoginAttempt(identifier: string, success: boolean): boolean {
    const now = new Date();
    const attempts = this.failedLoginAttempts.get(identifier) || { count: 0, lastAttempt: now };

    if (success) {
      this.failedLoginAttempts.delete(identifier);
      return true;
    }

    // Reset counter if last attempt was more than 30 minutes ago
    if (now.getTime() - attempts.lastAttempt.getTime() > 30 * 60 * 1000) {
      attempts.count = 0;
    }

    attempts.count++;
    attempts.lastAttempt = now;
    this.failedLoginAttempts.set(identifier, attempts);

    // Block if too many failed attempts
    if (attempts.count >= 5) {
      this.createSecurityAlert({
        type: 'brute_force',
        severity: 'high',
        ipAddress: identifier,
        description: `Multiple failed login attempts detected from ${identifier}`,
      });
      return false;
    }

    return true;
  }

  /**
   * Create session
   */
  public createSession(userId: string): string {
    const sessionId = this.generateSessionId();
    
    // Check for existing sessions and enforce limit
    const existingSessions = Array.from(this.activeSessions.entries())
      .filter(([_, session]) => session.userId === userId);
    
    if (existingSessions.length >= this.config.session.maxConcurrentSessions) {
      // Remove oldest session
      const oldestSession = existingSessions.sort((a, b) => 
        a[1].lastActivity.getTime() - b[1].lastActivity.getTime()
      )[0];
      this.activeSessions.delete(oldestSession[0]);
    }

    this.activeSessions.set(sessionId, {
      userId,
      lastActivity: new Date(),
    });

    return sessionId;
  }

  /**
   * Destroy session
   */
  public destroySession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  public cleanupExpiredSessions(): void {
    const now = new Date();
    const timeoutMs = this.config.session.timeoutMinutes * 60 * 1000;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > timeoutMs) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Log security event
   */
  public logSecurityEvent(event: Omit<SecurityAuditLog, 'id' | 'timestamp'>): void {
    if (!this.config.audit.enabled) return;

    const auditLog: SecurityAuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      ...event,
    };

    this.auditLogs.push(auditLog);
    
    // In production, this would be sent to a logging service
    console.log('Security Event:', JSON.stringify(auditLog, null, 2));

    // Clean up old logs
    this.cleanupOldAuditLogs();
  }

  /**
   * Create security alert
   */
  public createSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const securityAlert: SecurityAlert = {
      id: this.generateId(),
      timestamp: new Date(),
      resolved: false,
      ...alert,
    };

    this.securityAlerts.push(securityAlert);
    
    // In production, this would trigger notifications
    console.warn('Security Alert:', JSON.stringify(securityAlert, null, 2));
  }

  /**
   * Get security alerts
   */
  public getSecurityAlerts(limit: number = 50): SecurityAlert[] {
    return this.securityAlerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get audit logs
   */
  public getAuditLogs(userId?: string, limit: number = 100): SecurityAuditLog[] {
    let logs = this.auditLogs;
    
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    
    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Input sanitization
   */
  public sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potentially dangerous characters
      return input.replace(/[<>\"'%;()&+]/g, '');
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Clean up old audit logs
   */
  private cleanupOldAuditLogs(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.audit.retentionDays);
    
    this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoffDate);
  }

  /**
   * Initialize security service
   */
  public initialize(): void {
    console.log('Security Service initialized');
    
    // Start cleanup interval
    setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupOldAuditLogs();
    }, 60 * 60 * 1000); // Every hour
  }
}

export const securityService = SecurityService.getInstance();
