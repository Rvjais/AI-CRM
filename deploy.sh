#!/bin/bash

# ==============================================================================
# RainCRM Deployment Script
# This script builds the Vite frontend, packages the Node.js backend, and
# deploys them to the CyberPanel/OpenLiteSpeed VPS.
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# --- Configuration ---
SERVER_IP="72.61.224.90"
SSH_USER="root" # Root is recommended to change ownership properly for different users

FRONTEND_DIR="/home/in.aicrmz.com/public_html"
FRONTEND_USER="inaic6607:inaic6607"

BACKEND_DIR="/home/api.aicrmz.com/public_html"
BACKEND_USER="apiai5844:apiai5844"

PM2_APP_NAME="rain-crm-backend"

echo "🚀 Starting RainCRM Deployment to $SERVER_IP..."

# ==============================================================================
# 1. Build and Package Frontend
# ==============================================================================
echo "📦 Building Frontend..."
cd client

# Install dependencies if missing
if [ ! -d "node_modules" ]; then
  npm install
fi

# Build Vite SPA
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
  echo "❌ Frontend build failed! 'dist' directory not found."
  exit 1
fi

# Package into zip
echo "🗜️ Zipping Frontend..."
cd dist
zip -r ../../frontend_deploy.zip ./*
cd ../..


# ==============================================================================
# 2. Package Backend
# ==============================================================================
echo "📦 Packaging Backend..."
cd server

# Package into zip (excluding node_modules, .env files, and logs)
echo "🗜️ Zipping Backend..."
zip -r ../backend_deploy.zip . -x "node_modules/*" -x ".env*" -x "logs/*" -x "b64.txt"
cd ..


# ==============================================================================
# 3. Upload to VPS
# ==============================================================================
echo "📤 Uploading archives to VPS..."
scp frontend_deploy.zip $SSH_USER@$SERVER_IP:/tmp/
scp backend_deploy.zip $SSH_USER@$SERVER_IP:/tmp/


# ==============================================================================
# 4. Execute Remote Server Commands
# ==============================================================================
echo "⚙️ Executing deployment commands on the server..."

ssh $SSH_USER@$SERVER_IP << EOF
  set -e
  
  # --- Frontend Deployment ---
  echo "🔄 Deploying Frontend to $FRONTEND_DIR"
  
  # Backup old assets and remove them to avoid stale files
  if [ -d "$FRONTEND_DIR/assets" ]; then
    rm -rf $FRONTEND_DIR/assets
  fi
  
  # Unzip frontend over existing files (overwrites index.html, etc. but keeps .htaccess)
  unzip -o /tmp/frontend_deploy.zip -d $FRONTEND_DIR/
  
  # Set correct ownership and permissions
  chown -R $FRONTEND_USER $FRONTEND_DIR
  find $FRONTEND_DIR -type d -exec chmod 755 {} \;
  find $FRONTEND_DIR -type f -exec chmod 644 {} \;


  # --- Backend Deployment ---
  echo "🔄 Deploying Backend to $BACKEND_DIR"
  
  # Unzip backend into a temporary folder to cleanly copy
  mkdir -p /tmp/backend_deploy
  unzip -o /tmp/backend_deploy.zip -d /tmp/backend_deploy/
  
  # Copy files into backend public_html (preserves .env and existing node_modules)
  cp -R /tmp/backend_deploy/* $BACKEND_DIR/
  
  # Set correct ownership
  chown -R $BACKEND_USER $BACKEND_DIR
  
  # Install/update npm packages inside backend directory
  cd $BACKEND_DIR
  # Run npm install as the backend user to prevent permission issues later
  su -s /bin/bash -c "npm install --production" apiai5844 || npm install --production
  
  # Restart the PM2 process
  echo "🔄 Restarting PM2 process ($PM2_APP_NAME)..."
  # Try to restart pm2 either globally or via the specific user
  pm2 restart $PM2_APP_NAME || su -s /bin/bash -c "pm2 restart $PM2_APP_NAME" apiai5844

  # --- Cleanup ---
  echo "🧹 Cleaning up temp files on server..."
  rm -rf /tmp/frontend_deploy.zip /tmp/backend_deploy.zip /tmp/backend_deploy
  
  echo "✅ Server deployment steps finished successfully!"
EOF


# ==============================================================================
# 5. Local Cleanup
# ==============================================================================
echo "🧹 Cleaning up local archives..."
rm frontend_deploy.zip backend_deploy.zip

echo "🎉 Deployment Process Completed Successfully! Your VPS is updated."
