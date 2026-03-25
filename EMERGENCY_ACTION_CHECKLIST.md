# 🚨 EMERGENCY ACTION CHECKLIST

## You Cannot Access: GitHub & Supabase

**Print this or keep it open. Work through it step by step.**

---

## ⏰ RIGHT NOW (Next 15 Minutes)

### ☐ Task 1: Contact GitHub Support
```
1. Go to: https://support.github.com/contact
2. Select: "Account Recovery"
3. Fill out form with:
   - Your username: ___________________
   - Your email: ___________________
   - Explain: "Cannot access account, may be compromised"
4. Click Submit
5. Save confirmation number: ___________________
```

### ☐ Task 2: Contact Supabase Support
```
1. Open email client
2. Send to: support@supabase.io
3. Subject: "URGENT - Cannot Access Account"
4. Body:
   "My account (email: YOUR_EMAIL) may be compromised.
    I cannot log in.
    Please lock the account and revoke all API keys immediately.
    Project URL: [IF YOU KNOW IT]
    Please contact me at this email."
5. Send
6. Mark time sent: ___________________
```

### ☐ Task 3: Check Your Email NOW
```
1. Search for: "github password reset"
2. Search for: "supabase password reset"
3. Search for: "github notification"
4. Search for: "supabase"
5. Look for anything suspicious
6. Look for login alerts you didn't trigger
7. Any found? YES ☐  NO ☐
```

---

## ⏱️ NEXT 15 MINUTES (Financial Security)

### ☐ Task 4: Check Credit Cards
```
1. Log into credit card account
2. Check last 7 days of charges
3. Look for charges from:
   - Supabase: ___________________
   - Vercel: ___________________
   - AWS: ___________________
   - Stripe: ___________________
   - Unknown: ___________________

Any suspicious charges? YES ☐  NO ☐

If YES:
   - Call card company: ___________________
   - Report fraud: ___________________
   - Request new card: ___________________
```

### ☐ Task 5: Secure Your Email
```
1. Change email password NOW
2. New password saved in: ___________________
3. Enable 2FA if not already: ☐
4. Check "Recent Activity" in email settings
5. Any suspicious logins? YES ☐  NO ☐
```

---

## 📋 NEXT 30 MINUTES (Gather Information)

### ☐ Task 6: Find Your Project Details

**Supabase Project URL:**
```bash
cd /Users/kyledaley/Developer/myproject/tourify-beta-K2
grep -r "supabase.co" . --include="*.ts" --include="*.tsx" | head -5
```
My project URL: ___________________

**GitHub Repository:**
```bash
cd /Users/kyledaley/Developer/myproject/tourify-beta-K2
git remote -v
```
My repo URL: ___________________

**Git Username:**
```bash
git config user.name
git config user.email
```
My username: ___________________
My email: ___________________

### ☐ Task 7: Check Computer Security
```bash
# Check for suspicious processes
ps aux | grep -v "^_" | grep -v "^root" | wc -l
```
Number of processes: ___________________

Run malware scan:
- Mac: Download Malwarebytes from official site
- Windows: Run Windows Defender scan
- Scan complete: ☐

### ☐ Task 8: Document Everything
Create file: `MY_INCIDENT_LOG.txt`

Write down:
```
Date I discovered issue: ___________________
Time: ___________________
Last successful GitHub login: ___________________
Last successful Supabase login: ___________________
What I was doing when I discovered it: 
___________________________________________
___________________________________________

Contacted GitHub Support: ☐ Time: ___________
Contacted Supabase Support: ☐ Time: ___________
Changed email password: ☐ Time: ___________
Checked credit cards: ☐ Time: ___________
Ran malware scan: ☐ Time: ___________
```

---

## 🔄 PARALLEL ACTION: Start Fresh (1 Hour)

While waiting for support, start building fresh infrastructure:

### ☐ Task 9: Create New Email (If needed)
```
Option 1: Gmail
1. Go to: https://accounts.google.com/signup
2. Create new account
3. New email: ___________________
4. Enable 2FA immediately: ☐

Option 2: ProtonMail (more secure)
1. Go to: https://proton.me/mail
2. Create account
3. New email: ___________________
4. Enable 2FA immediately: ☐
```

### ☐ Task 10: Create New GitHub Account
```
1. Go to: https://github.com/signup
2. Use NEW email (or recovered account)
3. Username: ___________________ (pick NEW one)
4. Enable 2FA during setup: ☐
5. Save 2FA backup codes: ___________________
```

### ☐ Task 11: Create New Supabase Account
```
1. Go to: https://supabase.com/dashboard
2. Sign up with NEW email
3. Organization name: ___________________ (NEW)
4. Create project: ___________________
5. Choose region: ___________________
6. Database password (save in password manager): ☐

SAVE IMMEDIATELY:
- Project URL: ___________________
- Anon key: ___________________ (save in password manager)
- Service role key: ___________________ (save in password manager)
```

### ☐ Task 12: Create New Vercel Account (if needed)
```
1. Go to: https://vercel.com/signup
2. Use NEW email
3. Account created: ☐
```

---

## 💻 SETUP NEW PROJECT (1-2 Hours)

### ☐ Task 13: Scan Current Code for Secrets
```bash
cd /Users/kyledaley/Developer/myproject/tourify-beta-K2
./scan-for-secrets.sh
```

Issues found: YES ☐  NO ☐

If YES, list files to fix:
1. ___________________
2. ___________________
3. ___________________

### ☐ Task 14: Fix Any Hardcoded Secrets
```
For each file above:
1. Open file
2. Replace hardcoded value with env variable
3. Save
4. Test code still works
```

All secrets fixed: ☐

### ☐ Task 15: Run Migration Script
```bash
cd /Users/kyledaley/Developer/myproject/tourify-beta-K2
./migrate-to-new-project.sh
```

New project location: ___________________

Migration successful: ☐

### ☐ Task 16: Configure New Project
```bash
cd [YOUR_NEW_PROJECT_PATH]

# Generate new NextAuth secret
openssl rand -base64 32
```

New secret: ___________________ (save in password manager)

```bash
# Create .env.local
cp .env.example .env.local
nano .env.local
```

Filled in these variables:
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] NEXTAUTH_URL
- [ ] NEXTAUTH_SECRET
- [ ] Other: ___________________

### ☐ Task 17: Install Dependencies
```bash
npm install
```

Install successful: ☐

### ☐ Task 18: Setup Database
```
1. Go to Supabase Dashboard
2. SQL Editor
3. Copy first migration file
4. Run SQL
5. Repeat for each migration
```

Migrations applied: ☐

### ☐ Task 19: Test Locally
```bash
npm run dev
```

Server running: ☐
Port: ___________________
URL: http://localhost:___________________

Test these features:
- [ ] Home page loads
- [ ] Sign up works
- [ ] Sign in works
- [ ] Create test post/content
- [ ] Upload test file

All working: ☐

---

## 🚀 DAY 2: DEPLOY

### ☐ Task 20: Commit to New GitHub
```bash
cd [YOUR_NEW_PROJECT_PATH]
git init
git add .
git commit -m "Initial commit - secure project"
git branch -M main
git remote add origin [YOUR_NEW_REPO_URL]
git push -u origin main
```

Pushed to GitHub: ☐

### ☐ Task 21: Deploy to Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```

Deployment URL: ___________________

### ☐ Task 22: Set Production Environment Variables
```
In Vercel Dashboard:
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] NEXTAUTH_URL (production URL)
- [ ] NEXTAUTH_SECRET
- [ ] All others
```

### ☐ Task 23: Test Production
```
Visit: [YOUR_PRODUCTION_URL]

Test:
- [ ] Can access site
- [ ] Can sign up
- [ ] Can sign in
- [ ] Features work
- [ ] No errors in browser console
```

---

## 🔒 SECURE EVERYTHING

### ☐ Task 24: Enable 2FA Everywhere
- [ ] GitHub (Settings → Security)
- [ ] Supabase (Account → Security)
- [ ] Vercel (Settings → Security)
- [ ] Email accounts
- [ ] Any other services

### ☐ Task 25: Save All Backup Codes
```
Where backup codes saved: ___________________
- GitHub codes: ☐
- Supabase codes: ☐
- Vercel codes: ☐
- Email codes: ☐
```

### ☐ Task 26: Set Up Monitoring
- [ ] Enable Vercel Analytics
- [ ] Enable Supabase logs
- [ ] Set up error tracking (optional)
- [ ] Set up uptime monitoring (optional)

---

## 📞 FOLLOW UP

### ☐ Daily Tasks (Until Old Accounts Resolved)

**Morning:**
- [ ] Check email for support responses
- [ ] Check credit card for charges
- [ ] Follow up with support if >24hrs no response

**Evening:**
- [ ] Update incident log
- [ ] Document progress
- [ ] Plan next day

### ☐ Support Follow-up Schedule

GitHub:
- Contacted: ___________________
- First response: ___________________
- Follow up needed: YES ☐  NO ☐
- Resolution: ___________________

Supabase:
- Contacted: ___________________
- First response: ___________________
- Follow up needed: YES ☐  NO ☐
- Resolution: ___________________

---

## ✅ COMPLETION CHECKLIST

### Old Accounts
- [ ] GitHub support contacted
- [ ] Supabase support contacted
- [ ] Following up regularly
- [ ] Documented everything

### New Infrastructure
- [ ] New accounts created
- [ ] 2FA enabled everywhere
- [ ] Credentials saved securely
- [ ] Code scanned for secrets
- [ ] Migration completed
- [ ] Database set up
- [ ] Tested locally
- [ ] Deployed to production
- [ ] Production tested
- [ ] Monitoring enabled

### Security
- [ ] Email secured
- [ ] Computer scanned
- [ ] Credit cards checked
- [ ] All passwords changed
- [ ] 2FA enabled everywhere
- [ ] Backup codes saved

### Documentation
- [ ] Incident logged
- [ ] Timeline documented
- [ ] Actions documented
- [ ] Lessons learned noted

---

## 🆘 STUCK ON A TASK?

### Can't complete Task [NUMBER]?

**Skip it and continue.**

Come back to it later or check:
- LOST_ACCESS_EMERGENCY_GUIDE.md
- MIGRATION_QUICKSTART.md
- PROJECT_MIGRATION_GUIDE.md

---

## 💪 YOU'RE MAKING PROGRESS

Check off tasks as you complete them.
Even if you can't recover old accounts, you can succeed with new ones.

**Current Status:**
- Tasks completed: _____ / 26
- New project running locally: YES ☐  NO ☐
- New project in production: YES ☐  NO ☐
- Old accounts recovered: YES ☐  NO ☐  PENDING ☐

---

## 📞 EMERGENCY CONTACTS

**GitHub Support:** https://support.github.com/contact
**Supabase Support:** support@supabase.io
**Your Credit Card:** ___________________
**Your Bank:** ___________________

---

*Last updated: [DATE/TIME]*
*Next review: [DATE/TIME]*

---

**Remember:** Focus on what you CAN control (new project) while working on what you CAN'T (old account recovery).

**You will get through this! 💪**


