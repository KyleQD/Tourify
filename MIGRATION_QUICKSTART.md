# Migration Quick Start Guide

## 🚨 Your project has been compromised - Follow these steps IMMEDIATELY

---

## ⏱️ IMMEDIATE (Do within 1 hour)

### 1. Revoke ALL credentials NOW

**Supabase:**
```
1. Go to https://supabase.com/dashboard
2. Select your project → Settings → API
3. Click "Reset" on all keys OR delete the entire project
```

**Vercel/Hosting:**
```
1. Go to your Vercel dashboard
2. Settings → Environment Variables → Delete ALL
3. Settings → Tokens → Revoke all tokens
```

**GitHub:**
```
1. Settings → Developer settings → Personal access tokens
2. Revoke any tokens related to this project
3. If repo is public, make it private IMMEDIATELY
```

**Other Services:**
- Stripe: Dashboard → Developers → API Keys → Roll keys
- AWS: IAM Console → Delete or rotate access keys
- Resend: Dashboard → API Keys → Delete and recreate
- Upstash: Console → Delete and recreate database

### 2. Document what happened
Create a file: `INCIDENT_REPORT.md`
```
Date discovered: [DATE]
What was exposed: [List everything you know]
When it was exposed: [Date/time if known]
Actions taken: [List what you've done]
```

---

## 📋 PHASE 1: PREPARE (30 minutes)

### Step 1: Scan for secrets in current codebase
```bash
cd /Users/kyledaley/Developer/myproject/tourify-beta-K2
chmod +x scan-for-secrets.sh
./scan-for-secrets.sh
```

**Fix any issues found before proceeding!**

### Step 2: Create new infrastructure

**New Supabase Project:**
1. Go to https://supabase.com
2. "New Project" with a DIFFERENT name
3. Save these in a password manager:
   - Project URL
   - API Key (anon)
   - API Key (service_role)
   - Database password

**New GitHub Repo:**
1. Go to https://github.com/new
2. Create PRIVATE repository
3. Do NOT initialize with README
4. Save the repo URL

**New Vercel Project:**
1. Go to https://vercel.com/new
2. Create new project
3. Do NOT connect to git yet
4. Save project URL

---

## 📦 PHASE 2: MIGRATE CODE (1 hour)

### Step 1: Run migration script
```bash
cd /Users/kyledaley/Developer/myproject/tourify-beta-K2
chmod +x migrate-to-new-project.sh
./migrate-to-new-project.sh
```

Follow the prompts. When asked for new project path, use:
```
/Users/kyledaley/Developer/myproject/[YOUR-NEW-PROJECT-NAME]
```

### Step 2: Set up new project
```bash
# Navigate to new project
cd /Users/kyledaley/Developer/myproject/[YOUR-NEW-PROJECT-NAME]

# Generate new NextAuth secret
openssl rand -base64 32

# Copy and edit environment variables
cp .env.example .env.local
# Edit .env.local with your new credentials (use nano, vim, or VS Code)
```

### Step 3: Review critical files

**Files that MUST be reviewed manually:**
1. `middleware.ts` - Check for hardcoded values
2. `app/api/**/*` - Review all API routes
3. `next.config.ts` - Update domain references
4. `lib/supabase/*` - Verify using env vars

**Quick check:**
```bash
# Search for old project references
grep -r "tourify-beta-K2" . --exclude-dir=node_modules

# Search for old Supabase project references
grep -r "your-old-project-ref" . --exclude-dir=node_modules
```

---

## 🗄️ PHASE 3: SET UP DATABASE (30 minutes)

### Step 1: Review migrations
```bash
# Check what migrations exist
ls -la supabase/migrations/

# Review each one for:
# - Test data (remove it)
# - Hardcoded secrets (remove them)
# - Sensitive information (sanitize it)
```

### Step 2: Apply to new database

**Option A: Using Supabase CLI**
```bash
# Install if not already installed
npm install -g supabase

# Login
supabase login

# Link to your NEW project
supabase link --project-ref your-new-project-ref

# Push migrations
supabase db push
```

**Option B: Manual via Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Open each migration file
3. Copy SQL content
4. Paste and run in SQL Editor

### Step 3: Verify database
```bash
# Check tables were created
# In Supabase Dashboard → Table Editor
# Verify all tables exist

# Check RLS is enabled
# In Supabase Dashboard → Authentication → Policies
# Verify policies exist for all tables
```

---

## 🧪 PHASE 4: TEST LOCALLY (30 minutes)

### Step 1: Install and run
```bash
cd /Users/kyledaley/Developer/myproject/[YOUR-NEW-PROJECT-NAME]

# Install dependencies
npm install

# Start development server
npm run dev
```

### Step 2: Test checklist
Open http://localhost:3000 and test:

- [ ] Home page loads
- [ ] Sign up flow works
- [ ] Sign in flow works
- [ ] Create a post/content
- [ ] Upload an image
- [ ] User profile displays
- [ ] API endpoints respond
- [ ] No console errors about missing env vars

### Step 3: Check for errors
```bash
# Watch the terminal for errors
# Check browser console (F12) for errors
# Verify no "undefined" environment variables
```

---

## 🚀 PHASE 5: DEPLOY (1 hour)

### Step 1: Commit to new repo
```bash
cd /Users/kyledaley/Developer/myproject/[YOUR-NEW-PROJECT-NAME]

# Review what you're about to commit
git status

# Make sure .env.local is NOT in the list!

# If git not initialized yet:
git init
git branch -M main

# Add all files
git add .

# Commit
git commit -m "Initial commit - new secure project"

# Add remote (use your NEW repo URL)
git remote add origin https://github.com/yourusername/your-new-repo.git

# Push
git push -u origin main
```

### Step 2: Deploy to Vercel

**Option A: Via CLI**
```bash
npm install -g vercel
vercel login
vercel --prod
```

**Option B: Via Dashboard**
1. Go to https://vercel.com/new
2. Import your NEW git repository
3. Configure build settings (should auto-detect Next.js)
4. **DO NOT deploy yet** - set environment variables first

### Step 3: Set environment variables in Vercel
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add ALL variables from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXTAUTH_URL` (change to your production URL)
   - `NEXTAUTH_SECRET`
   - All other service keys
3. Set for: Production, Preview, Development
4. Save changes

### Step 4: Deploy
```bash
# Trigger deployment
vercel --prod

# Or via dashboard:
# Deployments → Redeploy
```

### Step 5: Verify deployment
- [ ] Visit your production URL
- [ ] Test sign up/sign in
- [ ] Test critical features
- [ ] Check Vercel logs for errors
- [ ] Test from mobile device

---

## 🔒 PHASE 6: SECURE (30 minutes)

### Enable 2FA everywhere
- [ ] GitHub: Settings → Password and authentication
- [ ] Supabase: Account → Security
- [ ] Vercel: Account Settings → Security

### Set up monitoring
- [ ] Vercel Analytics: Project → Analytics
- [ ] Supabase Logs: Dashboard → Logs
- [ ] Error tracking (Sentry): https://sentry.io

### Update DNS (if custom domain)
- [ ] Update DNS to point to new Vercel deployment
- [ ] Update SSL certificates
- [ ] Test custom domain works

---

## ✅ FINAL CHECKLIST

Before considering migration complete:

### Security
- [ ] All old credentials revoked
- [ ] New credentials secured in password manager
- [ ] 2FA enabled on all services
- [ ] `.env.local` is in `.gitignore` and NOT committed
- [ ] No secrets in git history (`git log -p | grep -i secret`)

### Functionality
- [ ] All critical features tested
- [ ] Authentication works
- [ ] Database operations work
- [ ] File uploads work
- [ ] Emails send correctly
- [ ] No console errors

### Infrastructure
- [ ] New Supabase project working
- [ ] New Vercel deployment working
- [ ] New git repo properly secured
- [ ] Environment variables set correctly
- [ ] Monitoring in place

### Documentation
- [ ] Incident documented
- [ ] Team notified (if applicable)
- [ ] Users notified if required
- [ ] Access instructions updated

### Cleanup
- [ ] Old Supabase project archived (not deleted yet)
- [ ] Old Vercel project archived
- [ ] Old repo made private or archived
- [ ] Keep for 30 days before final deletion

---

## 🆘 TROUBLESHOOTING

### "Cannot connect to Supabase"
- Check `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- Verify URL format: `https://xxxxx.supabase.co`
- Check Supabase project is running

### "Authentication error"
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Check Supabase → Settings → API → anon key
- Ensure you're using NEW project keys

### "Database policy error"
- Check RLS policies are enabled
- Verify policies exist for your tables
- Test policies in Supabase SQL Editor

### "Build fails on Vercel"
- Check environment variables are set
- Verify Node version compatibility
- Check build logs for specific error
- Try building locally: `npm run build`

### "Images not loading"
- Verify storage buckets exist in new Supabase
- Check storage policies
- Update CORS settings if needed

---

## 📞 GET HELP

If you're stuck:

1. **Supabase Support:** https://supabase.com/support
2. **Vercel Support:** https://vercel.com/support
3. **Next.js Docs:** https://nextjs.org/docs
4. **Community:** Stack Overflow, Discord communities

---

## ⚠️ REMEMBER

- **NEVER** commit `.env.local` or `.env` files
- **NEVER** share API keys via chat/email
- **NEVER** use old credentials
- **ALWAYS** use environment variables for secrets
- **ALWAYS** enable RLS on Supabase tables
- **ALWAYS** use 2FA on all services

---

## 📊 TIME ESTIMATE

- Immediate actions: 1 hour
- Code migration: 2 hours
- Database setup: 1 hour
- Testing: 1 hour
- Deployment: 1 hour
- Security hardening: 1 hour

**Total: ~7 hours** (can be split over 2 days)

---

## ✨ YOU'RE DONE!

Once all checklists are complete:
1. Test everything one more time
2. Monitor for 24-48 hours
3. Archive old project (keep for 30 days)
4. Document lessons learned
5. Update team security training

Good luck! 🚀


