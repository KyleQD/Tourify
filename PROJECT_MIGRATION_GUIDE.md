# Project Migration Guide: Transitioning to New Secure Project

## ⚠️ Security Incident Response

This guide walks through securely migrating your codebase after a compromise.

---

## Phase 1: IMMEDIATE ACTIONS (Do First)

### 1.1 Revoke All Credentials

#### Supabase
- [ ] Go to Supabase Dashboard → Settings → API
- [ ] Note down what keys existed (for documentation)
- [ ] **Delete the entire Supabase project** or at minimum:
  - [ ] Rotate all API keys
  - [ ] Reset database password
  - [ ] Revoke all service role keys
  - [ ] Review and revoke all user sessions

#### Vercel/Hosting
- [ ] Revoke deployment tokens
- [ ] Delete old deployment
- [ ] Remove GitHub integration (if exists)
- [ ] Clear all environment variables

#### Third-Party Services
Review and rotate keys for:
- [ ] Stripe API keys (if implemented)
- [ ] AWS S3 credentials (in package.json: @aws-sdk/client-s3)
- [ ] Resend email API key
- [ ] Upstash Redis keys
- [ ] Any OAuth apps (GitHub, Google, etc.)
- [ ] NextAuth secrets

#### Git/GitHub
- [ ] If repo was public, make it private immediately
- [ ] Rotate any GitHub personal access tokens
- [ ] Review repository access logs
- [ ] Remove deploy keys

---

## Phase 2: ASSESS DAMAGE

### 2.1 What to Check
- [ ] Review git history for when secrets were exposed
- [ ] Check database for unauthorized access/modifications
- [ ] Review user data for breaches
- [ ] Check email logs for suspicious activity
- [ ] Review Vercel/hosting logs for unusual traffic

### 2.2 Document Everything
Create a file named `INCIDENT_REPORT.md` with:
- Date/time of discovery
- What was compromised
- What actions were taken
- Timeline of events

---

## Phase 3: CREATE NEW PROJECT

### 3.1 New Supabase Project

```bash
# 1. Go to https://supabase.com
# 2. Create new organization or use existing
# 3. Create new project with DIFFERENT name
# 4. Choose strong database password (use password manager)
# 5. Save these immediately to password manager:
#    - Project URL
#    - Project API Key (anon/public)
#    - Project API Key (service_role) - NEVER commit this
#    - Database password
```

### 3.2 New Git Repository

```bash
# Create new directory
cd /Users/kyledaley/Developer/myproject
mkdir tourify-v2  # or your new project name
cd tourify-v2

# Initialize fresh git repo (NOT A FORK)
git init
git branch -M main

# Create new GitHub repo (via web interface)
# Then connect:
git remote add origin https://github.com/yourusername/new-repo-name.git
```

### 3.3 New Hosting Project

```bash
# Vercel (if using)
# 1. Create new project via dashboard
# 2. Do NOT connect to old git repo
# 3. Connect to new repo when ready
```

---

## Phase 4: CODE MIGRATION

### 4.1 What to Copy (Safe Files)

Copy these files/folders from old project to new:

```bash
# From old project root
OLD_PROJECT="/Users/kyledaley/Developer/myproject/tourify-beta-K2"
NEW_PROJECT="/Users/kyledaley/Developer/myproject/tourify-v2"

# Core application code
cp -r $OLD_PROJECT/app $NEW_PROJECT/
cp -r $OLD_PROJECT/components $NEW_PROJECT/
cp -r $OLD_PROJECT/lib $NEW_PROJECT/
cp -r $OLD_PROJECT/hooks $NEW_PROJECT/
cp -r $OLD_PROJECT/utils $NEW_PROJECT/
cp -r $OLD_PROJECT/types $NEW_PROJECT/
cp -r $OLD_PROJECT/styles $NEW_PROJECT/
cp -r $OLD_PROJECT/public $NEW_PROJECT/  # Review images for sensitive data

# Configuration files (REVIEW FIRST)
cp $OLD_PROJECT/package.json $NEW_PROJECT/
cp $OLD_PROJECT/tsconfig.json $NEW_PROJECT/
cp $OLD_PROJECT/tailwind.config.ts $NEW_PROJECT/
cp $OLD_PROJECT/next.config.ts $NEW_PROJECT/
cp $OLD_PROJECT/postcss.config.mjs $NEW_PROJECT/
cp $OLD_PROJECT/components.json $NEW_PROJECT/

# Database migrations (REVIEW FIRST)
cp -r $OLD_PROJECT/supabase $NEW_PROJECT/

# Prisma (if using)
cp -r $OLD_PROJECT/prisma $NEW_PROJECT/
```

### 4.2 What NOT to Copy (Security Risk)

**NEVER COPY:**
- `.env` or `.env.local` - Contains secrets
- `.git/` folder - May contain secret history
- `node_modules/` - Reinstall fresh
- `.next/` - Build artifacts
- Any log files
- Any backup files with data dumps

### 4.3 Files That Need Manual Review

**Review and sanitize before copying:**

1. **middleware.ts**
   - Check for hardcoded secrets
   - Review authentication logic
   - Verify no backdoors

2. **All API routes** (`app/api/**`)
   - Remove any debugging code
   - Check for hardcoded credentials
   - Review authentication checks

3. **Config files**
   - `next.config.ts` - Remove old domains
   - Review for hardcoded values

---

## Phase 5: CLEAN AND SETUP NEW PROJECT

### 5.1 Update Package Name

Edit `package.json`:
```json
{
  "name": "new-project-name",  // Change this
  "version": "0.1.0",
  // ... rest
}
```

### 5.2 Create Environment Template

Create `.env.example`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_new_secret_here

# Stripe (if using)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# AWS S3 (if using)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_BUCKET_NAME=

# Resend (if using)
RESEND_API_KEY=

# Upstash Redis (if using)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### 5.3 Generate New Secrets

```bash
# Generate new NextAuth secret
openssl rand -base64 32

# Note: Get new API keys from each service
```

### 5.4 Create Actual `.env.local`

```bash
cd $NEW_PROJECT
cp .env.example .env.local

# Edit .env.local with your new credentials
# NEVER commit this file
```

### 5.5 Update `.gitignore`

Ensure these are included:
```
# Environment
.env
.env*.local
.env.production

# Secrets
*.pem
*.key
secrets/

# Build
.next/
out/
build/
dist/

# Dependencies
node_modules/

# Logs
*.log
logs/

# OS
.DS_Store

# IDE
.vscode/
.idea/

# Testing
coverage/
.nyc_output/
```

---

## Phase 6: SETUP NEW DATABASE

### 6.1 Review Migration Files

```bash
# Check your migration file
ls -la supabase/migrations/
```

**Important:** Review ALL migration files for:
- Hardcoded data that might be compromised
- Test accounts that should be removed
- Any credentials in comments

### 6.2 Clean Migrations

You should:
1. Remove any test/dummy data
2. Remove any hardcoded emails/usernames
3. Ensure no API keys in comments
4. Consider consolidating all migrations into one clean file

### 6.3 Apply Migrations to New Database

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to new project
supabase link --project-ref your-new-project-ref

# Push migrations
supabase db push
```

OR manually via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of migration files
3. Execute one by one

---

## Phase 7: UPDATE CODE REFERENCES

### 7.1 Search for Old Project References

```bash
cd $NEW_PROJECT

# Search for old project name
grep -r "tourify-beta-K2" .

# Search for old URLs
grep -r "your-old-project-url" .

# Search for any hardcoded credentials (shouldn't be any)
grep -r "sb_" . | grep -v node_modules
```

### 7.2 Update Supabase Client

Check all files that initialize Supabase client:
- `lib/supabase/client.ts` (or similar)
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`

Ensure they use environment variables:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## Phase 8: SECURITY HARDENING

### 8.1 Row Level Security (RLS)

Verify all tables have RLS enabled:
```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 8.2 Storage Buckets

Review and recreate storage buckets:
1. Delete old bucket references
2. Create new buckets with strict policies
3. Update storage policies to be restrictive by default

### 8.3 API Routes Security

Review all API routes for:
- Proper authentication checks
- Input validation
- Rate limiting (you have @upstash/ratelimit)
- CORS settings

### 8.4 Update CORS Settings

In `next.config.ts`:
```typescript
const nextConfig = {
  // Update allowed origins
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://your-new-domain.com' },
          // ... other headers
        ],
      },
    ]
  },
}
```

---

## Phase 9: TESTING

### 9.1 Local Testing

```bash
cd $NEW_PROJECT

# Install dependencies fresh
npm install  # or pnpm install

# Run in development
npm run dev

# Test key flows:
# - Sign up
# - Sign in  
# - Create content
# - Upload files
# - API endpoints
```

### 9.2 Test Checklist

- [ ] Authentication works (sign up, sign in, sign out)
- [ ] Database operations work
- [ ] File uploads work
- [ ] Email sending works (if applicable)
- [ ] Payment processing works (if applicable)
- [ ] All API routes respond correctly
- [ ] No console errors about missing env vars
- [ ] RLS policies prevent unauthorized access

---

## Phase 10: DEPLOYMENT

### 10.1 Deploy to Vercel (or your platform)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 10.2 Set Environment Variables

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add ALL variables from `.env.local`
3. Ensure you're using the NEW credentials
4. Set variables for Production, Preview, and Development as needed

### 10.3 Verify Deployment

- [ ] Visit deployed URL
- [ ] Check all critical flows work
- [ ] Monitor logs for errors
- [ ] Test from different devices/networks

---

## Phase 11: MONITORING & ONGOING SECURITY

### 11.1 Set Up Monitoring

- [ ] Enable Vercel Analytics
- [ ] Set up Sentry or similar error tracking
- [ ] Enable Supabase logging
- [ ] Set up uptime monitoring

### 11.2 Security Checklist

- [ ] Enable 2FA on GitHub
- [ ] Enable 2FA on Supabase
- [ ] Enable 2FA on Vercel
- [ ] Use environment variables for ALL secrets
- [ ] Never commit secrets to git
- [ ] Regularly rotate credentials
- [ ] Keep dependencies updated
- [ ] Review Supabase logs regularly

### 11.3 Audit Regular Security

Monthly:
- [ ] Review Supabase access logs
- [ ] Check for unused API keys
- [ ] Review user sessions
- [ ] Update dependencies

Quarterly:
- [ ] Rotate all API keys
- [ ] Review and update RLS policies
- [ ] Security audit of code
- [ ] Penetration testing (if applicable)

---

## Phase 12: DATA MIGRATION (If Needed)

**⚠️ Only if you trust the old data is not compromised**

### 12.1 Export Clean Data

From old Supabase:
```sql
-- Export users (review first!)
COPY (SELECT * FROM auth.users WHERE created_at > '2024-XX-XX') TO '/tmp/users.csv' CSV HEADER;

-- Export other tables (sanitize sensitive data)
-- Be very selective about what you migrate
```

### 12.2 Import to New Database

Review and sanitize data before importing.

---

## FINAL CHECKLIST

Before considering migration complete:

- [ ] All old credentials revoked
- [ ] New project fully functional
- [ ] All team members have new access
- [ ] Documentation updated
- [ ] Old project archived (not deleted yet, for reference)
- [ ] Monitoring in place
- [ ] Backups configured
- [ ] Security incident documented
- [ ] Team trained on security best practices

---

## ONGOING: DO NOT

- ❌ Do not reuse any credentials from old project
- ❌ Do not commit `.env.local` or `.env`  
- ❌ Do not share API keys via Slack/email/etc
- ❌ Do not give service role key to frontend
- ❌ Do not disable RLS policies for convenience
- ❌ Do not store secrets in code comments
- ❌ Do not use old backup files

---

## If You Need Help

- Supabase Security: https://supabase.com/docs/guides/platform/security
- Next.js Security: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
- OWASP Top 10: https://owasp.org/www-project-top-ten/

---

## Notes

- This migration assumes the **code itself is safe** and only credentials were compromised
- If code was modified maliciously, you need a full security audit
- Consider hiring a security professional if breach was severe
- Notify users if their data may have been accessed
- Check legal requirements for breach notification in your jurisdiction


