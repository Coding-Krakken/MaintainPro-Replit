import { PasswordService } from './password.service';
import { JWTService, TokenPair } from './jwt.service';
import { SessionService, CreateSessionOptions } from './session.service';
import { RBACService, UserRole, AccessControlContext } from './rbac.service';
import { MFAService, MFASetupResult, MFAVerificationResult } from './mfa.service';
import { SecurityService } from './security.service';
import { AuditService } from './audit.service';
import { randomBytes, randomUUID } from 'crypto';

export interface LoginCredentials {
  email: string;
  password: string;
  mfaToken?: string;
  rememberMe?: boolean;
  deviceFingerprint?: string;
}

export interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    warehouseId: string;
    emailVerified: boolean;
    mfaEnabled: boolean;
  };
  tokens?: TokenPair;
  sessionId?: string;
  error?: string;
  mfaRequired?: boolean;
  accountLocked?: boolean;
  lockoutTimeRemaining?: number;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  warehouseId: string;
}

export interface PasswordResetRequest {
  email: string;
  ipAddress: string;
  userAgent: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  ipAddress: string;
  userAgent: string;
}

export class AuthService {
  // Mock user storage - in a real implementation, this would use a database
  private static users = new Map<string, any>();
  private static userCredentials = new Map<string, any>();
  private static userMFA = new Map<string, any>();
  private static passwordResetTokens = new Map<string, any>();

  static async login(
    credentials: LoginCredentials,
    context: { ipAddress: string; userAgent: string }
  ): Promise<LoginResult> {
    const { email, password, mfaToken, rememberMe, deviceFingerprint } = credentials;
    const { ipAddress, userAgent } = context;

    try {
      // Check if IP is blacklisted
      if (SecurityService.isIPBlacklisted(ipAddress)) {
        await AuditService.logLogin('', ipAddress, userAgent, false, {
          reason: 'blacklisted_ip'
        });
        return {
          success: false,
          error: 'Access denied'
        };
      }

      // Threat detection
      const threatResult = SecurityService.detectThreat(ipAddress, userAgent, credentials);
      if (threatResult.shouldBlock) {
        await AuditService.logLogin('', ipAddress, userAgent, false, {
          reason: 'threat_detected',
          threats: threatResult.reasons
        });
        return {
          success: false,
          error: 'Access denied due to suspicious activity'
        };
      }

      // Check account lockout
      const lockoutKey = `email:${email}`;
      if (SecurityService.isAccountLocked(lockoutKey)) {
        const timeRemaining = SecurityService.getLockoutTimeRemaining(lockoutKey);
        await AuditService.logLogin('', ipAddress, userAgent, false, {
          reason: 'account_locked',
          timeRemaining
        });
        return {
          success: false,
          accountLocked: true,
          lockoutTimeRemaining: timeRemaining,
          error: 'Account is temporarily locked due to multiple failed login attempts'
        };
      }

      // Find user by email
      const user = Array.from(this.users.values()).find(u => u.email === email);
      if (!user) {
        SecurityService.recordFailedLogin(lockoutKey);
        await AuditService.logLogin('', ipAddress, userAgent, false, {
          reason: 'user_not_found',
          email
        });
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Check if user is active
      if (!user.active) {
        await AuditService.logLogin(user.id, ipAddress, userAgent, false, {
          reason: 'account_disabled'
        });
        return {
          success: false,
          error: 'Account is disabled'
        };
      }

      // Verify password
      const userCreds = this.userCredentials.get(user.id);
      if (!userCreds) {
        SecurityService.recordFailedLogin(lockoutKey);
        await AuditService.logLogin(user.id, ipAddress, userAgent, false, {
          reason: 'credentials_not_found'
        });
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      const passwordValid = await PasswordService.verifyPassword(
        password,
        userCreds.passwordHash,
        userCreds.passwordSalt
      );

      if (!passwordValid) {
        const isLocked = SecurityService.recordFailedLogin(lockoutKey);
        await AuditService.logLogin(user.id, ipAddress, userAgent, false, {
          reason: 'invalid_password'
        });
        
        if (isLocked) {
          const timeRemaining = SecurityService.getLockoutTimeRemaining(lockoutKey);
          return {
            success: false,
            accountLocked: true,
            lockoutTimeRemaining: timeRemaining,
            error: 'Account locked due to multiple failed login attempts'
          };
        }
        
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Check MFA if enabled
      const userMfaConfig = this.userMFA.get(user.id);
      const mfaEnabled = userMfaConfig?.isEnabled || false;

      if (mfaEnabled && !mfaToken) {
        await AuditService.logLogin(user.id, ipAddress, userAgent, false, {
          reason: 'mfa_required'
        });
        return {
          success: false,
          mfaRequired: true,
          error: 'Multi-factor authentication required'
        };
      }

      if (mfaEnabled && mfaToken) {
        const mfaResult = await this.verifyMFA(user.id, mfaToken);
        if (!mfaResult.success) {
          SecurityService.recordFailedLogin(lockoutKey);
          await AuditService.logLogin(user.id, ipAddress, userAgent, false, {
            reason: 'invalid_mfa_token'
          });
          return {
            success: false,
            error: 'Invalid multi-factor authentication token'
          };
        }
      }

      // Clear failed login attempts on successful login
      SecurityService.clearFailedLogins(lockoutKey);

      // Create session
      const sessionOptions: CreateSessionOptions = {
        userId: user.id,
        userAgent,
        ipAddress,
        rememberMe,
        deviceFingerprint
      };

      const { session, tokens } = await SessionService.createSession(
        sessionOptions,
        user.role,
        user.warehouseId
      );

      // Update last login
      user.lastLoginAt = new Date();
      this.users.set(user.id, user);

      // Log successful login
      await AuditService.logLogin(user.id, ipAddress, userAgent, true, {
        sessionId: session.id,
        mfaUsed: mfaEnabled,
        deviceFingerprint
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          warehouseId: user.warehouseId,
          emailVerified: user.emailVerified || false,
          mfaEnabled
        },
        tokens,
        sessionId: session.id
      };

    } catch (error) {
      console.error('Login error:', error);
      await AuditService.logLogin('', ipAddress, userAgent, false, {
        reason: 'system_error',
        error: error.message
      });
      return {
        success: false,
        error: 'Login failed due to system error'
      };
    }
  }

  static async logout(
    sessionId: string,
    context: { ipAddress: string; userAgent: string }
  ): Promise<{ success: boolean }> {
    try {
      const sessionValidation = await SessionService.validateSession(sessionId);
      
      if (sessionValidation.isValid && sessionValidation.session) {
        const userId = sessionValidation.session.userId;
        
        // End the session
        await SessionService.endSession(sessionId);
        
        // Log the logout
        await AuditService.logLogout(
          userId,
          sessionId,
          context.ipAddress,
          context.userAgent
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false };
    }
  }

  static async refreshToken(
    refreshToken: string,
    context: { ipAddress: string; userAgent: string }
  ): Promise<{ success: boolean; tokens?: TokenPair; error?: string }> {
    try {
      // Verify refresh token
      const decoded = JWTService.verifyRefreshToken(refreshToken);
      
      // Validate session
      const sessionValidation = await SessionService.validateSession(decoded.sessionId);
      
      if (!sessionValidation.isValid || !sessionValidation.session) {
        return {
          success: false,
          error: 'Invalid session'
        };
      }

      const user = this.users.get(sessionValidation.session.userId);
      if (!user || !user.active) {
        return {
          success: false,
          error: 'User not found or inactive'
        };
      }

      // Generate new tokens
      const tokens = JWTService.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
        warehouseId: user.warehouseId,
        sessionId: decoded.sessionId
      });

      // Extend session
      await SessionService.refreshSession(decoded.sessionId);

      // Log token refresh
      await AuditService.logEvent(
        'token_refresh',
        'authentication',
        { sessionId: decoded.sessionId },
        {
          userId: user.id,
          sessionId: decoded.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          success: true,
          riskLevel: 'low'
        }
      );

      return {
        success: true,
        tokens
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Failed to refresh token'
      };
    }
  }

  static async register(
    data: RegisterData,
    context: { ipAddress: string; userAgent: string }
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return {
          success: false,
          error: 'Invalid email format'
        };
      }

      // Check if user already exists
      const existingUser = Array.from(this.users.values()).find(u => u.email === data.email);
      if (existingUser) {
        return {
          success: false,
          error: 'User already exists'
        };
      }

      // Validate password
      const passwordValidation = PasswordService.validatePassword(data.password, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName
      });

      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join(', ')
        };
      }

      // Hash password
      const { hash, salt } = await PasswordService.hashPassword(data.password);

      // Create user
      const userId = randomUUID();
      const user = {
        id: userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        warehouseId: data.warehouseId,
        active: true,
        emailVerified: false,
        emailVerificationToken: randomBytes(32).toString('hex'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const credentials = {
        id: randomUUID(),
        userId,
        passwordHash: hash,
        passwordSalt: salt,
        mustChangePassword: false,
        previousPasswords: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store user and credentials
      this.users.set(userId, user);
      this.userCredentials.set(userId, credentials);

      // Log registration
      await AuditService.logEvent(
        'user_registration',
        'user_account',
        {
          email: data.email,
          role: data.role,
          warehouseId: data.warehouseId
        },
        {
          userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          success: true,
          riskLevel: 'medium'
        }
      );

      return {
        success: true,
        userId
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed'
      };
    }
  }

  static async requestPasswordReset(request: PasswordResetRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const user = Array.from(this.users.values()).find(u => u.email === request.email);
      
      if (!user) {
        // Don't reveal if user exists or not
        return { success: true };
      }

      // Generate reset token
      const token = PasswordService.generateResetToken();
      const resetData = {
        id: randomUUID(),
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        createdAt: new Date()
      };

      this.passwordResetTokens.set(token, resetData);

      // Log password reset request
      await AuditService.logEvent(
        'password_reset_request',
        'user_account',
        { email: request.email },
        {
          userId: user.id,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          success: true,
          riskLevel: 'medium'
        }
      );

      // In a real implementation, send email with reset link
      console.log(`Password reset token for ${request.email}: ${token}`);

      return { success: true };

    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        error: 'Failed to process password reset request'
      };
    }
  }

  static async confirmPasswordReset(request: PasswordResetConfirm): Promise<{ success: boolean; error?: string }> {
    try {
      const resetData = this.passwordResetTokens.get(request.token);
      
      if (!resetData || resetData.expiresAt < new Date()) {
        return {
          success: false,
          error: 'Invalid or expired reset token'
        };
      }

      const user = this.users.get(resetData.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Validate new password
      const passwordValidation = PasswordService.validatePassword(request.newPassword, {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });

      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join(', ')
        };
      }

      // Hash new password
      const { hash, salt } = await PasswordService.hashPassword(request.newPassword);

      // Update credentials
      const credentials = this.userCredentials.get(resetData.userId);
      if (credentials) {
        // Store old password in history
        credentials.previousPasswords = credentials.previousPasswords || [];
        credentials.previousPasswords.unshift(credentials.passwordHash);
        credentials.previousPasswords = credentials.previousPasswords.slice(0, 5); // Keep last 5

        credentials.passwordHash = hash;
        credentials.passwordSalt = salt;
        credentials.updatedAt = new Date();
        
        this.userCredentials.set(resetData.userId, credentials);
      }

      // Remove reset token
      this.passwordResetTokens.delete(request.token);

      // End all user sessions for security
      await SessionService.endAllUserSessions(resetData.userId);

      // Log password reset
      await AuditService.logPasswordChange(
        resetData.userId,
        request.ipAddress,
        request.userAgent,
        true,
        false
      );

      return { success: true };

    } catch (error) {
      console.error('Password reset confirmation error:', error);
      return {
        success: false,
        error: 'Failed to reset password'
      };
    }
  }

  static async setupMFA(
    userId: string,
    type: 'totp' | 'sms' | 'email',
    phoneNumber?: string
  ): Promise<{ success: boolean; setup?: MFASetupResult; error?: string }> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      let setup: MFASetupResult;

      switch (type) {
        case 'totp':
          setup = MFAService.generateTOTPSecret(user.email);
          break;
        case 'sms':
          if (!phoneNumber || !MFAService.isValidPhoneNumber(phoneNumber)) {
            return {
              success: false,
              error: 'Valid phone number required for SMS MFA'
            };
          }
          setup = {
            secret: MFAService.formatPhoneNumber(phoneNumber),
            qrCodeUrl: '',
            backupCodes: MFAService.generateBackupCodes()
          };
          break;
        case 'email':
          setup = {
            secret: user.email,
            qrCodeUrl: '',
            backupCodes: MFAService.generateBackupCodes()
          };
          break;
        default:
          return {
            success: false,
            error: 'Invalid MFA type'
          };
      }

      // Store MFA configuration (not enabled yet)
      const mfaConfig = {
        id: randomUUID(),
        userId,
        type,
        secret: setup.secret,
        isEnabled: false,
        backupCodes: MFAService.encryptBackupCodes(setup.backupCodes),
        createdAt: new Date()
      };

      this.userMFA.set(userId, mfaConfig);

      return {
        success: true,
        setup
      };

    } catch (error) {
      console.error('MFA setup error:', error);
      return {
        success: false,
        error: 'Failed to setup MFA'
      };
    }
  }

  static async enableMFA(
    userId: string,
    verificationToken: string,
    context: { ipAddress: string; userAgent: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const mfaConfig = this.userMFA.get(userId);
      if (!mfaConfig) {
        return {
          success: false,
          error: 'MFA not configured'
        };
      }

      // Verify the token
      const verification = await this.verifyMFA(userId, verificationToken);
      if (!verification.success) {
        return {
          success: false,
          error: 'Invalid verification token'
        };
      }

      // Enable MFA
      mfaConfig.isEnabled = true;
      this.userMFA.set(userId, mfaConfig);

      // Log MFA enablement
      await AuditService.logMFAEvent(
        userId,
        'enable',
        context.ipAddress,
        context.userAgent,
        true,
        { type: mfaConfig.type }
      );

      return { success: true };

    } catch (error) {
      console.error('MFA enable error:', error);
      return {
        success: false,
        error: 'Failed to enable MFA'
      };
    }
  }

  private static async verifyMFA(userId: string, token: string): Promise<MFAVerificationResult> {
    const mfaConfig = this.userMFA.get(userId);
    if (!mfaConfig) {
      return { success: false, error: 'MFA not configured' };
    }

    switch (mfaConfig.type) {
      case 'totp':
        return MFAService.verifyTOTP(token, mfaConfig.secret);
      case 'sms':
      case 'email':
        // In a real implementation, this would verify against a stored code
        return { success: true };
      default:
        return { success: false, error: 'Invalid MFA type' };
    }
  }

  static async validateAccess(
    sessionId: string,
    resource: string,
    action: string,
    resourceId?: string
  ): Promise<{ allowed: boolean; user?: any; error?: string }> {
    try {
      // Validate session
      const sessionValidation = await SessionService.validateSession(sessionId);
      if (!sessionValidation.isValid || !sessionValidation.session) {
        return {
          allowed: false,
          error: 'Invalid session'
        };
      }

      const user = this.users.get(sessionValidation.session.userId);
      if (!user || !user.active) {
        return {
          allowed: false,
          error: 'User not found or inactive'
        };
      }

      // Check permissions
      const context: AccessControlContext = {
        userId: user.id,
        role: user.role,
        warehouseId: user.warehouseId,
        sessionId,
        resourceId
      };

      const allowed = RBACService.hasPermission(context, resource as any, action as any);

      if (allowed) {
        // Log successful access
        await AuditService.logDataAccess(
          user.id,
          resource,
          resourceId || '',
          action,
          sessionValidation.session.ipAddress,
          sessionValidation.session.deviceInfo.userAgent,
          true
        );
      }

      return {
        allowed,
        user: allowed ? user : undefined
      };

    } catch (error) {
      console.error('Access validation error:', error);
      return {
        allowed: false,
        error: 'Access validation failed'
      };
    }
  }

  // Initialize with some test users
  static initializeTestUsers(): void {
    const testUsers = [
      {
        id: 'supervisor-user-id',
        email: 'supervisor@maintainpro.com',
        firstName: 'John',
        lastName: 'Smith',
        role: 'supervisor' as UserRole,
        warehouseId: '1',
        active: true,
        emailVerified: true
      },
      {
        id: 'technician-user-id',
        email: 'technician@maintainpro.com',
        firstName: 'Sarah',
        lastName: 'Wilson',
        role: 'technician' as UserRole,
        warehouseId: '1',
        active: true,
        emailVerified: true
      },
      {
        id: 'manager-user-id',
        email: 'manager@maintainpro.com',
        firstName: 'Mike',
        lastName: 'Johnson',
        role: 'manager' as UserRole,
        warehouseId: '1',
        active: true,
        emailVerified: true
      }
    ];

    testUsers.forEach(async (user) => {
      this.users.set(user.id, user);
      
      // Create default password "demo123"
      const { hash, salt } = await PasswordService.hashPassword('demo123');
      this.userCredentials.set(user.id, {
        id: randomUUID(),
        userId: user.id,
        passwordHash: hash,
        passwordSalt: salt,
        mustChangePassword: false,
        previousPasswords: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<{ valid: boolean; payload?: any; error?: string }> {
    try {
      const payload = JWTService.verifyAccessToken(token);
      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const result = await SessionService.validateSession(sessionId);
      return result.isValid;
    } catch (error) {
      return false;
    }
  }
}
