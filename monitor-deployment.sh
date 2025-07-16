#!/bin/bash

# Railway Deployment Monitor Script
echo "🚂 Railway Deployment Monitor"
echo "=============================="

while true; do
    echo "$(date): Checking deployment status..."
    
    # Check Railway status
    STATUS=$(railway status 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ Railway connected: $STATUS"
    else
        echo "❌ Railway connection issue"
    fi
    
    # Try to check health endpoint (replace with your actual Railway URL)
    # HEALTH_URL="https://your-app.railway.app/api/health"
    # curl -f "$HEALTH_URL" && echo "✅ Health check passed" || echo "❌ Health check failed"
    
    echo "---"
    sleep 30
done
