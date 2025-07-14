# Vercel Deployment Guide

## 🚀 Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account (free)
- Your database URL (already configured)

### Step 1: Deploy to Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import Project**
   - Click "Add New..." → "Project"
   - Import your `MaintainPro-Replit` repository
   - Vercel will auto-detect it as a Node.js project

3. **Configure Environment Variables**
   Add these environment variables in Vercel:
   ```
   DATABASE_URL=postgresql://postgres.jbmvfxtaiqittkdjwjjc:3vuLVCIltP3YmRhx@aws-0-us-east-2.pooler.supabase.com:6543/postgres
   NODE_ENV=production
   SESSION_SECRET=your-secure-session-secret-here
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application

### Step 2: Configure Custom Domain (Optional)
- In Vercel dashboard, go to your project
- Go to "Settings" → "Domains"
- Add your custom domain

### Environment Variables Setup

In Vercel Dashboard → Your Project → Settings → Environment Variables:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql://postgres.jbmvfxtaiqittkdjwjjc:3vuLVCIltP3YmRhx@aws-0-us-east-2.pooler.supabase.com:6543/postgres` |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | `your-secure-random-string` |

### Automatic Deployments

✅ **Configured**: Every push to `main` branch will trigger automatic deployment

### Post-Deployment

1. **Database Setup** (if needed)
   ```bash
   # Run migrations on deployed app
   npx drizzle-kit push --url="your-database-url"
   ```

2. **Verify Deployment**
   - Visit your Vercel app URL
   - Check API endpoints work: `your-app.vercel.app/api/dashboard/stats`
   - Test the frontend interface

### Troubleshooting

**Build Errors:**
- Check Vercel build logs
- Ensure all environment variables are set
- Verify database connectivity

**Runtime Errors:**
- Check Vercel function logs
- Ensure DATABASE_URL is correctly formatted
- Verify Supabase database is accessible

**API Routes Not Working:**
- Check `vercel.json` configuration
- Ensure API routes are properly defined
- Verify serverless function limits

### Production Optimizations

The application is configured with:
- ✅ Static asset optimization
- ✅ API route optimization
- ✅ Database connection pooling
- ✅ Environment-based configuration
- ✅ Proper error handling

Your application is ready for production deployment on Vercel!
