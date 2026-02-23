#!/bin/bash
set -e

echo "🧹 Cleaning old files..."
cd /home/veer/Ranveer/rain-crm
rm -rf client/dist frontend-build.tar.gz backend-src.tar.gz frontend-build.zip backend-src.zip

echo "🏗️ Building Frontend..."
cd client
npm run build

echo "📦 Compressing Frontend into frontend-build.tar.gz..."
cd dist
tar -czf ../../frontend-build.tar.gz .

echo "📦 Compressing Backend into backend-src.tar.gz (excluding node_modules)..."
cd ../../server
tar --exclude='./node_modules' --exclude='./.pm2' --exclude='./.git' -czf ../backend-src.tar.gz .

echo "✅ Done! You can now upload frontend-build.tar.gz and backend-src.tar.gz to CyberPanel."
