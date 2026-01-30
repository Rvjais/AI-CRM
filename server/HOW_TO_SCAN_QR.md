# 📱 How to Scan WhatsApp QR Code

## Quick Method: Use the HTML Page

1. **Open the QR page**:
   ```bash
   # Open in your default browser
   xdg-open whatsapp-qr.html
   
   # Or just double-click: whatsapp-qr.html
   ```

2. **Enter your access token**:
   - Copy this token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTdjODQ1MjdkYjU0NDcwZWMzNWQyMzQiLCJpYXQiOjE3Njk3NjgwMTgsImV4cCI6MTc2OTc2ODkxOH0.hFCEIXvRRZbCD04MtDSS_KLY6M8zg3BWTq8PONkVMO0`
   - (Get new token by running: `bash test-api.sh` if expired)
   - Paste it in the input field

3. **Click "Connect WhatsApp"**
   - Wait 2-3 seconds for QR code to appear

4. **Scan with WhatsApp**:
   - Open WhatsApp on your phone
   - Go to **Settings** → **Linked Devices**
   - Tap **Link a Device**
   - Point your camera at the QR code on screen

5. **Done!**
   - Once scanned, you'll see "✅ WhatsApp Connected Successfully!"
   - Now all WhatsApp endpoints will work!

---

## Alternative Method: Get QR via API

If you prefer command line:

```bash
# Get your token from test-api.sh or login
TOKEN="your_access_token_here"

# Connect WhatsApp
curl -X POST http://localhost:5000/api/whatsapp/connect \
  -H "Authorization: Bearer $TOKEN"

# Wait 2-3 seconds, then get QR
curl http://localhost:5000/api/whatsapp/qr \
  -H "Authorization: Bearer $TOKEN"
```

The QR code will be returned as a base64 data URL. You can:
1. Copy the base64 string
2. Paste it into an `<img>` tag in any HTML file
3. Open in browser and scan

---

## QR Code HTML Template

If API method, save this as `qr.html`:

```html
<!DOCTYPE html>
<html>
<head><title>WhatsApp QR</title></head>
<body style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;">
    <div style="text-align:center;">
        <h2>Scan with WhatsApp</h2>
        <!-- PASTE QR BASE64 HERE -->
        <img src="data:image/png;base64,PASTE_QR_CODE_HERE" style="border:10px solid white;box-shadow:0 5px 20px rgba(0,0,0,0.2);">
    </div>
</body>
</html>
```

---

## Troubleshooting

**QR not showing?**
- Wait 2-3 seconds after connecting
- Try refreshing
- Check server is running (`npm run dev`)

**QR expired?**
- QR codes expire after ~20 seconds
- Click "Refresh QR Code" button
- Or reconnect

**Already scanned but not connecting?**
- Check phone has internet
- Make sure you clicked "Link Device" in WhatsApp
- Try disconnecting and reconnecting

---

## ✅ After Scanning

Once connected, test these endpoints:

1. **Check Status**:
   ```bash
   curl http://localhost:5000/api/whatsapp/status -H "Authorization: Bearer $TOKEN"
   ```

2. **Get Phone Info**:
   ```bash
   curl http://localhost:5000/api/whatsapp/phone-info -H "Authorization: Bearer $TOKEN"
   ```

3. **Send a Message**:
   ```bash
   curl -X POST http://localhost:5000/api/messages/send \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "chatJid": "1234567890@s.whatsapp.net",
       "type": "text",
       "content": {"text": "Hello from API!"}
     }'
   ```

Now all 46 endpoints are fully functional! 🎉
