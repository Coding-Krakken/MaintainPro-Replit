#!/bin/bash

# Railway Deployment Script for MaintainPro
set -e

echo "🚀 Starting Railway deployment for MaintainPro..."

# Check if Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login check
if ! railway status &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

# Build the project locally first to catch errors
echo "🔨 Building project locally..."
npm run build

# Deploy to Railway
echo "🚂 Deploying to Railway..."
railway deploy

echo "✅ Deployment completed!"
echo "🔍 Check deployment status: railway status"
echo "📝 View logs: railway logs"
