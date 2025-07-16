# Railway Deployment Guide

## Port Configuration

### Issue
Railway defaults to expecting applications on port 80, but this app runs on port 8080.

### Solution
The following configurations prevent port mismatch issues:

### 1. railway.json Configuration
```json
{
  "variables": {
    "PORT": "8080"
  }
}
```

### 2. Railway Dashboard Settings
- Go to your Railway project dashboard
- Navigate to **Settings** > **Variables**
- Set `PORT=8080`
- Or in **Networking** settings, set the internal port to 8080

### 3. Dockerfile
```dockerfile
EXPOSE 8080
```

### 4. Server Code
```typescript
const port = process.env.PORT || 8080; // Default to 8080 for Railway
```

## Automatic Prevention

### Method 1: Using railway.json (Recommended)
Set the PORT variable in `railway.json` to ensure consistent deployment:

```json
{
  "variables": {
    "PORT": "8080"
  }
}
```

### Method 2: Railway CLI
Set the variable via CLI:
```bash
railway variables set PORT=8080
```

### Method 3: Environment Variables
Add to your environment:
```bash
export PORT=8080
```

## Verification

After deployment, verify the port configuration:

1. **Check Health Endpoint**: 
   ```bash
   curl https://your-app.railway.app/api/health
   ```

2. **Check Logs**:
   ```bash
   railway logs
   ```

3. **Look for**: `Server is running on http://0.0.0.0:8080`

## Troubleshooting

### Common Issues:
- **502 Bad Gateway**: Port mismatch between Railway and application
- **Connection refused**: Application not binding to correct host (0.0.0.0)
- **Health check failures**: Wrong health check path or port

### Quick Fix:
1. Set `PORT=8080` in Railway dashboard
2. Ensure app binds to `0.0.0.0:${PORT}`
3. Verify health check path is correct
