# 🚀 WhatsApp CRM - Complete Startup Guide

## Project Structure

```
rainCrm/
├── server/              # Backend (Node.js + Express)
│   ├── src/
│   ├── server.js
│   └── .env
├── client/              # Frontend (React + Vite)
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Step-by-Step Startup

### 1. Start the Backend Server

```bash
# Terminal 1
cd server
npm run dev
```

**Expected Output:**
```
✅ Socket.io initialized successfully
✅ MongoDB connected successfully
🚀 WhatsApp Business Platform Server Started
Port: 3000
```

Server will run on: `http://localhost:3000`

### 2. Start the Frontend

```bash
# Terminal 2 (new terminal)
cd client
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

Frontend will run on: `http://localhost:5173`

### 3. Access the Application

Open your browser and go to: **http://localhost:5173**

## Login

Default credentials (pre-filled):
- Email: `test@example.com`
- Password: `Test1234`

## Connect WhatsApp

After logging in:

1. Click on a contact (or wait for QR scan)
2. To connect WhatsApp, use the QR scanner:
   - Open `whatsapp-qr.html` in root folder
   - Scan QR with WhatsApp mobile app
3. Once connected, contacts will appear in the chat list

## Usage Flow

1. **Login** → Enter credentials
2. **Select Chat** → Click a contact from left panel
3. **Send Messages** → Type in the bottom input field
4. **View AI Insights** → Check right panel for sentiment & suggestions
5. **Toggle AI Mode** → Enable in left panel for full AI features

## Troubleshooting

### Backend won't start
- **Issue**: Port 3000 in use
- **Fix**: `killall -9 node && cd server && npm run dev`

### Frontend fails to load
- **Issue**: Dependencies not installed
- **Fix**: `cd client && npm install`

### Can't connect to backend
- **Issue**: CORS or server not running
- **Fix**: Make sure backend is running on port 3000

### No chats showing
- **Issue**: WhatsApp not connected
- **Fix**: Scan QR code using `whatsapp-qr.html`

## Development

### Backend (Port 3000)
```bash
cd server
npm run dev        # Development with nodemon
npm start          # Production
```

### Frontend (Port 5173)
```bash
cd client
npm run dev        # Development
npm run build      # Build for production
npm run preview    # Preview production build
```

## API Endpoints

All available at: `http://localhost:3000/api`

- **Auth**: `/api/auth/login`, `/api/auth/register`
- **WhatsApp**: `/api/whatsapp/connect`, `/api/whatsapp/qr`
- **Messages**: `/api/messages/send`, `/api/messages/:phone`
- **Contacts**: `/api/contacts`
- **Groups**: `/api/groups`
- **Media**: `/api/media/upload`

See `api-tests.http` for all 46 endpoints.

## Features

### Chat List (Left)
- ✅ Three tabs: CHAT, GROUP, ARCHIVED
- ✅ AI-Enhanced Mode toggle
- ✅ Search functionality
- ✅ Contact avatars
- ✅ Unread message badges

### Chat Window (Center)
- ✅ WhatsApp-style messages
- ✅ Send/receive in real-time
- ✅ Message timestamps
- ✅ Contact header

### AI Insights (Right)
- ✅ Sentiment analysis gauge
- ✅ Smart suggestions
- ✅ Conversation summary
- ✅ Real-time updates

## Tech Stack

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- @whiskeysockets/baileys
- Socket.io
- JWT Authentication

**Frontend:**
- React 18
- Vite
- React Icons
- Axios
- Socket.io-client

## Quick Commands Reference

```bash
# Kill all node processes
killall -9 node

# Start both servers (use 2 terminals)
cd server && npm run dev
cd client && npm run dev

# Fresh  install
cd server && npm install
cd client && npm install

# Build for production
cd client && npm run build
```

## Default Ports

- Backend: `3000`
- Frontend: `5173`
- MongoDB: `27017`

---

**🎉 You're all set! Enjoy your WhatsApp CRM!**
