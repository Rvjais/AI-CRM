#!/bin/bash

# WhatsApp Business Platform - API Testing Script
# Tests all endpoints systematically

BASE_URL="http://localhost:5000/api"
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "WhatsApp Business Platform - API Tests"
echo "========================================="
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/health")
if [[ $RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "Response: $RESPONSE"
fi
echo ""

# Test 2: User Registration
echo -e "${YELLOW}Test 2: User Registration${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "name": "Test User"
  }')

if [[ $REGISTER_RESPONSE == *"access"* ]] || [[ $REGISTER_RESPONSE == *"already"* ]]; then
    echo -e "${GREEN}✓ Registration successful (or user exists)${NC}"
else
    echo -e "${RED}✗ Registration failed${NC}"
    echo "Response: $REGISTER_RESPONSE"
fi
echo ""

# Test 3: User Login
echo -e "${YELLOW}Test 3: User Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }')

if [[ $LOGIN_RESPONSE == *"accessToken"* ]]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)
    echo "Access Token: ${ACCESS_TOKEN:0:20}..."
else
    echo -e "${RED}✗ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Get Current User
echo -e "${YELLOW}Test 4: Get Current User${NC}"
USER_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $USER_RESPONSE == *"email"* ]]; then
    echo -e "${GREEN}✓ Get user successful${NC}"
    USER_ID=$(echo $USER_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
else
    echo -e "${RED}✗ Get user failed${NC}"
    echo "Response: $USER_RESPONSE"
fi
echo ""

# Test 5: WhatsApp Connection Status
echo -e "${YELLOW}Test 5: WhatsApp Connection Status${NC}"
WA_STATUS=$(curl -s -X GET "$BASE_URL/whatsapp/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $WA_STATUS == *"status"* ]]; then
    echo -e "${GREEN}✓ WhatsApp status check successful${NC}"
    echo "Status: $WA_STATUS"
else
    echo -e "${RED}✗ WhatsApp status check failed${NC}"
fi
echo ""

# Test 6: WhatsApp Connect (initialize)
echo -e "${YELLOW}Test 6: WhatsApp Connect${NC}"
WA_CONNECT=$(curl -s -X POST "$BASE_URL/whatsapp/connect" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $WA_CONNECT == *"success"* ]] || [[ $WA_CONNECT == *"connecting"* ]]; then
    echo -e "${GREEN}✓ WhatsApp connection initiated${NC}"
else
    echo -e "${RED}✗ WhatsApp connection failed${NC}"
    echo "Response: $WA_CONNECT"
fi
echo ""

# Test 7: Get QR Code
echo -e "${YELLOW}Test 7: Get QR Code${NC}"
sleep 2 # Wait for QR generation
QR_RESPONSE=$(curl -s -X GET "$BASE_URL/whatsapp/qr" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $QR_RESPONSE == *"qrCode"* ]]; then
    echo -e "${GREEN}✓ QR code retrieved${NC}"
    echo "QR Code available (check frontend to scan)"
else
    echo -e "${YELLOW}⚠ QR code not yet available${NC}"
fi
echo ""

# Test 8: Get Chats
echo -e "${YELLOW}Test 8: Get All Chats${NC}"
CHATS_RESPONSE=$(curl -s -X GET "$BASE_URL/messages/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $CHATS_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}✓ Get chats successful${NC}"
else
    echo -e "${RED}✗ Get chats failed${NC}"
    echo "Response: $CHATS_RESPONSE"
fi
echo ""

# Test 9: Get Contacts
echo -e "${YELLOW}Test 9: Get All Contacts${NC}"
CONTACTS_RESPONSE=$(curl -s -X GET "$BASE_URL/contacts/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $CONTACTS_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}✓ Get contacts successful${NC}"
else
    echo -e "${RED}✗ Get contacts failed${NC}"
fi
echo ""

# Test 10: Get Groups
echo -e "${YELLOW}Test 10: Get All Groups${NC}"
GROUPS_RESPONSE=$(curl -s -X GET "$BASE_URL/groups/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $GROUPS_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}✓ Get groups successful${NC}"
else
    echo -e "${RED}✗ Get groups failed${NC}"
fi
echo ""

# Test 11: Refresh Token
echo -e "${YELLOW}Test 11: Refresh Token${NC}"
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh-token" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

if [[ $REFRESH_RESPONSE == *"accessToken"* ]]; then
    echo -e "${GREEN}✓ Token refresh successful${NC}"
else
    echo -e "${RED}✗ Token refresh failed${NC}"
fi
echo ""

# Test 12: Update Profile
echo -e "${YELLOW}Test 12: Update Profile${NC}"
PROFILE_RESPONSE=$(curl -s -X PUT "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User Updated"}')

if [[ $PROFILE_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}✓ Profile update successful${NC}"
else
    echo -e "${RED}✗ Profile update failed${NC}"
fi
echo ""

echo "========================================="
echo "Testing Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Scan the QR code with WhatsApp to connect"
echo "2. Send test messages to verify messaging endpoints"
echo "3. Test media upload with actual files"
echo ""
