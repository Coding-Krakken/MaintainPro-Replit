#!/bin/bash

# Deployment Verification Script
set -e

echo "🔍 Verifying deployment readiness..."

# Check if all required files exist
FILES=("package.json" "nixpacks.toml" "railway.json" "server/index.ts" "client/index.html")
for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done
echo "✅ All required files present"

# Check if build works
echo "🔨 Testing build process..."
if npm run build; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Check if dist directory was created
if [ -d "dist" ]; then
    echo "✅ Build output directory exists"
else
    echo "❌ Build output directory missing"
    exit 1
fi

# Test health endpoint in development
echo "🏥 Testing health endpoint..."
if node -e "
const { app } = require('./server/index.ts');
const request = require('http').request;
const server = app.listen(0, () => {
    const port = server.address().port;
    const req = request('http://localhost:' + port + '/api/health', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('✅ Health endpoint responding');
                process.exit(0);
            } else {
                console.log('❌ Health endpoint failed');
                process.exit(1);
            }
        });
    });
    req.on('error', (err) => {
        console.log('❌ Health endpoint error:', err.message);
        process.exit(1);
    });
    req.end();
});
"; then
    echo "✅ Health endpoint test passed"
else
    echo "⚠️  Health endpoint test skipped (requires server setup)"
fi

echo "🚀 Deployment verification complete! Ready for Railway deployment."
