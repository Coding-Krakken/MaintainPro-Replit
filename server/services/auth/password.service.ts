import bcrypt from 'bcryptjs';
import { randomBytes, randomInt } from 'crypto';
import zxcvbn from 'zxcvbn';

export interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  feedback: {
    warning?: string;
    suggestions: string[];
  };
  meetsPolicy: boolean;
  errors: string[];
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbidCommonPasswords: boolean;
  forbidUserInfo: boolean;
  maxRepeatedChars: number;
  preventPreviousPasswords: number;
}

export class PasswordService {
  private static readonly DEFAULT_POLICY: PasswordPolicy = {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbidCommonPasswords: true,
    forbidUserInfo: true,
    maxRepeatedChars: 3,
    preventPreviousPasswords: 5
  };

  private static readonly SALT_ROUNDS = 12;
  private static readonly PEPPER = process.env.PASSWORD_PEPPER || randomBytes(32).toString('hex');

  static async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    // Generate a unique salt for each password
    const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
    
    // Add pepper for additional security
    const pepperedPassword = password + this.PEPPER;
    
    // Hash the password with salt
    const hash = await bcrypt.hash(pepperedPassword, salt);
    
    return { hash, salt };
  }

  static async verifyPassword(password: string, hash: string, salt?: string): Promise<boolean> {
    try {
      // Add pepper for verification
      const pepperedPassword = password + this.PEPPER;
      
      // Verify password
      return await bcrypt.compare(pepperedPassword, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  static validatePassword(
    password: string, 
    userInfo?: { email?: string; firstName?: string; lastName?: string },
    previousPasswords: string[] = [],
    policy: Partial<PasswordPolicy> = {}
  ): PasswordValidationResult {
    const activePolicy = { ...this.DEFAULT_POLICY, ...policy };
    const errors: string[] = [];

    // Check length requirements
    if (password.length < activePolicy.minLength) {
      errors.push(`Password must be at least ${activePolicy.minLength} characters long`);
    }
    if (password.length > activePolicy.maxLength) {
      errors.push(`Password must be no more than ${activePolicy.maxLength} characters long`);
    }

    // Check character requirements
    if (activePolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (activePolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (activePolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (activePolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for repeated characters
    const repeatedCharsRegex = new RegExp(`(.)\\1{${activePolicy.maxRepeatedChars},}`, 'i');
    if (repeatedCharsRegex.test(password)) {
      errors.push(`Password cannot have more than ${activePolicy.maxRepeatedChars} repeated characters in a row`);
    }

    // Check against user information
    if (activePolicy.forbidUserInfo && userInfo) {
      const userInfoValues = [
        userInfo.email?.split('@')[0],
        userInfo.firstName,
        userInfo.lastName
      ].filter(Boolean).map(v => v!.toLowerCase());

      const passwordLower = password.toLowerCase();
      for (const info of userInfoValues) {
        if (passwordLower.includes(info)) {
          errors.push('Password cannot contain personal information');
          break;
        }
      }
    }

    // Use zxcvbn for password strength analysis
    const strengthResult = zxcvbn(password, userInfo ? Object.values(userInfo).filter(Boolean) : []);

    // Check if password was used before
    if (activePolicy.preventPreviousPasswords > 0) {
      // This would need to be checked against stored previous password hashes
      // For now, we'll assume this check is done by the calling service
    }

    const meetsPolicy = errors.length === 0;
    const isValid = meetsPolicy && strengthResult.score >= 3; // Require at least "strong" password

    return {
      isValid,
      score: strengthResult.score,
      feedback: {
        warning: strengthResult.feedback.warning,
        suggestions: strengthResult.feedback.suggestions
      },
      meetsPolicy,
      errors
    };
  }

  static generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    // Ensure password contains at least one character from each required set
    const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    password += upperCase[randomInt(upperCase.length)];
    password += lowerCase[randomInt(lowerCase.length)];
    password += numbers[randomInt(numbers.length)];
    password += special[randomInt(special.length)];
    
    // Fill remaining length with random characters
    for (let i = 4; i < length; i++) {
      password += charset[randomInt(charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => randomInt(3) - 1).join('');
  }

  static generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  static isPasswordExpired(passwordCreatedAt: Date, maxAge: number = 90): boolean {
    const maxAgeMs = maxAge * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    return Date.now() - passwordCreatedAt.getTime() > maxAgeMs;
  }

  static async checkPreviousPasswords(
    newPassword: string, 
    previousPasswordHashes: string[]
  ): Promise<boolean> {
    for (const hash of previousPasswordHashes) {
      if (await this.verifyPassword(newPassword, hash)) {
        return false; // Password was used before
      }
    }
    return true; // Password is new
  }

  static estimatePasswordStrength(password: string): {
    score: number;
    entropy: number;
    crackTime: string;
    feedback: string[];
  } {
    const result = zxcvbn(password);
    
    return {
      score: result.score,
      entropy: result.guesses_log10,
      crackTime: String(result.crack_times_display.offline_slow_hashing_1e4_per_second || 'Unknown'),
      feedback: [
        result.feedback.warning,
        ...result.feedback.suggestions
      ].filter(Boolean)
    };
  }
}
