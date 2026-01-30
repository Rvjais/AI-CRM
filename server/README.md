# WhatsApp Business Platform - Backend

A complete, robust multi-tenant WhatsApp Business Platform with real-time messaging, media management, and full WhatsApp functionality.

## Features

- 🔐 **JWT Authentication** - Secure user authentication with access and refresh tokens
- 📱 **WhatsApp Integration** - Full Baileys integration for WhatsApp Business messaging
- 💬 **Real-time Messaging** - Socket.io for instant message delivery
- 📁 **Media Management** - Cloudinary integration for image, video, and document storage
- 👥 **Multi-tenant** - Complete user isolation and session management
- 🔒 **Security** - Encrypted session storage, rate limiting, and input validation
- 📊 **Complete API** - RESTful endpoints for all WhatsApp operations

## Tech Stack

- **Backend**: Node.js + Express (ES6 Modules)
- **Database**: MongoDB + Mongoose
- **Real-time**: Socket.io
- **WhatsApp**: @whiskeysockets/baileys
- **Storage**: Cloudinary
- **Authentication**: JWT
- **Encryption**: AES-256-CBC

## Installation

1. **Clone the repository**
   ```bash
   cd rainCrm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your values:
   - MongoDB connection string
   - JWT secrets (generate secure random strings)
   - Encryption key (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - Cloudinary credentials

4. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /refresh-token` - Refresh access token
- `POST /logout` - Logout user
- `GET /me` - Get current user
- `PUT /profile` - Update profile
- `PUT /password` - Change password

### WhatsApp (`/api/whatsapp`)
- `POST /connect` - Initialize WhatsApp connection
- `GET /qr` - Get QR code for scanning
- `POST /disconnect` - Disconnect WhatsApp
- `GET /status` - Get connection status
- `GET /phone-info` - Get connected phone info

### Messages (`/api/messages`)
- `POST /send` - Send message
- `GET /` - Get all chats
- `GET /:chatJid` - Get chat messages
- `DELETE /:messageId` - Delete message
- `PUT /:messageId/edit` - Edit message
- `POST /:messageId/react` - React to message
- `POST /mark-read` - Mark messages as read
- `GET /unread` - Get unread count

### Contacts (`/api/contacts`)
- `GET /` - Get all contacts
- `POST /sync` - Sync contacts from WhatsApp
- `GET /:jid` - Get contact details
- `PUT /:jid` - Update contact
- `DELETE /:jid` - Delete contact
- `POST /:jid/block` - Block contact
- `POST /:jid/unblock` - Unblock contact
- `GET /:jid/check` - Check if number exists

### Groups (`/api/groups`)
- `POST /create` - Create group
- `GET /` - Get all groups
- `GET /:groupJid` - Get group details
- `PUT /:groupJid` - Update group settings
- `DELETE /:groupJid/leave` - Leave group
- `POST /:groupJid/participants` - Add/Remove participants
- `GET /:groupJid/invite-code` - Get invite code
- `POST /join/:code` - Join via invite code

### Media (`/api/media`)
- `POST /upload` - Upload media
- `GET /:messageId` - Get media by message
- `DELETE /:mediaId` - Delete media

## Socket.io Events

### Client → Server
- `authenticate` - Authenticate socket connection
- `typing` - Send typing indicator
- `update_presence` - Update presence status

### Server → Client
- `whatsapp:qr` - QR code for scanning
- `whatsapp:connected` - Connection successful
- `whatsapp:disconnected` - Connection lost
- `whatsapp:error` - Connection error
- `message:new` - New message received
- `message:update` - Message status update
- `message:deleted` - Message deleted
- `chat:typing` - Typing indicator

## Project Structure

```
rainCrm/
├── src/
│   ├── config/         # Configuration files
│   ├── models/         # Mongoose models
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic
│   ├── middleware/     # Express middleware
│   ├── routes/         # API routes
│   ├── utils/          # Utility functions
│   ├── socket/         # Socket.io handlers
│   ├── whatsapp/       # Baileys integration
│   └── app.js          # Express app
├── server.js           # Entry point
├── package.json
└── .env
```

## Security Features

- **JWT Authentication** with refresh tokens
- **Encrypted Session Storage** (AES-256-CBC)
- **Rate Limiting** on all endpoints
- **Input Validation** with Joi schemas
- **Password Hashing** with bcrypt
- **CORS Protection**
- **Helmet Security Headers**

## Usage

1. **Register a new user**
   ```bash
   POST /api/auth/register
   {
     "email": "user@example.com",
     "password": "SecurePass123",
     "name": "John Doe"
   }
   ```

2. **Login**
   ```bash
   POST /api/auth/login
   {
     "email": "user@example.com",
     "password": "SecurePass123"
   }
   ```

3. **Connect WhatsApp**
   ```bash
   POST /api/whatsapp/connect
   Headers: Authorization: Bearer <access_token>
   ```

4. **Get QR Code**
   ```bash
   GET /api/whatsapp/qr
   Headers: Authorization: Bearer <access_token>
   ```

5. **Send Message**
   ```bash
   POST /api/messages/send
   Headers: Authorization: Bearer <access_token>
   {
     "chatJid": "1234567890@s.whatsapp.net",
     "type": "text",
     "content": {
       "text": "Hello, World!"
     }
   }
   ```

## Development

```bash
# Install nodemon for development
npm install -D nodemon

# Run in development mode
npm run dev
```

## Environment Variables

See `.env.example` for all required variables.

## License

ISC

## Support

For issues and questions, please create an issue in the repository.
