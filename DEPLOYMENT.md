# 🚀 RainCRM Deployment Guide

This guide details how to deploy your WhatsApp CRM application.
- **Backend**: Deployed on [Railway](https://railway.app) (Recommended for WebSocket/RAM requirements)
- **Frontend**: Deployed on [Vercel](https://vercel.com)

---

## 1. Preparation

1.  **Push to GitHub**: Ensure your project is pushed to a GitHub repository.
    *   The repo should have the `client` and `server` folders in the root.
2.  **Database**:
    *   You need a MongoDB connection string.
    *   **Option A**: Create a MongoDB project on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free Tier is sufficient).
        *   Get the connection string: `mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/?retryWrites=true&w=majority`
    *   **Option B**: Use Railway's built-in MongoDB plugin (Easiest if sticking to Railway).

---

## 2. Deploy Backend (Railway)

Railway is chosen because it supports persistent processes (worker nodes) required for the WhatsApp socket connection and has generous resource limits compared to Render's free tier.

1.  **Login to Railway**: Go to [railway.app](https://railway.app) and login with GitHub.
2.  **New Project**: Click **"New Project"** -> **"Deploy from GitHub repo"**.
3.  **Select Repository**: Choose your `rainCrm` repository.
4.  **Configure Service**:
    *   Railway might try to detect the root. detailed configuration is needed.
    *   Click on the new service card.
    *   Go to **"Settings"**.
    *   **Root Directory**: Set this to `/server`. (Important!)
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm run start` (or `node server.js`)
5.  **Environment Variables**:
    *   Go to the **"Variables"** tab.
    *   Add the following variables:
        *   `PORT`: `8080` (Railway exposes this port automatically)
        *   `MONGODB_URI`: Your MongoDB connection string (from Atlas or Railway plugin).
        *   `JWT_SECRET`: A long random string for security.
        *   `FRONTEND_URL`: `https://your-vercel-app-name.vercel.app` (You will update this *after* deploying the frontend, for CORS).
        *   `OPENAI_API_KEY`: (Optional) If you use OpenAI.
        *   `GEMINI_API_KEY`: (Optional) If you use Google Gemini.
        *   `ANTHROPIC_API_KEY`: (Optional) If you use Claude.
6.  **Deploy**:
    *   Railway will trigger a build. Wait for it to show "Active".
    *   Go to **"Settings"** -> **"Networking"** -> **"Public Networking"**.
    *   Click **"Generate Domain"**.
    *   **Copy this URL** (e.g., `https://whatsapp-crm-production.up.railway.app`). This is your **Backend URL**.

---

## 3. Deploy Frontend (Vercel)

1.  **Login to Vercel**: Go to [vercel.com](https://vercel.com) and login with GitHub.
2.  **Add New Project**: Click **"Add New..."** -> **"Project"**.
3.  **Import Git Repository**: Select your `rainCrm` repository.
4.  **Configure Project**:
    *   **Framework Preset**: Select **Vite**.
    *   **Root Directory**: Click "Edit" and select `client`. (Important!)
    *   **Environment Variables**:
        *   Expand the Environment Variables section.
        *   Key: `VITE_API_URL`
        *   Value: The **Backend URL** you copied from Railway (e.g., `https://whatsapp-crm-production.up.railway.app`). *Note: Do not add a trailing slash.*
5.  **Deploy**:
    *   Click **"Deploy"**.
    *   Vercel will build and assign a domain (e.g., `raincrm-xyx.vercel.app`).

---

## 4. Final Configuration

1.  **Update Backend CORS**:
    *   Go back to **Railway**.
    *   Open your service -> **Variables**.
    *   Update/Add `FRONTEND_URL` with your new **Vercel Domain** (e.g., `https://raincrm-xyx.vercel.app`).
    *   Railway will automatically redeploy the backend with the new setting.

2.  **Verify Connection**:
    *   Open your Vercel app in the browser.
    *   Log in.
    *   Go to "AI Config" or try to connect WhatsApp.
    *   If you see the QR code, the WebSocket connection to Railway is working!

---

## Troubleshooting

*   **WebSocket Errors**: Check that your Vercel `VITE_API_URL` starts with `https://`. Socket.io client handles the conversion to `wss://` automatically.
*   **CORS Errors**: Ensure the `FRONTEND_URL` in Railway perfectly matches your Vercel URL (no training slashes usually best).
*   **Memory Issues**: If Railway crashes, check if you are using too much memory. Railway's trial has limits, but they are generally higher than Render's free tier.
