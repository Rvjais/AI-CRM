# 🚀 RainCRM Deployment Guide

This guide details how to deploy your WhatsApp CRM application.
- **Backend**: Deployed on [Render](https://render.com) (Free Tier)
- **Frontend**: Deployed on [Vercel](https://vercel.com)

> ⚠️ **Render Free Tier Limitations**:
> *   **Sleeps after 15 mins**: If no one uses the app, the backend goes into "sleep" mode. You won't receive WhatsApp messages while it's sleeping.
> *   **Slow Start**: It takes ~50 seconds to wake up when you open the site.
> *   **RAM Limit**: 512MB is tight. Heavy usage might restart the server.

---

## 1. Preparation

1.  **Push to GitHub**: Ensure your project is pushed to a GitHub repository.
2.  **Database**:
    *   You need a MongoDB Atlas Cluster (Free).
    *   Ensure "Network Access" in Atlas allows access from anywhere (`0.0.0.0/0`).
    *   Connection String: `mongodb+srv://<user>:<pass>@cluster...`

---

## 2. Deploy Backend (Render)

1.  **Login to Render**: Go to [dashboard.render.com](https://dashboard.render.com) and login with GitHub.
2.  **New Web Service**:
    *   Click **"New +"** -> **"Web Service"**.
    *   Select **"Build and deploy from a Git repository"**.
    *   Connect your `rainCrm` repository.
3.  **Detail Configuration** (CRITICAL STEPS):
    *   **Name**: `rain-crm-backend` (or similar)
    *   **Region**: Closest to you (e.g., Singapore/Frankfurt).
    *   **Review the following carefully**:
        *   **Root Directory**: `server`  <-- **EXTREMELY IMPORTANT**
        *   **Runtime**: `Node`
        *   **Build Command**: `npm install`
        *   **Start Command**: `node server.js`
    *   **Instance Type**: Free
4.  **Environment Variables**:
    *   Scroll down to **"Advanced"** -> **"Environment Variables"**.
    *   Click **"Add Environment Variable"** for each:
        *   `NODE_ENV`: `production`
        *   `MONGODB_URI`: Your MongoDB Atlas connection string.
        *   `JWT_SECRET`: `ranveer` (or your secret)
        *   `JWT_REFRESH_SECRET`: `ranveer_refresh`
        *   `ENCRYPTION_KEY`: `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` (Must be 64 chars!)
        *   `CLOUDINARY_CLOUD_NAME`: `dt3xfyazz`
        *   `CLOUDINARY_API_KEY`: `446822912389734`
        *   `CLOUDINARY_API_SECRET`: `7n6zOAONqZthk03XK3lBu2GZQbY`
        *   `OPENAI_API_KEY`: Your key.
        *   `GOOGLE_CLIENT_ID`: Your Google Client ID.
        *   `GOOGLE_CLIENT_SECRET`: Your Google Secret.
        *   `REDIRECT_URI`: `https://rain-crm-backend.onrender.com/auth/google/callback` (Update this AFTER you create the service and get the URL).
        *   `FRONTEND_URL`: `https://ai-crm-vert.vercel.app/` (Update after Vercel deploy).
5.  **Create Web Service**:
    *   Click **"Create Web Service"**.
    *   Wait for the build to finish. It might take a few minutes.
    *   **Copy the URL** (top left, looks like `https://rain-crm-backend.onrender.com`).

---

## 3. Deploy Frontend (Vercel)

1.  **Login to Vercel**: Go to [vercel.com](https://vercel.com).
2.  **Add New Project**: **"Add New..."** -> **"Project"** -> Import `rainCrm`.
3.  **Project Settings**:
    *   **Framework Preset**: `Vite`
    *   **Root Directory**: Edit and select `client`.
    *   **Environment Variables**:
        *   `VITE_API_URL`: Paste your **Render Backend URL** (e.g., `https://rain-crm-backend.onrender.com`).
4.  **Deploy**: Click **"Deploy"**.

---

## 4. Final Wiring

1.  **Update Render**:
    *   Go back to Render Dashboard -> Environment.
    *   Edit `FRONTEND_URL` to match your new Vercel domain.
    *   Edit `REDIRECT_URI` to use your actual Render domain.
2.  **Update Google Cloud Console**:
    *   Add your Render Callback URL (`https://...onrender.com/auth/google/callback`) to "Authorized Redirect URIs".
