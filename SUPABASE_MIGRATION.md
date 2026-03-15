# Supabase Migration Guide

## Overview

This guide documents the complete migration from Railway (PostgreSQL + Express backend) to Supabase for the NogaHub Automation application.

**Migration Type**: Full Supabase Migration
**Date**: March 2026
**Status**: Ready for Deployment

---

## Architecture Changes

### Before (Railway)
```
React Frontend (Vercel)
      ↓
Express Backend (Railway)
      ↓
PostgreSQL Database (Railway)
```

### After (Supabase)
```
React Frontend (Vercel)
      ↓
Supabase Client SDK
      ↓
Supabase (Database + Auth + Edge Functions)
```

### Key Benefits
- ✅ **Eliminated Express backend** - No separate server to maintain
- ✅ **Built-in authentication** - Supabase Auth replaces custom JWT
- ✅ **Row Level Security (RLS)** - Database-level access control
- ✅ **Auto-generated APIs** - REST and GraphQL endpoints
- ✅ **Cost savings** - ~$300-400/year by eliminating Railway
- ✅ **Real-time capabilities** - Live data subscriptions (optional)
- ✅ **Better scalability** - Automatic scaling without infrastructure management

---

## Prerequisites

1. **Node.js** v14+ installed
2. **npm** or **yarn** package manager
3. **Supabase account** (create at [supabase.com](https://supabase.com))
4. **Supabase CLI** (optional, for local development)

---

## Step 1: Create Supabase Project

### 1.1 Sign Up & Create Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - **Name**: NogaHub Automation
   - **Database Password**: (choose a strong password - save it!)
   - **Region**: Choose closest to your users
   - **Pricing**: Start with Free tier

5. Wait for project to initialize (~2 minutes)

### 1.2 Get API Credentials

1. Go to **Project Settings** → **API**
2. Copy the following credentials:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: (starts with `eyJ...`)
   - **service_role key**: (starts with `eyJ...`) - **KEEP THIS SECRET!**

---

## Step 2: Run Database Migrations

### 2.1 Install Supabase CLI (Recommended)

```bash
npm install -g supabase
```

### 2.2 Link Project

```bash
# Navigate to project directory
cd /path/to/nogahub-automation

# Initialize Supabase (if not already done)
supabase init

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

**Note**: Your project ref is in the Project URL: `https://YOUR_PROJECT_REF.supabase.co`

### 2.3 Push Migrations

```bash
# Push all migrations to Supabase
supabase db push
```

This will create:
- ✅ `users` table with role-based access
- ✅ `equipment` table with 31 items
- ✅ `projects` table with JSONB fields
- ✅ Row Level Security (RLS) policies
- ✅ Database triggers and functions

### 2.4 Verify Database Schema

1. Go to Supabase Dashboard → **Table Editor**
2. Verify tables exist:
   - `users` (should be empty)
   - `equipment` (should have 31 rows)
   - `projects` (should be empty)

3. Go to **Database** → **Policies**
4. Verify RLS is enabled on all tables

---

## Step 3: Seed Users

### 3.1 Set Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3.2 Run User Seed Script

```bash
node scripts/seed-users.js
```

This creates the default users:
- **admin@nogahub.com** (admin) - Password: `admin123`
- **nadeem@nogahub.com** (admin) - Password: `Nadeem123`
- **issa@nogahub.com** (admin) - Password: `Issa123`
- **kareem@nogahub.com** (user) - Password: `Kareem123`
- **ammar@nogahub.com** (user) - Password: `Ammar123`

### 3.3 Verify Users

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. You should see 5 users
3. Go to **Table Editor** → **users** table
4. Verify roles are set correctly (3 admins, 2 users)

---

## Step 4: Update Frontend Code

### 4.1 Install Dependencies (Already Done)

```bash
npm install @supabase/supabase-js @tanstack/react-query @tanstack/react-query-devtools
```

### 4.2 Code Changes Summary

The following files have been created/modified:

#### New Files Created:
- `src/lib/supabase.js` - Supabase client configuration
- `src/services/supabaseService.js` - Service layer for Supabase queries
- `src/providers/QueryProvider.jsx` - React Query provider
- `scripts/seed-users.js` - User seeding script
- `supabase/migrations/` - Database migrations
- `supabase/config.toml` - Supabase configuration

#### Modified Files:
- `src/hooks/useAuth.js` - Updated to use Supabase Auth
- `.env.example` - Added Supabase environment variables

#### Backup Files (for rollback):
- `src/hooks/useAuth.js.backup` - Original auth hook

### 4.3 Update App.js to Use Providers

You need to wrap your app with the `QueryProvider`. Edit `src/App.js` or `src/index.js`:

```jsx
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        {/* Your app components */}
      </AuthProvider>
    </QueryProvider>
  );
}
```

### 4.4 Update Components to Use Supabase Service

Replace API calls with Supabase service:

**Before (using old API service):**
```jsx
import apiService from './services/api';

const { equipment } = await apiService.getEquipment();
```

**After (using Supabase service):**
```jsx
import supabaseService from './services/supabaseService';

const { equipment } = await supabaseService.getEquipment();
```

**With React Query (recommended):**
```jsx
import { useQuery } from '@tanstack/react-query';
import supabaseService from './services/supabaseService';

const { data, isLoading, error } = useQuery({
  queryKey: ['equipment'],
  queryFn: () => supabaseService.getEquipment()
});
```

---

## Step 5: Testing

### 5.1 Local Testing

```bash
npm start
```

1. **Test Login**:
   - Go to login page
   - Try logging in with `nadeem@nogahub.com` / `Nadeem123`
   - Verify successful login and redirect

2. **Test Equipment Catalog**:
   - Navigate to equipment page
   - Verify 31 items load correctly
   - Test filtering by category (if implemented)

3. **Test Project Management**:
   - Create a new project
   - Save project
   - Verify it appears in projects list
   - Edit and delete project
   - Verify RLS: regular users see only their projects, admins see all

4. **Test User Roles**:
   - Log in as admin (Nadeem or Issa)
   - Verify can see all projects
   - Log in as regular user (Kareem or Ammar)
   - Verify can only see own projects

5. **Test Logout**:
   - Click logout
   - Verify redirect to login page
   - Verify session is cleared

### 5.2 Check Browser Console

Look for any errors in the browser console. Common issues:
- Missing environment variables
- RLS policy errors (permission denied)
- Network errors (check Supabase URL)

---

## Step 6: Deploy to Production

### 6.1 Update Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

2. Add the following variables:

   | Variable | Value | Environment |
   |----------|-------|-------------|
   | `REACT_APP_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
   | `REACT_APP_SUPABASE_ANON_KEY` | `your-anon-key` | Production, Preview, Development |

3. **DO NOT** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel (only use locally for seed scripts)

### 6.2 Update vercel.json (if needed)

Add Supabase to Content Security Policy:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; connect-src 'self' https://*.supabase.co https://vercel.com; ..."
        }
      ]
    }
  ]
}
```

### 6.3 Deploy

```bash
git add .
git commit -m "Migrate to Supabase backend"
git push origin main
```

Vercel will automatically deploy.

### 6.4 Verify Production Deployment

1. Visit your production URL: `https://nogahub-automation.vercel.app`
2. Test login with production credentials
3. Verify all functionality works

---

## Step 7: Cleanup (After Verification)

### 7.1 Monitor for 1 Week

Keep Railway backend running for 1 week as a safety net. Monitor:
- Error rates
- User feedback
- Performance metrics

### 7.2 Decommission Railway

After successful verification:

1. Go to Railway Dashboard
2. Delete the backend service
3. Delete the PostgreSQL database
4. Cancel Railway subscription (if applicable)

### 7.3 Remove Old Code

Once confident in migration:

```bash
# Remove backend directory
rm -rf backend/

# Remove old API service
rm src/services/api.js

# Remove backup files
rm src/hooks/useAuth.js.backup

# Commit changes
git add .
git commit -m "Remove legacy backend code"
git push
```

---

## Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution**: Verify `.env` file exists and has correct values:
```bash
cat .env
```

### Issue: "Invalid login credentials"

**Possible Causes**:
1. Users not seeded properly
2. Wrong password
3. Email typo

**Solution**: Re-run seed script:
```bash
node scripts/seed-users.js
```

### Issue: "Row Level Security policy violation"

**Possible Causes**:
1. RLS policies not applied
2. User role not set correctly

**Solution**: Check RLS policies in Supabase Dashboard → Database → Policies

### Issue: "Could not fetch user profile"

**Possible Causes**:
1. `users` table doesn't have matching record
2. Trigger not working

**Solution**: Manually verify user exists in `users` table with correct `id` matching `auth.users`

### Issue: "Connection refused" or "Network error"

**Possible Causes**:
1. Wrong Supabase URL
2. Supabase project paused (free tier)

**Solution**: Verify URL in Supabase Dashboard → Settings → API

---

## Rollback Plan

If you need to rollback to Railway:

### 1. Restore Old Code

```bash
# Restore old auth hook
cp src/hooks/useAuth.js.backup src/hooks/useAuth.js

# Restore old API service import in components
# (Manual find/replace from supabaseService to apiService)
```

### 2. Update Environment Variables

```bash
# In .env or Vercel
REACT_APP_API_URL=https://nogahubautomation-production.up.railway.app/api
```

### 3. Redeploy

```bash
git add .
git commit -m "Rollback to Railway backend"
git push
```

---

## Performance Optimization

### Enable React Query Caching

Wrap data fetching with React Query for automatic caching:

```jsx
import { useQuery } from '@tanstack/react-query';
import supabaseService from '../services/supabaseService';

function EquipmentList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => supabaseService.getEquipment(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.equipment.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

### Enable Real-time Subscriptions (Optional)

For live project updates:

```jsx
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

useEffect(() => {
  const subscription = supabase
    .channel('projects')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'projects' },
      (payload) => {
        console.log('Project changed:', payload);
        // Invalidate React Query cache
        queryClient.invalidateQueries(['projects']);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}, []);
```

---

## Security Checklist

- ✅ RLS enabled on all tables
- ✅ Service role key not in frontend code
- ✅ Service role key not in Vercel environment variables
- ✅ CORS configured correctly
- ✅ Content Security Policy includes Supabase domain
- ✅ Auth tokens stored securely (localStorage with HTTPOnly would be better)
- ✅ Passwords hashed by Supabase Auth
- ✅ Email confirmation disabled (adjust if needed)

---

## Support & Resources

### Supabase Documentation
- [Supabase Docs](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Auth Guide](https://supabase.com/docs/guides/auth)

### Project Files
- `SUPABASE_MIGRATION.md` - This file
- `DEPLOYMENT.md` - General deployment guide
- `VERCEL_SETUP.md` - Vercel-specific setup

### Getting Help
1. Check Supabase Dashboard logs
2. Check browser console for errors
3. Review RLS policies
4. Contact Supabase support (Pro plan+)

---

## Summary

### What Changed
- ❌ **Removed**: Express backend, Railway hosting, custom JWT auth
- ✅ **Added**: Supabase Auth, RLS policies, React Query, direct database queries

### File Structure
```
nogahub-automation/
├── supabase/
│   ├── config.toml                    # Supabase configuration
│   └── migrations/                    # Database migrations
│       ├── 20260315000001_initial_schema.sql
│       ├── 20260315000002_rls_policies.sql
│       └── 20260315000003_seed_equipment.sql
├── scripts/
│   └── seed-users.js                  # User seeding script
├── src/
│   ├── lib/
│   │   └── supabase.js                # Supabase client
│   ├── services/
│   │   └── supabaseService.js         # Service layer
│   ├── providers/
│   │   └── QueryProvider.jsx          # React Query provider
│   └── hooks/
│       └── useAuth.js                 # Updated auth hook
├── .env.example                       # Environment variables template
└── SUPABASE_MIGRATION.md             # This file
```

### Next Steps After Migration
1. ✅ Test thoroughly in production
2. ✅ Monitor for errors and performance issues
3. ✅ Collect user feedback
4. ✅ After 1 week: decommission Railway
5. ✅ Remove old backend code
6. ✅ Update documentation

---

**Migration Date**: March 15, 2026
**Status**: Complete
**Estimated Time to Complete**: 2-3 hours
