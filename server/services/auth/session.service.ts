import { randomUUID, createHash } from 'crypto';
import { JWTService, TokenPair } from './jwt.service';

export interface SessionData {
  id: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    deviceType: string;
    browser: string;
    os: string;
    isMobile: boolean;
  };
  ipAddress: string;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  isActive: boolean;
  lastAccessedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateSessionOptions {
  userId: string;
  userAgent: string;
  ipAddress: string;
  rememberMe?: boolean;
  deviceFingerprint?: string;
}

export interface SessionValidationResult {
  isValid: boolean;
  session?: SessionData;
  reason?: 'not_found' | 'expired' | 'inactive' | 'suspicious_activity' | 'device_mismatch';
}

export class SessionService {
  private static readonly DEFAULT_SESSION_DURATION = 15 * 60 * 1000; // 15 minutes
  private static readonly REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
  private static readonly MAX_SESSIONS_PER_USER = 5;
  private static readonly SUSPICIOUS_LOGIN_THRESHOLD = 3; // Different locations within this many hours

  // In a real implementation, these would be stored in Redis or database
  private static activeSessions = new Map<string, SessionData>();
  private static userSessions = new Map<string, Set<string>>();

  static async createSession(
    options: CreateSessionOptions,
    userRole: string,
    warehouseId: string
  ): Promise<{ session: SessionData; tokens: TokenPair }> {
    const sessionId = randomUUID();
    const deviceInfo = this.parseUserAgent(options.userAgent);
    
    const duration = options.rememberMe 
      ? this.REMEMBER_ME_DURATION 
      : this.DEFAULT_SESSION_DURATION;
    
    const session: SessionData = {
      id: sessionId,
      userId: options.userId,
      deviceInfo,
      ipAddress: options.ipAddress,
      isActive: true,
      lastAccessedAt: new Date(),
      expiresAt: new Date(Date.now() + duration),
      createdAt: new Date()
    };

    // Check for suspicious activity
    await this.checkSuspiciousActivity(options.userId, options.ipAddress);

    // Manage session limits
    await this.enforceSessionLimits(options.userId);

    // Store session
    this.activeSessions.set(sessionId, session);
    
    if (!this.userSessions.has(options.userId)) {
      this.userSessions.set(options.userId, new Set());
    }
    this.userSessions.get(options.userId)!.add(sessionId);

    // Generate JWT tokens
    const tokens = JWTService.generateTokenPair({
      userId: options.userId,
      email: '', // This would be populated from user data
      role: userRole,
      warehouseId,
      sessionId
    });

    return { session, tokens };
  }

  static async validateSession(sessionId: string): Promise<SessionValidationResult> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return {
        isValid: false,
        reason: 'not_found'
      };
    }

    if (!session.isActive) {
      return {
        isValid: false,
        reason: 'inactive'
      };
    }

    if (session.expiresAt < new Date()) {
      // Session expired, clean it up
      await this.endSession(sessionId);
      return {
        isValid: false,
        reason: 'expired'
      };
    }

    // Update last accessed time
    session.lastAccessedAt = new Date();
    this.activeSessions.set(sessionId, session);

    return {
      isValid: true,
      session
    };
  }

  static async refreshSession(
    sessionId: string,
    extendDuration?: number
  ): Promise<SessionData | null> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return null;
    }

    const extension = extendDuration || this.DEFAULT_SESSION_DURATION;
    session.expiresAt = new Date(Date.now() + extension);
    session.lastAccessedAt = new Date();
    
    this.activeSessions.set(sessionId, session);
    
    return session;
  }

  static async endSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      // Remove from user sessions
      const userSessionSet = this.userSessions.get(session.userId);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
        if (userSessionSet.size === 0) {
          this.userSessions.delete(session.userId);
        }
      }
      
      // Remove the session
      this.activeSessions.delete(sessionId);
      return true;
    }
    
    return false;
  }

  static async endAllUserSessions(userId: string): Promise<number> {
    const userSessionSet = this.userSessions.get(userId);
    
    if (!userSessionSet) {
      return 0;
    }
    
    const sessionIds = Array.from(userSessionSet);
    let endedCount = 0;
    
    for (const sessionId of sessionIds) {
      if (await this.endSession(sessionId)) {
        endedCount++;
      }
    }
    
    return endedCount;
  }

  static async getUserSessions(userId: string): Promise<SessionData[]> {
    const userSessionSet = this.userSessions.get(userId);
    
    if (!userSessionSet) {
      return [];
    }
    
    const sessions: SessionData[] = [];
    
    for (const sessionId of userSessionSet) {
      const session = this.activeSessions.get(sessionId);
      if (session && session.isActive) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }

  static async cleanupExpiredSessions(): Promise<number> {
    let cleanedCount = 0;
    const now = new Date();
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now) {
        await this.endSession(sessionId);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  private static async enforceSessionLimits(userId: string): Promise<void> {
    const userSessionSet = this.userSessions.get(userId);
    
    if (!userSessionSet || userSessionSet.size < this.MAX_SESSIONS_PER_USER) {
      return;
    }
    
    // Get all sessions for this user, sorted by last accessed (oldest first)
    const sessions = Array.from(userSessionSet)
      .map(sessionId => this.activeSessions.get(sessionId))
      .filter(Boolean)
      .sort((a, b) => a!.lastAccessedAt.getTime() - b!.lastAccessedAt.getTime());
    
    // Remove oldest sessions to make room
    const sessionsToRemove = sessions.length - this.MAX_SESSIONS_PER_USER + 1;
    
    for (let i = 0; i < sessionsToRemove; i++) {
      await this.endSession(sessions[i]!.id);
    }
  }

  private static async checkSuspiciousActivity(
    userId: string,
    ipAddress: string
  ): Promise<void> {
    const userSessions = await this.getUserSessions(userId);
    const recentSessions = userSessions.filter(
      session => Date.now() - session.lastAccessedAt.getTime() < (this.SUSPICIOUS_LOGIN_THRESHOLD * 60 * 60 * 1000)
    );
    
    const uniqueIPs = new Set(recentSessions.map(session => session.ipAddress));
    
    if (uniqueIPs.size > 2 && !uniqueIPs.has(ipAddress)) {
      console.warn(`Suspicious login activity detected for user ${userId} from IP ${ipAddress}`);
      // In a real implementation, this could trigger alerts or additional verification
    }
  }

  private static parseUserAgent(userAgent: string): SessionData['deviceInfo'] {
    // Basic user agent parsing (in production, use a library like ua-parser-js)
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/.test(userAgent);
    
    let deviceType = 'desktop';
    if (isMobile && !isTablet) deviceType = 'mobile';
    if (isTablet) deviceType = 'tablet';
    
    let browser = 'unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    let os = 'unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('macOS') || userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';
    
    return {
      userAgent,
      deviceType,
      browser,
      os,
      isMobile
    };
  }

  static generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    const data = `${userAgent}|${ipAddress}|${Date.now()}`;
    return createHash('sha256').update(data).digest('hex');
  }

  static async getSessionStats(): Promise<{
    totalActiveSessions: number;
    sessionsPerUser: Record<string, number>;
    sessionsByDevice: Record<string, number>;
    sessionsByOS: Record<string, number>;
  }> {
    const stats = {
      totalActiveSessions: this.activeSessions.size,
      sessionsPerUser: {} as Record<string, number>,
      sessionsByDevice: {} as Record<string, number>,
      sessionsByOS: {} as Record<string, number>
    };
    
    for (const session of this.activeSessions.values()) {
      // Count sessions per user
      if (!stats.sessionsPerUser[session.userId]) {
        stats.sessionsPerUser[session.userId] = 0;
      }
      stats.sessionsPerUser[session.userId]++;
      
      // Count sessions by device type
      if (!stats.sessionsByDevice[session.deviceInfo.deviceType]) {
        stats.sessionsByDevice[session.deviceInfo.deviceType] = 0;
      }
      stats.sessionsByDevice[session.deviceInfo.deviceType]++;
      
      // Count sessions by OS
      if (!stats.sessionsByOS[session.deviceInfo.os]) {
        stats.sessionsByOS[session.deviceInfo.os] = 0;
      }
      stats.sessionsByOS[session.deviceInfo.os]++;
    }
    
    return stats;
  }

  static isSessionActive(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    return session ? session.isActive && session.expiresAt > new Date() : false;
  }

  static async updateSessionLocation(
    sessionId: string,
    location: SessionData['location']
  ): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      session.location = location;
      this.activeSessions.set(sessionId, session);
      return true;
    }
    
    return false;
  }
}
