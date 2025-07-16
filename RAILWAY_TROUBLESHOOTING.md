# Railway Deployment Troubleshooting Guide

## Current Issues and Solutions

### 1. Build Failure During npm ci

**Problem**: The Railway build was failing during the `npm ci` step, hanging with package installation.

**Solutions Applied**:
- Updated Node.js version from 18 to 20 in `nixpacks.toml`
- Updated npm version from 9.x to 10.x
- Added build optimization flags to npm ci
- Added memory optimization with NODE_OPTIONS

### 2. TypeScript Compilation Issues

**Problem**: The build script was failing because `tsc` command wasn't available globally.

**Solution**: Updated build script to use `npx tsc --noEmit` instead of `tsc --noEmit`.

### 3. Configuration Changes Made

#### nixpacks.toml
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "npm-10_x"]

[phases.install]
cmds = ["npm ci --production=false --prefer-offline"]

[phases.build]
cmds = ["npm run build 2>&1 || (echo 'Build failed' && exit 1)"]

[start]
cmd = "npm start"

[variables]
NODE_ENV = "production"
NPM_CONFIG_PRODUCTION = "false"
NODE_OPTIONS = "--max-old-space-size=4096"
```

#### railway.json
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  },
  "variables": {
    "NODE_ENV": "production",
    "NPM_CONFIG_PRODUCTION": "false"
  }
}
```

#### package.json build script
```json
"build": "vite build && npx tsc --noEmit"
```

## Railway CLI Commands

### Installation
```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Or use the installer
curl -fsSL https://railway.app/install.sh | sh
```

### Deployment Commands
```bash
# Login to Railway
railway login

# Check project status
railway status

# Deploy the project
railway deploy

# View deployment logs
railway logs

# View live logs
railway logs --follow
```

## Monitoring and Debugging

### Health Check
The application has a health check endpoint at `/api/health` that returns:
```json
{
  "status": "ok",
  "timestamp": "2025-01-16T...",
  "env": "production",
  "port": 5000,
  "uptime": 123.45
}
```

### Common Issues and Solutions

1. **Build Timeout**: Increase build timeout in Railway settings
2. **Memory Issues**: The `NODE_OPTIONS` flag increases memory to 4GB
3. **Dependency Issues**: Use `npm ci --production=false` to install all dependencies
4. **TypeScript Issues**: Use `npx tsc` instead of global `tsc`

### Deployment Script

Use the provided `deploy.sh` script:
```bash
npm run deploy:railway
```

Or manually:
```bash
./deploy.sh
```

## Next Steps

1. Try redeploying with the updated configuration
2. Monitor the build logs for any remaining issues
3. Check the health endpoint after deployment
4. Use Railway CLI to troubleshoot any runtime issues

## Environment Variables

Make sure these are set in Railway:
- `NODE_ENV=production`
- `NPM_CONFIG_PRODUCTION=false`
- `NODE_OPTIONS=--max-old-space-size=4096`
