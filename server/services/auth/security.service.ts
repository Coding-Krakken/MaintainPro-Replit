import { randomBytes, createHash, scryptSync } from 'node:crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  sessionConfig: {
    maxConcurrentSessions: number;
    sessionTimeout: number; // in minutes
    requireHttps: boolean;
  };
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
}

export interface ThreatDetectionResult {
  isThreat: boolean;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  shouldBlock: boolean;
  additionalVerificationRequired: boolean;
}

export class SecurityService {
  private static readonly DEFAULT_CONFIG: SecurityConfig = {
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    },
    sessionConfig: {
      maxConcurrentSessions: 5,
      sessionTimeout: 15,
      requireHttps: process.env.NODE_ENV === 'production'
    },
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100
    }
  };

  // Track failed login attempts
  private static failedAttempts = new Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }>();
  
  // Track suspicious IPs
  private static suspiciousIPs = new Set<string>();
  
  // Known bad IPs (would be populated from threat intelligence feeds)
  private static blacklistedIPs = new Set<string>();

  static getSecurityHeaders(): SecurityHeaders {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "media-src 'self'",
        "object-src 'none'",
        "child-src 'self'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "base-uri 'self'"
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': [
        'geolocation=()',
        'microphone=()',
        'camera=()',
        'magnetometer=()',
        'gyroscope=()',
        'speaker=()',
        'vibrate=()',
        'fullscreen=(self)'
      ].join(', ')
    };
  }

  static securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
    const headers = SecurityService.getSecurityHeaders();
    
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    next();
  }

  static createRateLimiter(options?: Partial<SecurityConfig['rateLimiting']>) {
    const config = { ...this.DEFAULT_CONFIG.rateLimiting, ...options };
    
    return rateLimit({
      windowMs: config.windowMs,
      max: config.maxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(config.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Custom key generator that can handle both IP and user-based limiting
      keyGenerator: (req: any) => {
        const userId = req.headers['x-user-id'] as string;
        if (userId) return `user:${userId}`;
        // Use express-rate-limit's ipKeyGenerator for IPv6 compatibility
        return `ip:${ipKeyGenerator(req)}`;
      }
    });
  }

  static recordFailedLogin(identifier: string): boolean {
    const now = new Date();
    const attempt = this.failedAttempts.get(identifier);
    
    if (attempt) {
      // Check if lockout period has expired
      if (attempt.lockedUntil && now > attempt.lockedUntil) {
        this.failedAttempts.delete(identifier);
        return false; // Not locked
      }
      
      // Increment failed attempts
      attempt.count++;
      attempt.lastAttempt = now;
      
      // Lock account if max attempts reached
      if (attempt.count >= this.DEFAULT_CONFIG.maxLoginAttempts) {
        attempt.lockedUntil = new Date(now.getTime() + (this.DEFAULT_CONFIG.lockoutDuration * 60 * 1000));
        return true; // Locked
      }
    } else {
      // First failed attempt
      this.failedAttempts.set(identifier, {
        count: 1,
        lastAttempt: now
      });
    }
    
    return false; // Not locked yet
  }

  static clearFailedLogins(identifier: string): void {
    this.failedAttempts.delete(identifier);
  }

  static isAccountLocked(identifier: string): boolean {
    const attempt = this.failedAttempts.get(identifier);
    
    if (!attempt || !attempt.lockedUntil) {
      return false;
    }
    
    const now = new Date();
    if (now > attempt.lockedUntil) {
      // Lockout period expired, clean up
      this.failedAttempts.delete(identifier);
      return false;
    }
    
    return true;
  }

  static getLockoutTimeRemaining(identifier: string): number {
    const attempt = this.failedAttempts.get(identifier);
    
    if (!attempt || !attempt.lockedUntil) {
      return 0;
    }
    
    const remaining = attempt.lockedUntil.getTime() - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000)); // Return seconds
  }

  static detectThreat(
    ipAddress: string,
    userAgent: string,
    requestData?: any
  ): ThreatDetectionResult {
    const reasons: string[] = [];
    let threatLevel: ThreatDetectionResult['threatLevel'] = 'low';
    let shouldBlock = false;
    let additionalVerificationRequired = false;

    // Check if IP is blacklisted
    if (this.blacklistedIPs.has(ipAddress)) {
      reasons.push('IP address is blacklisted');
      threatLevel = 'critical';
      shouldBlock = true;
    }

    // Check if IP is marked as suspicious
    if (this.suspiciousIPs.has(ipAddress)) {
      reasons.push('IP address has suspicious activity');
      threatLevel = threatLevel === 'critical' ? 'critical' : 'high';
      additionalVerificationRequired = true;
    }

    // Check for suspicious user agent patterns
    if (this.isSuspiciousUserAgent(userAgent)) {
      reasons.push('Suspicious user agent detected');
      threatLevel = threatLevel === 'critical' ? 'critical' : 'medium';
    }

    // Check for rapid requests from same IP
    const rapidRequests = this.checkRapidRequests(ipAddress);
    if (rapidRequests) {
      reasons.push('Rapid requests detected');
      threatLevel = threatLevel === 'critical' ? 'critical' : 'medium';
      additionalVerificationRequired = true;
    }

    // Check for suspicious request patterns
    if (requestData && this.hasSuspiciousPatterns(requestData)) {
      reasons.push('Suspicious request patterns detected');
      threatLevel = threatLevel === 'critical' ? 'critical' : 'high';
    }

    return {
      isThreat: reasons.length > 0,
      threatLevel,
      reasons,
      shouldBlock,
      additionalVerificationRequired
    };
  }

  private static isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /postman/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private static requestTimes = new Map<string, number[]>();

  private static checkRapidRequests(ipAddress: string): boolean {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    const maxRequests = 20;

    let times = this.requestTimes.get(ipAddress) || [];
    
    // Remove old entries
    times = times.filter(time => now - time < timeWindow);
    
    // Add current request
    times.push(now);
    
    // Update the map
    this.requestTimes.set(ipAddress, times);
    
    return times.length > maxRequests;
  }

  private static hasSuspiciousPatterns(data: any): boolean {
    const dataString = JSON.stringify(data).toLowerCase();
    
    const suspiciousPatterns = [
      /script/,
      /javascript/,
      /eval\(/,
      /function\(/,
      /<script/,
      /on\w+=/,
      /document\./,
      /window\./,
      /alert\(/,
      /confirm\(/,
      /prompt\(/,
      /iframe/,
      /embed/,
      /object/,
      /applet/
    ];

    return suspiciousPatterns.some(pattern => pattern.test(dataString));
  }

  static sanitizeInput(input: string): string {
    // Basic input sanitization
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  static validateCSRFToken(sessionToken: string, submittedToken: string): boolean {
    // Simple CSRF token validation
    // In production, this would be more sophisticated
    return sessionToken === submittedToken;
  }

  static generateCSRFToken(): string {
    return randomBytes(32).toString('hex');
  }

  static hashSensitiveData(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  static encryptSensitiveData(data: string, encryptionKey: string): string {
    try {
      // For now, return base64 encoded data as a placeholder
      // In production, implement proper AES-256-GCM encryption
      return Buffer.from(data).toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  static decryptSensitiveData(encryptedData: string, key?: string): string {
    try {
      // For now, decode from base64 as a placeholder
      // In production, implement proper AES-256-GCM decryption
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  static markIPAsSuspicious(ipAddress: string): void {
    this.suspiciousIPs.add(ipAddress);
  }

  static blacklistIP(ipAddress: string): void {
    this.blacklistedIPs.add(ipAddress);
  }

  static removeFromBlacklist(ipAddress: string): void {
    this.blacklistedIPs.delete(ipAddress);
  }

  static isIPBlacklisted(ipAddress: string): boolean {
    return this.blacklistedIPs.has(ipAddress);
  }

  static getSecurityMetrics(): {
    failedLoginAttempts: number;
    lockedAccounts: number;
    suspiciousIPs: number;
    blacklistedIPs: number;
  } {
    const now = new Date();
    let lockedAccounts = 0;
    
    for (const attempt of this.failedAttempts.values()) {
      if (attempt.lockedUntil && now < attempt.lockedUntil) {
        lockedAccounts++;
      }
    }
    
    return {
      failedLoginAttempts: this.failedAttempts.size,
      lockedAccounts,
      suspiciousIPs: this.suspiciousIPs.size,
      blacklistedIPs: this.blacklistedIPs.size
    };
  }

  static cleanupOldAttempts(): void {
    const now = new Date();
    const expiredThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [identifier, attempt] of this.failedAttempts.entries()) {
      const timeSinceLastAttempt = now.getTime() - attempt.lastAttempt.getTime();
      
      if (timeSinceLastAttempt > expiredThreshold) {
        this.failedAttempts.delete(identifier);
      }
    }
  }
}
