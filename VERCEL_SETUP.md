# Vercel Environment Variables Setup

After deploying to Vercel, you need to configure the following environment variables in the Vercel dashboard.

## Required Environment Variables

### 1. API URL Configuration

Set the production API URL:

```
REACT_APP_API_URL=https://nogahub-api.onrender.com/api
```

**OR** if using Railway:

```
REACT_APP_API_URL=https://nogahubautomation-production.up.railway.app/api
```

> **Important**: Choose the URL where your backend is actually deployed. Based on your `vercel.json` CSP settings, you have both URLs whitelisted.

### 2. Admin Credentials

```
REACT_APP_ADMIN_USERNAME=Nadeem
REACT_APP_ADMIN_PASSWORD=Nadeem123
REACT_APP_ADMIN2_USERNAME=Issa
REACT_APP_ADMIN2_PASSWORD=Issa123
```

### 3. User Credentials

```
REACT_APP_USER_USERNAME=Kareem
REACT_APP_USER_PASSWORD=Kareem123
REACT_APP_USER2_USERNAME=Ammar
REACT_APP_USER2_PASSWORD=Ammar123
```

## How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: `nogahub-automation`
3. Navigate to **Settings** > **Environment Variables**
4. Add each variable with:
   - **Name**: The variable name (e.g., `REACT_APP_API_URL`)
   - **Value**: The corresponding value
   - **Environment**: Select **Production** (or All if you want same values for preview/development)
5. Click **Save**
6. **Redeploy** your application for the changes to take effect

## Verify After Deployment

After setting the environment variables and redeploying:

1. Open browser DevTools (F12) on your deployed site
2. Go to the **Network** tab
3. Perform an action that calls the API
4. Check that API requests are going to the correct production URL (not localhost)

## Security Notes

- Never commit `.env` files to version control
- Rotate credentials periodically
- Use Vercel's encrypted environment variable storage
- Consider using a more secure authentication method for production (JWT tokens, OAuth, etc.)
