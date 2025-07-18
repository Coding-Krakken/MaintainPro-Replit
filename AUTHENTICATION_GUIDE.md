# MaintainPro CMMS - Advanced Authentication System

## Overview

MaintainPro CMMS now features a comprehensive, enterprise-grade authentication and authorization system designed for maximum security and user experience. This system implements industry best practices and provides multiple layers of security.

## Features

### 🔐 Core Authentication
- **JWT Token Management**: Secure token generation, validation, and refresh
- **Session Management**: Advanced session handling with device tracking
- **Password Security**: Bcrypt hashing with salt, password policies, and history
- **Multi-Factor Authentication (MFA)**: TOTP-based 2FA support
- **Role-Based Access Control (RBAC)**: Granular permissions system

### 🛡️ Security Features
- **Rate Limiting**: Brute force protection on auth endpoints
- **Account Lockout**: Automatic lockout after failed attempts
- **Device Fingerprinting**: Track and identify user devices
- **Security Headers**: OWASP-compliant HTTP security headers
- **Audit Logging**: Complete security event tracking
- **Input Validation**: Comprehensive data sanitization

### 🔑 User Management
- **User Registration**: Secure account creation with email verification
- **Password Reset**: Secure password recovery via email
- **Profile Management**: User profile updates and settings
- **Session Control**: View and manage active sessions

## API Endpoints

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "mfaToken": "123456",
  "rememberMe": true,
  "deviceFingerprint": "base64_encoded_fingerprint"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "technician",
    "warehouseId": "warehouse_id",
    "emailVerified": true,
    "mfaEnabled": false
  },
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "sessionId": "session_uuid"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Token Refresh
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt_refresh_token"
}
```

### Multi-Factor Authentication

#### Setup MFA
```http
POST /api/auth/mfa/setup
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "totp",
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "setup": {
    "qrCode": "data:image/png;base64,...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backupCodes": ["12345678", "87654321"]
  }
}
```

#### Enable MFA
```http
POST /api/auth/mfa/enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}
```

### User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "technician",
  "warehouseId": "warehouse_id"
}
```

### Password Management

#### Request Password Reset
```http
POST /api/auth/password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Confirm Password Reset
```http
POST /api/auth/password-reset/confirm
Content-Type: application/json

{
  "token": "reset_token",
  "newPassword": "NewSecurePassword123!"
}
```

### Session Management

#### Get User Sessions
```http
GET /api/auth/sessions
Authorization: Bearer <token>
```

#### End Specific Session
```http
DELETE /api/auth/sessions/:sessionId
Authorization: Bearer <token>
```

#### End All Sessions
```http
DELETE /api/auth/sessions
Authorization: Bearer <token>
```

## Role-Based Access Control (RBAC)

### User Roles

1. **Technician**
   - View and update assigned work orders
   - View equipment information
   - Log parts usage
   - View notifications

2. **Supervisor**
   - All technician permissions
   - Create and assign work orders
   - Manage team members
   - View reports and analytics
   - Approve PM schedules

3. **Manager**
   - All supervisor permissions
   - Manage equipment and inventory
   - Configure system settings
   - Access all reports
   - Manage vendors and contracts

4. **Admin**
   - Full system access
   - User management
   - System configuration
   - Security settings
   - Audit logs

### Permission System

Permissions follow the format: `resource:action`

Examples:
- `work_order:read`
- `work_order:create`
- `work_order:update`
- `work_order:delete`
- `equipment:*` (all equipment permissions)
- `*` (all permissions)

## Client-Side Integration

### Authentication Hook

The `useAuth` hook provides comprehensive authentication functionality:

```typescript
const {
  user,
  loading,
  login,
  logout,
  setupMFA,
  enableMFA,
  changePassword,
  refreshToken,
  isAuthenticated,
  mfaRequired
} = useAuth();
```

### Login with MFA Support

```typescript
const handleLogin = async () => {
  const result = await login(email, password, mfaToken);
  
  if (result.requiresMFA) {
    // Show MFA input form
    setShowMfaInput(true);
  } else if (result.success) {
    // Redirect to dashboard
    navigate('/dashboard');
  } else {
    // Show error message
    setError(result.error);
  }
};
```

### Protected Routes

```typescript
function ProtectedRoute({ children, requiredRole }: { 
  children: React.ReactNode;
  requiredRole?: string;
}) {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }
  
  return <>{children}</>;
}
```

## Security Configuration

### Environment Variables

```env
# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security Settings
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=15m
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=15m

# MFA Configuration
MFA_ISSUER=MaintainPro CMMS
MFA_SERVICE_NAME=MaintainPro

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
```

### Password Policy

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Cannot be the same as the last 5 passwords
- Cannot contain common dictionary words

### Security Headers

The system automatically applies these security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  warehouse_id UUID,
  active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  mfa_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### User Credentials Table
```sql
CREATE TABLE user_credentials (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  must_change_password BOOLEAN DEFAULT false,
  previous_passwords JSONB DEFAULT '[]',
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Sessions Table
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT NOW()
);
```

### MFA Configuration Table
```sql
CREATE TABLE user_mfa (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  secret TEXT NOT NULL,
  backup_codes JSONB DEFAULT '[]',
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Audit Log Table
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Testing

### Demo Users

The system includes several demo users for testing:

```typescript
const demoUsers = [
  {
    email: 'supervisor@maintainpro.com',
    password: 'demo123',
    role: 'supervisor',
    name: 'John Smith'
  },
  {
    email: 'technician@maintainpro.com',
    password: 'demo123',
    role: 'technician',
    name: 'Sarah Wilson'
  },
  {
    email: 'manager@maintainpro.com',
    password: 'demo123',
    role: 'manager',
    name: 'Mike Johnson'
  }
];
```

### Testing MFA

1. Login with any demo user
2. Navigate to profile settings
3. Enable MFA and scan QR code with authenticator app
4. Use generated tokens for subsequent logins

## Security Best Practices

### Development
- Never commit secrets to version control
- Use environment variables for all configuration
- Regularly update dependencies
- Follow OWASP guidelines
- Implement proper error handling

### Production
- Use HTTPS everywhere
- Implement proper logging and monitoring
- Regular security audits
- Keep dependencies updated
- Monitor for suspicious activity
- Implement proper backup strategies

### Deployment
- Use secure environment variable management
- Implement proper secrets rotation
- Monitor authentication metrics
- Set up alerting for security events
- Regular penetration testing

## Monitoring and Alerts

### Key Metrics to Monitor
- Failed login attempts
- Account lockouts
- MFA bypass attempts
- Unusual session patterns
- Token refresh failures
- Password reset requests

### Recommended Alerts
- Multiple failed logins from same IP
- Account lockout events
- MFA setup/disable events
- Admin privilege escalation
- Unusual access patterns
- High volume of auth requests

## Compliance

This authentication system is designed to meet:
- OWASP Top 10 security guidelines
- NIST authentication standards
- GDPR privacy requirements
- SOX compliance for audit trails
- Industry best practices for CMMS security

## Support

For technical support or security concerns, please contact:
- Development Team: dev@maintainpro.com
- Security Team: security@maintainpro.com
- Documentation: docs@maintainpro.com

## Contributing

When contributing to the authentication system:
1. Follow security coding guidelines
2. Add appropriate tests
3. Update documentation
4. Security review required for auth changes
5. Follow the principle of least privilege
