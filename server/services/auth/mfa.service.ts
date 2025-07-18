import { randomBytes, randomInt } from 'node:crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export interface MFASetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFAVerificationResult {
  success: boolean;
  error?: string;
  attemptsRemaining?: number;
}

export interface BackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

export class MFAService {
  private static readonly BACKUP_CODE_COUNT = 10;
  private static readonly BACKUP_CODE_LENGTH = 8;
  private static readonly MAX_VERIFICATION_ATTEMPTS = 3;
  private static readonly VERIFICATION_WINDOW = 30; // seconds
  private static readonly ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || randomBytes(32).toString('hex');

  static generateTOTPSecret(userEmail: string, issuer: string = 'MaintainPro CMMS'): MFASetupResult {
    // Generate a secret for TOTP
    const secret = speakeasy.generateSecret({
      name: `${issuer} (${userEmail})`,
      issuer: issuer,
      length: 32
    });

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url!,
      backupCodes
    };
  }

  static async generateQRCode(secret: string, userEmail: string, issuer: string = 'MaintainPro CMMS'): Promise<string> {
    const otpauth_url = speakeasy.otpauthURL({
      secret: secret,
      label: `${issuer} (${userEmail})`,
      issuer: issuer,
      encoding: 'base32'
    });

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauth_url);
      return qrCodeDataUrl;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  static verifyTOTP(
    token: string,
    secret: string,
    window: number = 1
  ): MFAVerificationResult {
    try {
      // Remove any spaces or formatting from the token
      const cleanToken = token.replace(/\s/g, '');

      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: cleanToken,
        window: window // Allow tokens from previous/next time window
      });

      return {
        success: verified
      };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid token format'
      };
    }
  }

  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      const code = this.generateSecureCode(this.BACKUP_CODE_LENGTH);
      codes.push(code);
    }
    
    return codes;
  }

  private static generateSecureCode(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < length; i++) {
      code += charset[randomInt(charset.length)];
    }
    
    return code;
  }

  static encryptBackupCodes(codes: string[]): string {
    try {
      // For now, use base64 encoding as a placeholder
      // In production, implement proper encryption
      return Buffer.from(JSON.stringify(codes)).toString('base64');
    } catch (error) {
      throw new Error('Failed to encrypt backup codes');
    }
  }

  static decryptBackupCodes(encryptedData: string): BackupCode[] {
    try {
      // For now, use base64 decoding as a placeholder
      // In production, implement proper decryption
      const codes = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8')) as string[];
      return codes.map(code => ({ code, used: false }));
    } catch (error) {
      throw new Error('Failed to decrypt backup codes');
    }
  }

  static verifyBackupCode(
    providedCode: string,
    backupCodes: BackupCode[]
  ): { success: boolean; updatedCodes?: BackupCode[]; error?: string } {
    try {
      const cleanCode = providedCode.replace(/\s/g, '').toUpperCase();
      
      const codeIndex = backupCodes.findIndex(
        bc => bc.code === cleanCode && !bc.used
      );
      
      if (codeIndex === -1) {
        return {
          success: false,
          error: 'Invalid or already used backup code'
        };
      }
      
      // Mark the code as used
      const updatedCodes = [...backupCodes];
      updatedCodes[codeIndex] = {
        ...updatedCodes[codeIndex],
        used: true,
        usedAt: new Date()
      };
      
      return {
        success: true,
        updatedCodes
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to verify backup code'
      };
    }
  }

  static async sendSMSCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    // This would integrate with an SMS service like Twilio, AWS SNS, etc.
    // For now, we'll simulate the functionality
    
    try {
      const code = this.generateSMSCode();
      
      // Store the code temporarily (in a real implementation, this would go to Redis or database)
      // For demonstration purposes, we'll just log it
      console.log(`SMS Code for ${phoneNumber}: ${code}`);
      
      // In a real implementation:
      // await smsService.send(phoneNumber, `Your MaintainPro verification code is: ${code}`);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send SMS code'
      };
    }
  }

  static generateSMSCode(): string {
    return randomInt(100000, 999999).toString();
  }

  static verifySMSCode(providedCode: string, expectedCode: string): boolean {
    return providedCode === expectedCode;
  }

  static async sendEmailCode(email: string): Promise<{ success: boolean; error?: string }> {
    // This would integrate with an email service
    try {
      const code = this.generateSMSCode(); // Same format as SMS
      
      console.log(`Email Code for ${email}: ${code}`);
      
      // In a real implementation:
      // await emailService.send(email, 'MFA Verification Code', `Your verification code is: ${code}`);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send email code'
      };
    }
  }

  static isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    return phoneRegex.test(phoneNumber) && cleanPhone.length >= 10;
  }

  static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, add +1 for US numbers (customize as needed)
    if (!cleaned.startsWith('+')) {
      return '+1' + cleaned;
    }
    
    return cleaned;
  }

  static getMFAMethods(userPreferences?: any): string[] {
    const availableMethods = ['totp', 'sms', 'email'];
    
    if (userPreferences?.disabledMfaMethods) {
      return availableMethods.filter(
        method => !userPreferences.disabledMfaMethods.includes(method)
      );
    }
    
    return availableMethods;
  }

  static validateTOTPWindow(timestamp: number): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTime - timestamp);
    return timeDiff <= this.VERIFICATION_WINDOW;
  }

  static getUnusedBackupCodesCount(backupCodes: BackupCode[]): number {
    return backupCodes.filter(code => !code.used).length;
  }

  static shouldRegenerateBackupCodes(backupCodes: BackupCode[]): boolean {
    const unusedCount = this.getUnusedBackupCodesCount(backupCodes);
    return unusedCount <= 2; // Regenerate when only 2 or fewer codes remain
  }
}
