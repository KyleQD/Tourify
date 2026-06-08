# 🆘 QUICK REFERENCE CARD
**Keep this open while working**

---

## 🚨 YOUR SITUATION
- ❌ Cannot access GitHub
- ❌ Cannot access Supabase
- ✅ Have code locally
- ✅ Can start completely fresh

---

## 📞 EMERGENCY CONTACTS

| Service | Contact |
|---------|---------|
| **GitHub Support** | https://support.github.com/contact |
| **Supabase Support** | support@supabase.io |
| **Your Credit Card** | [Number on back of card] |
| **Your Bank** | [Your bank number] |

---

## ✅ IMMEDIATE TODO (Copy & paste these commands)

### 1. Check for secrets
```bash
cd /Users/kyledaley/Developer/myproject/tourify-beta-K2
./scan-for-secrets.sh
```

### 2. Find your project details
```bash
# Find Supabase URL
grep -r "supabase.co" . --include="*.ts" --include="*.tsx" | head -5

# Find GitHub repo
git remote -v

# Find git email
git config user.email
```

### 3. Migrate to new project
```bash
cd /Users/kyledaley/Developer/myproject/tourify-beta-K2
./migrate-to-new-project.sh
# Enter new path when prompted
```

### 4. Setup new project
```bash
cd [YOUR_NEW_PROJECT_PATH]
cp .env.example .env.local
# Edit .env.local with new credentials
npm install
npm run dev
```

---

## 🔐 NEW ACCOUNTS TO CREATE

| Service | URL | Status |
|---------|-----|--------|
| **New Email** | https://proton.me/mail | ☐ |
| **New GitHub** | https://github.com/signup | ☐ |
| **New Supabase** | https://supabase.com/dashboard | ☐ |
| **New Vercel** | https://vercel.com/signup | ☐ |

**After each:** Enable 2FA ✓

---

## 📋 PRIORITY CHECKLIST

### URGENT (Do First)
- [ ] Contact GitHub support
- [ ] Contact Supabase support (email: support@supabase.io)
- [ ] Change email password
- [ ] Check credit cards
- [ ] Scan computer for malware

### TODAY
- [ ] Create new email account
- [ ] Create new GitHub account
- [ ] Create new Supabase account
- [ ] Scan code: `./scan-for-secrets.sh`
- [ ] Migrate code: `./migrate-to-new-project.sh`

### THIS WEEK
- [ ] Setup new database
- [ ] Test locally
- [ ] Deploy to production
- [ ] Enable monitoring
- [ ] Follow up with support daily

---

## 📧 EMAIL TEMPLATE FOR SUPPORT

### GitHub:
```
Subject: URGENT - Account Compromise

Hello,
I cannot access my GitHub account and suspect compromise.
Username: [YOUR_USERNAME]
Email: [YOUR_EMAIL]
Need immediate assistance to regain access.
[YOUR_NAME]
```

### Supabase:
```
Subject: URGENT - Cannot Access Account

Hello,
My account may be compromised and I cannot log in.
Email: [YOUR_EMAIL]
Project: [PROJECT_URL if known]
Please lock account and revoke all API keys immediately.
[YOUR_NAME]
```

---

## 🔄 PARALLEL PATHS

### PATH A: Recover Old Accounts
```
Day 1: Contact support
Day 2-7: Follow up daily
If successful: Revoke all credentials
```

### PATH B: Start Fresh ⭐ DO THIS NOW
```
Hour 1: Create new accounts
Hour 2: Scan & migrate code  
Hour 3-4: Setup project
Hour 5: Deploy
Result: You're operational!
```

**Work BOTH paths at the same time**

---

## 💻 COMMANDS YOU'LL NEED

### Generate new secret:
```bash
openssl rand -base64 32
```

### Check processes:
```bash
ps aux | grep node
```

### Find Supabase references:
```bash
grep -r "supabase" . --include="*.ts" | head -10
```

### Initialize new git:
```bash
git init
git branch -M main
git add .
git commit -m "Initial secure commit"
```

---

## 📁 FILES TO READ

1. **Right now:** `EMERGENCY_ACTION_CHECKLIST.md`
2. **Next:** `LOST_ACCESS_EMERGENCY_GUIDE.md`
3. **When migrating:** `MIGRATION_QUICKSTART.md`
4. **Reference:** `PROJECT_MIGRATION_GUIDE.md`

---

## ⏱️ TIME TO BE OPERATIONAL

| Task | Time |
|------|------|
| Contact support | 15 min |
| Secure email & check cards | 30 min |
| Create new accounts | 30 min |
| Scan & migrate code | 1 hour |
| Setup new project | 2 hours |
| Deploy | 1 hour |
| **Total** | **5-6 hours** |

---

## 🎯 TODAY'S GOAL

By end of day:
- ✓ Support contacted (both services)
- ✓ New accounts created with 2FA
- ✓ New project running locally
- ✓ Email and computer secured

---

## 💡 REMEMBER

✓ **You have your code** - not starting from zero
✓ **You can succeed** - without old account access
✓ **Support will help** - this is common
✓ **Focus on what you control** - new project
✓ **Take it step by step** - you'll get through this

---

## 🆘 STUCK?

**Can't run scripts?**
```bash
chmod +x *.sh
```

**Don't know where to start?**
```bash
open EMERGENCY_ACTION_CHECKLIST.md
```

**Need help?**
- Read: `LOST_ACCESS_EMERGENCY_GUIDE.md`
- Contact: support@supabase.io
- Contact: https://support.github.com/contact

---

## 📊 TRACK YOUR PROGRESS

- [ ] Support contacted: GitHub ☐  Supabase ☐
- [ ] Accounts secured: Email ☐  Cards ☐  Computer ☐
- [ ] New accounts: GitHub ☐  Supabase ☐  Vercel ☐
- [ ] Migration: Scanned ☐  Fixed secrets ☐  Migrated ☐
- [ ] Project: Installed ☐  Configured ☐  Running ☐
- [ ] Deploy: Committed ☐  Deployed ☐  Tested ☐

---

## 🔥 MOST IMPORTANT

**#1 Priority:** Contact support NOW
**#2 Priority:** Secure what you CAN control  
**#3 Priority:** Start fresh with new accounts

**Don't wait for old account recovery to move forward!**

---

**Keep this card open. Work through it step by step. You've got this! 💪**

---

*Current time: ___________*  
*Tasks completed today: ___________*  
*Next task: ___________*


