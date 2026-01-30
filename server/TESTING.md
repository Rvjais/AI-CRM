# API Endpoint Testing Guide

## Prerequisites Checklist

✅ **Environment Variables**: All set in `.env`
- MongoDB URI: Configured (MongoDB Atlas)
- Cloudinary: Configured
- JWT Secrets: Set
- Encryption Key: Set

✅ **Dependencies**: Installed (336 packages)

## Step-by-Step Testing

### 1. Start the Server

Open a new terminal and run:
```bash
cd /home/veer/rainCrm
npm start
```

Expected output:
```
✅ MongoDB connected successfully
☁️ Cloudinary configured successfully
✅ Socket.io initialized successfully
🚀 WhatsApp Business Platform Server Started
   Port: 5000
```

### 2. Run Automated Tests

In another terminal, run:
```bash
cd /home/veer/rainCrm
./test-api.sh
```

This will test:
- ✅ Health check
- ✅ User registration
- ✅ User login
- ✅ Get current user
- ✅ WhatsApp connection
- ✅ Get chats/contacts/groups
- ✅ Token refresh
- ✅ Profile update

### 3. Manual Testing with cURL

#### A. Authentication Endpoints

**Register User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "name": "Test User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

Save the `accessToken` from the response!

**Get Current User:**
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### B. WhatsApp Endpoints

**Connect WhatsApp:**
```bash
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Get QR Code:**
```bash
curl http://localhost:5000/api/whatsapp/qr \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Check Status:**
```bash
curl http://localhost:5000/api/whatsapp/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Disconnect:**
```bash
curl -X POST http://localhost:5000/api/whatsapp/disconnect \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### C. Message Endpoints

**Send Text Message** (after WhatsApp is connected):
```bash
curl -X POST http://localhost:5000/api/messages/send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatJid": "1234567890@s.whatsapp.net",
    "type": "text",
    "content": {
      "text": "Hello from API!"
    }
  }'
```

**Get All Chats:**
```bash
curl http://localhost:5000/api/messages/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Get Chat Messages:**
```bash
curl http://localhost:5000/api/messages/1234567890@s.whatsapp.net \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Mark as Read:**
```bash
curl -X POST http://localhost:5000/api/messages/mark-read \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chatJid": "1234567890@s.whatsapp.net"}'
```

#### D. Contact Endpoints

**Get Contacts:**
```bash
curl http://localhost:5000/api/contacts/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Sync Contacts:**
```bash
curl -X POST http://localhost:5000/api/contacts/sync \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Check if Number Exists:**
```bash
curl "http://localhost:5000/api/contacts/1234567890@s.whatsapp.net/check?phoneNumber=1234567890" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### E. Group Endpoints

**Get Groups:**
```bash
curl http://localhost:5000/api/groups/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Create Group:**
```bash
curl -X POST http://localhost:5000/api/groups/create \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "participants": ["1234567890@s.whatsapp.net"],
    "description": "Test group description"
  }'
```

#### F. Media Endpoints

**Upload Media:**
```bash
curl -X POST http://localhost:5000/api/media/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

### 4. Testing with Postman

**Import this collection:**

1. Create new Postman collection: "WhatsApp Business Platform"
2. Add Environment Variables:
   - `baseUrl`: `http://localhost:5000/api`
   - `accessToken`: (will be set after login)
3. Create requests for each endpoint

**Postman Benefits:**
- Easy token management
- Visual interface
- Save responses
- Test collections

### 5. Socket.io Testing

**HTML Socket.io Test Client:**

Create `test-socket.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Socket.io Test</title>
    <script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
</head>
<body>
    <h1>WhatsApp Socket.io Test</h1>
    <div id="status">Disconnected</div>
    <button onclick="connect()">Connect</button>
    <div id="events"></div>

    <script>
        let socket;
        const token = 'YOUR_ACCESS_TOKEN'; // Replace with actual token

        function connect() {
            socket = io('http://localhost:5000', {
                auth: { token }
            });

            socket.on('connect', () => {
                document.getElementById('status').innerText = 'Connected';
                addEvent('Connected to server');
            });

            socket.on('whatsapp:qr', (data) => {
                addEvent('QR Code received');
                console.log('QR:', data.qrCode);
            });

            socket.on('whatsapp:connected', (data) => {
                addEvent('WhatsApp connected: ' + data.phoneNumber);
            });

            socket.on('message:new', (data) => {
                addEvent('New message: ' + JSON.stringify(data));
            });
        }

        function addEvent(msg) {
            const div = document.createElement('div');
            div.innerText = new Date().toLocaleTimeString() + ' - ' + msg;
            document.getElementById('events').appendChild(div);
        }
    </script>
</body>
</html>
```

## Troubleshooting

### Server Won't Start
```bash
# Check if port 5000 is already in use
lsof -i :5000

# Kill process if needed
kill -9 <PID>
```

### MongoDB Connection Error
- Check internet connection
- Verify MongoDB Atlas IP whitelist
- Check credentials in `.env`

### WhatsApp Connection Issues
- Ensure mobile app is active
- QR code expires after ~20 seconds
- Try disconnecting and reconnecting

### Authentication Errors
- Check JWT secrets are set
- Verify token is being sent in header
- Check token hasn't expired (15min for access token)

## Expected Results Checklist

- [ ] Server starts without errors
- [ ] Health check returns success
- [ ] User can register
- [ ] User can login and get tokens
- [ ] Protected endpoints require authentication
- [ ] WhatsApp connection initializes
- [ ] QR code is generated
- [ ] After scanning, WhatsApp connects
- [ ] Can retrieve chats/contacts/groups
- [ ] Can send messages
- [ ] Socket.io events are received
- [ ] Media upload works
- [ ] Token refresh works

## Performance Testing

**Test rate limits:**
```bash
# Send 10 requests quickly
for i in {1..10}; do
  curl http://localhost:5000/api/auth/me \
    -H "Authorization: Bearer YOUR_TOKEN" &
done
```

## Next Steps After Testing

1. ✅ All endpoints working → Deploy to production
2. ⚠️ Some issues → Check logs in `logs/` directory
3. ❌ Major issues → Review error messages and fix

## Logs Location

- Combined logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Console output: Terminal where server is running
