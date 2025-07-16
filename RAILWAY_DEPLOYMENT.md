# Railway Deployment Guide

This application is configured to deploy on Railway with the following setup:

## Files for Railway Deployment

### 1. `nixpacks.toml`
Configures the Nixpacks build process:
- Uses Node.js 18 and npm 9
- Runs `npm ci` for installation
- Runs `npm run build` for building
- Starts with `npm start`
- Sets NODE_ENV to production

### 2. `railway.json`
Configures Railway-specific settings:
- Health check endpoint: `/api/health`
- Restart policy and timeout settings
- Uses Nixpacks builder

### 3. Package.json Scripts
- `build`: Builds the client and type-checks the server
- `start`: Starts the server in production mode with tsx

## Key Changes Made

1. **Fixed Static File Serving**: Updated `server/vite.ts` to serve static files from the correct `dist/public` directory in production.

2. **Fixed Module Issues**: Resolved ES module compatibility issues in `server/index.ts` by removing CommonJS `require.main` check.

3. **Added Health Check**: Added `/api/health` endpoint for Railway health monitoring.

4. **Graceful Shutdown**: Added proper SIGTERM and SIGINT handling for Railway deployments.

5. **Production Environment**: Ensured the server runs in production mode with proper environment variables.

## Deployment Process

1. Railway detects the `nixpacks.toml` configuration
2. Installs dependencies with `npm ci`
3. Builds the application with `npm run build`
4. Starts the server with `npm start`
5. Health checks are performed on `/api/health`

## Environment Variables

The application expects these environment variables in Railway:
- `NODE_ENV=production` (set automatically by nixpacks.toml)
- `PORT` (set automatically by Railway)
- Database connection strings (if using external database)

## Troubleshooting

- **Build fails**: Check that all dependencies are in `package.json`
- **Server fails to start**: Check server logs for TypeScript or module errors
- **Health check fails**: Ensure `/api/health` endpoint is accessible
- **Static files not served**: Verify `dist/public` directory exists after build
