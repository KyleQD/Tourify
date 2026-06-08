# Tourify Vercel Deployment Guide

This guide will walk you through deploying your Tourify platform to Vercel.

## Prerequisites

- [Vercel account](https://vercel.com)
- [Supabase project](https://supabase.com) 
- [GitHub repository](https://github.com) (recommended)

## Step 1: Prepare Your Supabase Project

### 1.1 Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** > **API**
4. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

### 1.2 Configure Supabase for Production

1. **Enable Row Level Security (RLS)** on all tables
2. **Set up authentication providers** (Google, etc.) if needed
3. **Configure storage buckets** for file uploads
4. **Apply database migrations** to ensure schema is up to date

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Option B: Deploy via GitHub Integration

1. **Connect your GitHub repository** to Vercel
2. **Import your project** in Vercel dashboard
3. **Configure build settings**:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm ci`

## Step 3: Configure Environment Variables

Add these environment variables in your Vercel project settings:

### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application URLs
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

### Optional Variables

```bash
# Google OAuth (if using Google auth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Services
RESEND_API_KEY=your_resend_api_key

# Payment Processing (if using Stripe)
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Redis (for caching)
REDIS_URL=redis://your_redis_url

# Analytics
NEXT_TELEMETRY_DISABLED=1
```

### How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Click **Add New**
4. Enter the variable name and value
5. Select **Production** environment
6. Click **Save**

## Step 4: Configure Custom Domain (Optional)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Domains**
3. Add your custom domain
4. Update your DNS settings as instructed
5. Update your environment variables with the new domain

## Step 5: Post-Deployment Verification

### 5.1 Test Core Functionality

1. **Authentication**: Test signup, login, and logout
2. **Database Operations**: Test CRUD operations
3. **File Uploads**: Test image/file uploads
4. **API Routes**: Test all API endpoints
5. **Real-time Features**: Test any real-time functionality

### 5.2 Performance Monitoring

1. **Enable Vercel Analytics**:
   ```bash
   vercel analytics enable
   ```

2. **Monitor Core Web Vitals** in Vercel dashboard

3. **Set up error tracking** (Sentry, etc.)

### 5.3 Security Checklist

- [ ] All environment variables are set
- [ ] Supabase RLS policies are configured
- [ ] API routes have proper authentication
- [ ] CORS is properly configured
- [ ] Security headers are enabled

## Step 6: Database Migration (if needed)

If you need to run database migrations on production:

1. **Create a migration script**:
   ```bash
   # Create a new API route for migrations
   touch app/api/migrations/route.ts
   ```

2. **Run migrations** via API call or direct database access

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **Environment Variable Issues**:
   - Ensure all required variables are set
   - Check variable names for typos
   - Verify variables are set for Production environment

3. **Database Connection Issues**:
   - Verify Supabase URL and keys
   - Check RLS policies
   - Ensure database is accessible from Vercel

4. **Authentication Issues**:
   - Verify Supabase auth configuration
   - Check redirect URLs in Supabase settings
   - Ensure environment variables are correct

### Debug Commands

```bash
# Check Vercel deployment status
vercel ls

# View deployment logs
vercel logs

# Check environment variables
vercel env ls

# Redeploy with fresh build
vercel --prod --force
```

## Performance Optimization

1. **Enable Edge Functions** for heavy API routes
2. **Optimize images** using Next.js Image component
3. **Implement caching** strategies
4. **Use CDN** for static assets

## Monitoring and Analytics

1. **Vercel Analytics**: Built-in performance monitoring
2. **Error Tracking**: Set up Sentry or similar
3. **Database Monitoring**: Use Supabase dashboard
4. **Uptime Monitoring**: Set up external monitoring

## Security Best Practices

1. **Never commit secrets** to your repository
2. **Use environment variables** for all sensitive data
3. **Enable security headers** (already configured)
4. **Regular security audits** of dependencies
5. **Monitor for vulnerabilities** in your dependencies

## Support

If you encounter issues:

1. Check the [Vercel documentation](https://vercel.com/docs)
2. Review [Supabase documentation](https://supabase.com/docs)
3. Check your deployment logs in Vercel dashboard
4. Verify your environment variables are correctly set

## Quick Deployment Script

Use the provided deployment script:

```bash
# Make the script executable
chmod +x scripts/deploy-to-vercel.sh

# Run the deployment
./scripts/deploy-to-vercel.sh
```

This script will:
- Check dependencies
- Verify environment variables
- Install dependencies
- Run tests
- Build the application
- Deploy to Vercel

---

Your Tourify platform should now be successfully deployed on Vercel! 🚀 