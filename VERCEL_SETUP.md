# Vercel Deployment Guide

This guide covers environment variable setup and troubleshooting for Vercel deployments.

## Recent Fixes (2026-03-12)

### Fix #1: Localhost URL in Production Builds
**Issue**: ERR_CONNECTION_RESET caused by localhost URL in production builds.

**Solution**: Updated `src/services/api.js` to be environment-aware:
- Production builds now default to Railway backend
- Environment variables take precedence when set
- Localhost is only used in development

### Fix #2: Vercel Configuration Conflict (CRITICAL)
**Issue**: ERR_CONNECTION_RESET persisted even after Fix #1. Build succeeded but site was unreachable.

**Root Cause**: Configuration conflict in `vercel.json` where we specified both:
- `framework: "create-react-app"` (auto-detection)
- `buildCommand` and `outputDirectory` (explicit settings)

This created ambiguity in Vercel's build pipeline causing the routing/serving layer to fail.

**Solution**: Removed redundant configuration from `vercel.json`:
- Removed `framework` property
- Removed `buildCommand` property
- Removed `outputDirectory` property
- Vercel now auto-detects Create React App from `package.json`

**Action Required**: After this fix, you MUST manually redeploy on Vercel (see Troubleshooting section below).

## Environment Variables Setup

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

## Troubleshooting

### Force Clean Rebuild on Vercel

If you're still experiencing issues after updating code:

1. Go to **Vercel Dashboard** → **Deployments**
2. Find the latest deployment
3. Click the **3-dot menu** (⋮) → **Redeploy**
4. **IMPORTANT**: Uncheck "Use existing Build Cache"
5. Click **Redeploy**

This forces Vercel to:
- Pull latest code from GitHub
- Run a fresh build with current environment variables
- Generate new bundles without cached artifacts

### Check Build Logs

If deployment fails:
1. Go to **Deployments** tab in Vercel
2. Click on the failed deployment
3. Review the **Build Logs** for errors
4. Common issues:
   - Missing dependencies
   - Build timeout (increase in project settings)
   - Environment variable not set

### Verify Production Build

After successful deployment:
1. Visit your site: https://nogahub-automation.vercel.app
2. Open DevTools (F12) → **Console** tab
3. Look for any errors (red messages)
4. Go to **Network** tab
5. Perform an action that calls the API
6. Verify API requests go to production backend (not localhost)

### Still Having Issues?

Check these common problems:
- ❌ Environment variables not set in Vercel dashboard
- ❌ Backend API is down or unreachable
- ❌ CSP headers blocking API requests (check Console for CSP errors)
- ❌ Cached build from before the fix (force clean rebuild)
