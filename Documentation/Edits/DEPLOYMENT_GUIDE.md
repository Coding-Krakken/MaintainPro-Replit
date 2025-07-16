# MaintainPro CMMS - Deployment Guide

## Overview

This guide covers deployment options for MaintainPro CMMS, from local development to production environments.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+
- Git

## Environment Setup

### 1. Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/maintainpro

# Server
PORT=5000
NODE_ENV=production

# Authentication (if implemented)
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d

# File Upload (if implemented)
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Email (if implemented)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

### 2. Database Setup

```bash
# Create database
createdb maintainpro

# Run migrations (if using migrations)
npm run db:migrate

# Seed initial data
npm run db:seed
```

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
# Start both client and server
npm run dev

# Or start separately
npm run dev:client  # Frontend only
npm run dev:server  # Backend only
```

### 3. Run Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## Production Deployment

### Option 1: Traditional Server Deployment

#### 1. Build Application

```bash
npm run build
```

#### 2. Start Production Server

```bash
npm start
```

#### 3. Process Management (PM2)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "maintainpro" -- start

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

#### 2. Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/maintainpro
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=maintainpro
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

#### 3. Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

### Option 3: Cloud Deployment (Railway)

#### 1. Railway Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

#### 2. Railway Configuration

Create `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 3. Environment Variables

Set in Railway dashboard:
- `DATABASE_URL` (from Railway PostgreSQL addon)
- `NODE_ENV=production`
- `PORT=5000`

### Option 4: Vercel Deployment

#### 1. Vercel Configuration

Create `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    },
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/server/index.ts" },
    { "src": "/(.*)", "dest": "/client/dist/$1" }
  ]
}
```

#### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## Performance Optimization

### 1. Build Optimization

```bash
# Analyze bundle size
npm run build -- --analyze

# Enable gzip compression
npm install compression
```

### 2. Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_equipment_asset_tag ON equipment(asset_tag);
CREATE INDEX idx_pm_templates_frequency ON pm_templates(frequency);
```

### 3. Caching Strategy

```javascript
// Redis caching (optional)
const redis = require('redis');
const client = redis.createClient();

// Cache PM compliance data
app.get('/api/pm-compliance', async (req, res) => {
  const cacheKey = `pm-compliance-${req.headers['x-warehouse-id']}`;
  const cached = await client.get(cacheKey);
  
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  const data = await getPMCompliance();
  await client.setex(cacheKey, 300, JSON.stringify(data)); // 5 min cache
  res.json(data);
});
```

## Monitoring and Logging

### 1. Health Check Endpoint

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version
  });
});
```

### 2. Logging Setup

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### 3. Performance Monitoring

Consider integrating:
- New Relic for APM
- Sentry for error tracking
- DataDog for infrastructure monitoring

## Security Checklist

### Production Security

- [ ] Enable HTTPS/SSL
- [ ] Set secure HTTP headers
- [ ] Implement rate limiting
- [ ] Validate all inputs
- [ ] Use environment variables for secrets
- [ ] Enable CORS with specific origins
- [ ] Implement authentication/authorization
- [ ] Regular security updates
- [ ] Database connection security
- [ ] File upload security

### Security Headers

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Backup and Recovery

### 1. Database Backups

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql

# Keep last 7 days
find ./backups -name "backup_*.sql" -mtime +7 -delete
```

### 2. File System Backups

```bash
# Backup uploads directory
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   lsof -ti:5000 | xargs kill -9
   ```

2. **Database Connection Issues**
   - Check DATABASE_URL format
   - Verify PostgreSQL is running
   - Check firewall settings

3. **Build Failures**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Clear build cache: `rm -rf dist && npm run build`

4. **Memory Issues**
   - Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096" npm start`

### Logs Location

- Application logs: `./logs/`
- PM2 logs: `~/.pm2/logs/`
- Docker logs: `docker-compose logs app`

## Maintenance

### Regular Tasks

- [ ] Update dependencies monthly
- [ ] Review and rotate secrets quarterly
- [ ] Monitor disk space and performance
- [ ] Review access logs for security
- [ ] Update SSL certificates annually
- [ ] Database maintenance (VACUUM, ANALYZE)
- [ ] Backup verification and restore testing

### Update Process

```bash
# 1. Backup database
pg_dump $DATABASE_URL > backup_before_update.sql

# 2. Update dependencies
npm update

# 3. Run tests
npm run test:all

# 4. Build and deploy
npm run build
pm2 restart maintainpro
```

## Support

For deployment issues or questions:
- Check logs first
- Review this documentation
- Create GitHub issue with deployment details
- Include system information and error messages
