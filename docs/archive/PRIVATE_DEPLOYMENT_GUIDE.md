# Private Tourify Deployment Guide

This guide will walk you through deploying Tourify to a private, unlisted domain accessible only to you and your crew.

## Step 1: Vercel Authentication

### 1.1 Login to Vercel

```bash
# Login with email and password first
vercel login

# Then link your GitHub account if needed
```

### 1.2 Verify Login

```bash
vercel whoami
```

## Step 2: Prepare Environment Variables

Before deploying, you'll need these environment variables ready:

### Required Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=https://your-private-domain.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-private-domain.vercel.app
```

### Optional Variables
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
RESEND_API_KEY=your_resend_api_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
```

## Step 3: Deploy to Vercel

### 3.1 Initial Deployment

```bash
# Deploy to Vercel (this will create a new project)
vercel

# Follow the prompts:
# - Set up and deploy: Yes
# - Which scope: Select your account
# - Link to existing project: No
# - Project name: tourify-private (or your preferred name)
# - Directory: ./ (current directory)
# - Override settings: No
```

### 3.2 Deploy to Production

```bash
# Deploy to production environment
vercel --prod
```

## Step 4: Configure Private Access

### 4.1 Set Up Password Protection

1. **Go to your Vercel dashboard**
2. **Navigate to your project**
3. **Go to Settings > Domains**
4. **Add a custom domain** (optional but recommended)
5. **Enable Password Protection**:
   - Go to Settings > Password Protection
   - Enable password protection
   - Set a strong password
   - Share this password only with your crew

### 4.2 Alternative: IP Whitelist (More Secure)

For even more security, you can whitelist specific IP addresses:

1. **Create a middleware for IP filtering**:

```typescript
// app/middleware.ts (add this to your existing middleware)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_IPS = [
  'YOUR_IP_ADDRESS',
  'CREW_MEMBER_1_IP',
  'CREW_MEMBER_2_IP',
  // Add more IPs as needed
]

export function middleware(request: NextRequest) {
  const clientIP = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]
  
  // Allow access only from whitelisted IPs
  if (!ALLOWED_IPS.includes(clientIP || '')) {
    return new NextResponse('Access Denied', { status: 403 })
  }
  
  // Continue with your existing middleware logic
  return NextResponse.next()
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
}
```

## Step 5: Configure Supabase for Private Access

### 5.1 Update Supabase Auth Settings

1. **Go to your Supabase dashboard**
2. **Navigate to Authentication > URL Configuration**
3. **Update Site URL** to your private domain
4. **Add redirect URLs**:
   ```
   https://your-private-domain.vercel.app/auth/callback
   https://your-private-domain.vercel.app/login
   https://your-private-domain.vercel.app/signup
   ```

### 5.2 Configure RLS Policies

Ensure your Row Level Security policies are properly configured for your crew:

```sql
-- Example: Allow only authenticated users to access data
CREATE POLICY "Users can view their own data" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Add more specific policies for your crew
```

## Step 6: Set Environment Variables in Vercel

### 6.1 Via Vercel CLI

```bash
# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_APP_URL
vercel env add NEXT_PUBLIC_SITE_URL

# Add optional variables
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add RESEND_API_KEY
```

### 6.2 Via Vercel Dashboard

1. **Go to your project settings**
2. **Navigate to Environment Variables**
3. **Add each variable** with the Production environment selected

## Step 7: Configure Custom Domain (Optional)

### 7.1 Add Custom Domain

1. **Go to Vercel dashboard > Settings > Domains**
2. **Add your custom domain**
3. **Update DNS settings** as instructed
4. **Update environment variables** with the new domain

### 7.2 Unlisted Domain Strategy

For maximum privacy, consider:
- Using a random subdomain (e.g., `tourify-xyz123.vercel.app`)
- Not linking it to any public repositories
- Not sharing the URL publicly

## Step 8: Security Enhancements

### 8.1 Add Security Headers

Your `next.config.js` already includes security headers, but you can enhance them:

```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        // Add more security headers as needed
      ],
    },
  ]
}
```

### 8.2 Disable Search Engine Indexing

Add a `robots.txt` file to prevent search engine indexing:

```txt
# public/robots.txt
User-agent: *
Disallow: /
```

## Step 9: Crew Access Management

### 9.1 Share Access Securely

1. **Create a secure document** with:
   - Private domain URL
   - Login credentials (if using password protection)
   - IP addresses (if using IP whitelist)
   - Environment-specific instructions

2. **Share via secure channels**:
   - Encrypted messaging
   - Password managers
   - Secure team communication tools

### 9.2 Monitor Access

1. **Set up Vercel Analytics** to monitor usage
2. **Check Supabase logs** for database access
3. **Monitor authentication attempts**

## Step 10: Testing and Verification

### 10.1 Test Core Functionality

1. **Authentication**: Test signup, login, logout
2. **Database Operations**: Test CRUD operations
3. **File Uploads**: Test image/file uploads
4. **API Routes**: Test all API endpoints
5. **Real-time Features**: Test any real-time functionality

### 10.2 Security Testing

1. **Test IP restrictions** (if implemented)
2. **Verify password protection** works
3. **Check that the site is not indexed** by search engines
4. **Test from different locations** (crew members)

## Step 11: Maintenance and Updates

### 11.1 Regular Updates

```bash
# Deploy updates
git push origin main
vercel --prod

# Or use the deployment script
./scripts/deploy-to-vercel.sh
```

### 11.2 Monitor Performance

1. **Vercel Analytics**: Monitor performance metrics
2. **Supabase Dashboard**: Monitor database performance
3. **Error Tracking**: Set up error monitoring

## Troubleshooting

### Common Issues

1. **Authentication Failures**:
   - Check Supabase URL configuration
   - Verify redirect URLs in Supabase settings
   - Ensure environment variables are correct

2. **Access Denied Errors**:
   - Check IP whitelist configuration
   - Verify password protection settings
   - Check middleware configuration

3. **Build Failures**:
   - Check environment variables
   - Verify all dependencies are installed
   - Check for TypeScript errors

### Debug Commands

```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Check environment variables
vercel env ls

# Redeploy
vercel --prod --force
```

## Quick Deployment Commands

```bash
# 1. Login to Vercel
vercel login

# 2. Deploy to production
vercel --prod

# 3. Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# 4. Redeploy with new variables
vercel --prod
```

## Security Checklist

- [ ] Password protection enabled
- [ ] IP whitelist configured (optional)
- [ ] Environment variables set
- [ ] Supabase auth configured
- [ ] RLS policies configured
- [ ] Security headers enabled
- [ ] Search engine indexing disabled
- [ ] Crew access documented
- [ ] Monitoring set up

---

Your private Tourify deployment is now ready! 🚀

**Remember**: Keep your private domain URL and credentials secure and only share with trusted crew members. 