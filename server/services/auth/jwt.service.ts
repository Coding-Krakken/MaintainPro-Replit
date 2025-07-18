import jwt, { SignOptions } from 'jsonwebtoken';
import { randomBytes } from 'crypto';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  warehouseId: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class JWTService {
  private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || randomBytes(64).toString('hex');
  private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || randomBytes(64).toString('hex');
  private static readonly ACCESS_TOKEN_EXPIRY: string = process.env.JWT_ACCESS_EXPIRY || '15m';
  private static readonly REFRESH_TOKEN_EXPIRY: string = process.env.JWT_REFRESH_EXPIRY || '7d';

  static generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
    const accessTokenPayload = {
      ...payload,
      type: 'access'
    };

    const refreshTokenPayload = {
      userId: payload.userId,
      sessionId: payload.sessionId,
      type: 'refresh'
    };

    const signOptions: SignOptions = {
      expiresIn: '15m',
      issuer: 'maintainpro-cmms',
      audience: 'maintainpro-app'
    };

    const refreshSignOptions: SignOptions = {
      expiresIn: '7d',
      issuer: 'maintainpro-cmms',
      audience: 'maintainpro-app'
    };

    const accessToken = jwt.sign(
      accessTokenPayload,
      this.ACCESS_TOKEN_SECRET,
      signOptions
    );

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      this.REFRESH_TOKEN_SECRET,
      refreshSignOptions
    );

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Default 15 minutes

    return {
      accessToken,
      refreshToken,
      expiresAt
    };
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
        issuer: 'maintainpro-cmms',
        audience: 'maintainpro-app'
      }) as JWTPayload & { type: string };

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('ACCESS_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('INVALID_ACCESS_TOKEN');
      }
      throw error;
    }
  }

  static verifyRefreshToken(token: string): { userId: string; sessionId: string } {
    try {
      const decoded = jwt.verify(token, this.REFRESH_TOKEN_SECRET, {
        issuer: 'maintainpro-cmms',
        audience: 'maintainpro-app'
      }) as { userId: string; sessionId: string; type: string };

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return {
        userId: decoded.userId,
        sessionId: decoded.sessionId
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('INVALID_REFRESH_TOKEN');
      }
      throw error;
    }
  }

  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  static getTokenExpiry(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as { exp?: number };
      if (decoded?.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  static isTokenExpired(token: string): boolean {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true;
    return expiry < new Date();
  }

  static generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  static generateApiKey(): string {
    const prefix = 'mtp_';
    const randomPart = randomBytes(32).toString('hex');
    return `${prefix}${randomPart}`;
  }
}
