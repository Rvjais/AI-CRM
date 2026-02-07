# Deploying RainCRM Admin Panel to Vercel

This guide explains how to deploy the Admin Panel (`admin` folder) to Vercel.

## Prerequisites
- A [Vercel](https://vercel.com/) account.
- The project pushed to a GitHub repository.

## Step 1: Create `vercel.json` (Optional but Recommended)
In the `admin` folder, create a `vercel.json` file to handle routing for the Single Page Application (SPA).

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```
*Note: This ensures that if you refresh a page like `/dashboard`, Vercel serves `index.html` instead of looking for a file named `dashboard`.*

## Step 2: Vercel Project Setup

1.  **Log in to Vercel** and click **"Add New..."** -> **"Project"**.
2.  **Import your GitHub Repository**.
3.  **Configure Project Settings**:
    *   **Framework Preset**: Vite (Vercel usually detects this automatically).
    *   **Root Directory**: Click "Edit" and select the `admin` folder.
    *   **Build Command**: `npm run build` (Default)
    *   **Output Directory**: `dist` (Default)
    *   **Install Command**: `npm install` (Default)

## Step 3: Environment Variables
You need to set the environment variable so the Admin Panel knows where the backend is.

1.  In the Vercel Project Dashboard, go to **Settings** -> **Environment Variables**.
2.  Add the following variable:
    *   **Key**: `VITE_API_BASE_URL`
    *   **Value**: The URL of your deployed backend (e.g., `https://your-raincrm-backend.onrender.com/api`)
    *   *Make sure to include `/api` at the end if your backend routes require it, or just the base URL depending on your `api.js` configuration.*

## Step 4: Deploy
- Click **Deploy**.
- Vercel will build your React app and deploy it.

## Step 5: Update CORS (Important!)
Your **Backend** (on Render or elsewhere) must allow requests from your new Vercel Admin domain.

1.  Go to your Backend code (`server/.env`).
2.  Update `CORS_ORIGIN` (or `CLIENT_URL`) to include your new Vercel domain.
    *   Example: `CORS_ORIGIN=https://raincrm-client.vercel.app,https://raincrm-admin.vercel.app`
3.  Redeploy your Backend.

## Troubleshooting
- **404 on Refresh**: Ensure `vercel.json` is present in the `admin` folder with the rewrite rule.
- **API Errors**: Check the browser console. If you see CORS errors, you missed **Step 5**. If you see 404s, check your `VITE_API_BASE_URL`.
