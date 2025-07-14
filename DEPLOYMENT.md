# Deployment Guide

## Architecture Overview

This application consists of two parts:
- **Frontend**: React application (deploy to Vercel)
- **Backend**: Node.js/Express API (deploy to Railway/Render/Heroku)

## Prerequisites

1. GitHub account
2. Vercel account
3. Backend hosting account (Railway, Render, or Heroku)

## Step 1: Deploy Backend

### Option A: Railway (Recommended)

1. Push your code to GitHub
2. Go to [Railway](https://railway.app)
3. Connect your GitHub account
4. Select your repository
5. Choose the `backend` folder as the root
6. Set environment variables:
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-production-key
   FRONTEND_URL=https://your-app-name.vercel.app
   PORT=8080
   ```
7. Deploy and note the backend URL

### Option B: Render

1. Push your code to GitHub
2. Go to [Render](https://render.com)
3. Connect your GitHub repository
4. Set root directory to `backend`
5. Use the `render.yaml` configuration
6. Update environment variables
7. Deploy and note the backend URL

### Option C: Heroku

1. Install Heroku CLI
2. Create new Heroku app
3. Set environment variables using Heroku dashboard
4. Deploy backend folder

## Step 2: Deploy Frontend

### Vercel Deployment

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your GitHub repository
4. Configure:
   - Framework: React
   - Root Directory: `.` (root)
   - Build Command: `npm run build`
   - Output Directory: `build`
5. Set environment variables:
   ```
   REACT_APP_API_URL=https://your-backend-url/api
   ```
6. Deploy

## Step 3: Update Configuration

### Update Backend CORS

In your backend hosting platform, set:
```
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### Update Frontend API URL

In Vercel environment variables:
```
REACT_APP_API_URL=https://your-backend-url/api
```

## Step 4: Database Considerations

### Development (SQLite)
- Works locally and for small deployments
- Data persists in the hosting service file system

### Production (Recommended)
- Use external database service:
  - Railway PostgreSQL
  - PlanetScale MySQL
  - Supabase PostgreSQL
  - AWS RDS

Update backend environment variables with database credentials.

## Security Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Update CORS settings for production domain
- [ ] Use HTTPS in production
- [ ] Set secure environment variables
- [ ] Never commit .env files to GitHub

## Common Issues

### CORS Errors
- Ensure FRONTEND_URL matches your Vercel domain exactly
- Include protocol (https://) in URLs

### API Connection Issues
- Verify REACT_APP_API_URL includes /api suffix
- Check backend is running and accessible
- Verify environment variables are set correctly

### Database Issues
- SQLite works for basic deployments
- For high traffic, migrate to PostgreSQL/MySQL
- Check database file permissions on hosting platform

## Testing Deployment

1. Frontend should load without errors
2. Login functionality should work
3. Equipment data should load from backend
4. Projects should save and persist across sessions
5. Admin users should see all projects
6. Regular users should see only their projects

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify environment variables
3. Check backend logs
4. Ensure CORS configuration is correct