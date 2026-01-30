#!/bin/bash

echo "Testing WhatsApp Business Platform API..."
echo ""

# Test health endpoint
echo "1. Testing Health Endpoint..."
RESPONSE=$(curl -s http://localhost:5000/api/health)

if [ $? -eq 0 ]; then
    echo "✅ Server is responding"
    echo "Response: $RESPONSE"
else
    echo "❌ Server is not responding"
    echo "Make sure the server is running with: npm run dev"
    exit 1
fi

echo ""
echo "2. Testing Root Endpoint..."
ROOT=$(curl -s http://localhost:5000/)
echo "Response: $ROOT"

echo ""
echo "✅ Basic connectivity tests passed!"
echo ""
echo "Next: Run ./test-api.sh for full API testing"
