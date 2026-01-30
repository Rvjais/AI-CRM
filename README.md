# WhatsApp Business Platform

A complete multi-tenant WhatsApp Business Platform with REST API and real-time messaging.

## 📁 Project Structure

```
rainCrm/
├── server/              # Backend (Node.js + Express + Baileys)
│   ├── src/            # Source code
│   ├── server.js       # Entry point
│   ├── package.json    # Dependencies
│   └── README.md       # Backend documentation
├── whatsapp-qr.html    # QR Code Scanner UI
└── api-tests.http      # API testing file
```

## 🚀 Quick Start

### Backend Setup

1. **Navigate to server folder:**
   ```bash
   cd server
   ```

2. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

3. **Configure environment:**
   - Update `server/.env` with your credentials
   - MongoDB URI
   - JWT secrets
   - Cloudinary credentials

4. **Start the server:**
   ```bash
   npm run dev
   ```

   Server will start on: **http://localhost:3000**

### Frontend Usage

1. **Open QR Scanner:**
   - Double-click `whatsapp-qr.html`
   - Or open in browser: `file:///path/to/rainCrm/whatsapp-qr.html`

2. **Connect WhatsApp:**
   - Click "Login as Test User"
   - Scan QR code with WhatsApp mobile app
   - Start using the API!

## 📚 Documentation

- **Backend API**: `server/README.md`
- **Testing Guide**: `server/TESTING.md`
- **Quick Start**: `server/QUICKSTART.md`
- **Test Results**: `server/TEST_RESULTS.md`

## 🔗 API Endpoints

All endpoints are available at: `http://localhost:3000/api`

- **Authentication**: `/api/auth/*`
- **WhatsApp**: `/api/whatsapp/*`
- **Messages**: `/api/messages/*`
- **Contacts**: `/api/contacts/*`
- **Groups**: `/api/groups/*`
- **Media**: `/api/media/*`

See `api-tests.http` for all 46 endpoints.

## 🧪 Testing

### Automated Tests
```bash
cd server
bash test-api.sh
```

### REST Client (VS Code)
1. Install "REST Client" extension
2. Open `api-tests.http`
3. Click "Send Request" for each endpoint

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- @whiskeysockets/baileys (WhatsApp)
- Socket.io (Real-time)
- JWT Authentication
- Cloudinary (Media storage)

**Frontend:**
- Pure HTML/CSS/JavaScript
- No framework needed!

## 📝 Development

```bash
cd server
npm run dev  # Development with nodemon
npm start    # Production
```

## 🎯 Features

✅ Multi-tenant WhatsApp connections
✅ JWT authentication
✅ Real-time messaging with Socket.io
✅ Media upload/download
✅ Contact management
✅ Group management
✅ Message reactions & editing
✅ Encrypted session storage
✅ Rate limiting
✅ Comprehensive API (46 endpoints)

## 📱 WhatsApp Connection

Use the beautiful QR scanner page:
1. Open `whatsapp-qr.html`
2. Login with your account
3. Scan QR with WhatsApp
4. All endpoints are now available!

## 🔐 Security

- JWT tokens with refresh mechanism
- AES-256-CBC encryption for sensitive data
- bcrypt password hashing
- Rate limiting on all endpoints
- CORS protection
- Helmet security headers

## 📞 Support

For issues or questions, check:
- `server/TESTING.md` - Testing guide
- `server/README.md` - Full backend documentation
- `server/QUICKSTART.md` - Quick reference

---

**Built with ❤️ for WhatsApp Business automation**
