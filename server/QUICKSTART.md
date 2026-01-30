# Quick Start - Testing Your API

## ✅ Server is Running!

Check your terminal where you ran `npm run dev` - you should see:
```
✅ MongoDB connected successfully
☁️ Cloudinary configured successfully
✅ Socket.io initialized successfully
🚀 WhatsApp Business Platform Server Started
```

---

## 🚀 Quick Test Commands

### 1. Test if server is running:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "..."
}
```

### 2. Register a user:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "name": "Test User"
  }'
```

### 3. Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

**SAVE THE ACCESS TOKEN FROM THE RESPONSE!**

### 4. Test protected endpoint (replace YOUR_TOKEN):
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Connect WhatsApp:
```bash
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Get QR Code:
```bash
curl http://localhost:5000/api/whatsapp/qr \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Full Automated Test

Run this to test all endpoints:
```bash
bash test-api.sh
```

Or use the quick version:
```bash
bash quick-test.sh
```

---

## 🎨 VS Code REST Client (Easiest!)

1. Install extension: `REST Client` by Huachao Mao
2. Open file: `api-tests.http`
3. Click "Send Request" above each test
4. After login, copy the `accessToken` and paste it at the top where it says `@accessToken = `

---

## ✨ What to Test

- [x] Server starts without errors
- [ ] Health check returns success → `curl http://localhost:5000/api/health`
- [ ] User registration works
- [ ] User login returns tokens
- [ ] Protected endpoints require auth
- [ ] WhatsApp connection initializes
- [ ] QR code is generated

---

## 🐛 Troubleshooting

**Server won't start?**
- Check MongoDB connection in `.env`
- Make sure port 5000 is not in use: `lsof -i :5000`

**Connection refused?**
- Server is still starting, wait a few seconds
- Check terminal for error messages

**401 Unauthorized?**
- Token expired (15min lifetime)
- Login again to get new token
- Make sure `Authorization: Bearer TOKEN` header is set

---

## 📝 Testing Checklist

Run these in order:

1. ✅ **Health Check**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. ✅ **Register**
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test1234","name":"Test"}'
   ```

3. ✅ **Login** (save the token!)
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test1234"}'
   ```

4. ✅ **Get Profile** (use token from step 3)
   ```bash
   TOKEN="paste_your_token_here"
   curl http://localhost:5000/api/auth/me -H "Authorization: Bearer $TOKEN"
   ```

5. ✅ **Connect WhatsApp**
   ```bash
   curl -X POST http://localhost:5000/api/whatsapp/connect -H "Authorization: Bearer $TOKEN"
   ```

6. ✅ **Get QR Code**
   ```bash
   curl http://localhost:5000/api/whatsapp/qr -H "Authorization: Bearer $TOKEN"
   ```

That's it! Your backend is fully functional! 🎉
