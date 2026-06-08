# 🚀 Deploy Comprehensive Multi-Account System

This guide will help you deploy the complete, scalable multi-account system that fixes the posting name issue.

## 🎯 What This System Does

- **Fixes the immediate issue**: Posts from "Clive Malone" artist account will display as "Clive Malone" instead of "John"
- **Provides scalability**: Users can have unlimited accounts of any type (artist, venue, business, etc.)
- **Maintains data integrity**: Primary user ID is preserved for data relationships
- **Backward compatible**: Existing posts and profiles are automatically migrated

## 📋 Prerequisites

- Node.js installed
- Access to Supabase project with service role key
- Environment variables configured

## 🔧 Deployment Options

### Option 1: Use Node.js Script (Recommended)

1. **Run the deployment script**:
   ```bash
   node apply_comprehensive_system.js
   ```

2. **Monitor the output** - it will show:
   - Progress of each SQL statement
   - Success/failure counts
   - Test results
   - Next steps

### Option 2: Manual SQL Execution

1. **Open your Supabase SQL Editor**
2. **Copy and paste the entire contents** of `COMPREHENSIVE_MULTI_ACCOUNT_SYSTEM.sql`
3. **Execute the SQL** (it will take a few minutes)
4. **Check the logs** for any errors

## 🔍 What Gets Created

### 1. **Unified Accounts Table**
- Stores all account types in one table
- Links to specific profile tables (artist_profiles, venue_profiles, etc.)
- Caches display information for performance

### 2. **Enhanced Posts Table**
- Adds `account_id` column linking to accounts table
- Maintains legacy columns for backward compatibility
- Proper indexing for performance

### 3. **Account Management Functions**
- `upsert_account()` - Create or update accounts
- `get_account_display_info()` - Get account details
- `get_user_accounts()` - List all user accounts
- `refresh_account_display_info()` - Sync account data

### 4. **Data Migration**
- All existing profiles → accounts table
- All existing posts → linked to accounts
- RLS policies updated

## ✅ Testing the System

After deployment, test these scenarios:

1. **Post as Artist Account**:
   - Go to artist feed
   - Create a post
   - Check that it shows "Clive Malone" not "John"

2. **Post as Primary Account**:
   - Go to main feed
   - Create a post
   - Check that it shows primary account name

3. **Account Switching**:
   - Use account switcher
   - Verify posts display correct names

## 🔧 Troubleshooting

### Common Issues:

1. **Permission Errors**: Ensure you're using the service role key
2. **Table Already Exists**: This is normal - the script handles existing tables
3. **RPC Function Errors**: Check that functions were created successfully

### Debug Commands:

```sql
-- Check accounts table
SELECT * FROM accounts LIMIT 5;

-- Check posts with account context
SELECT id, account_id, posted_as_account_type FROM posts LIMIT 5;

-- Test RPC functions
SELECT * FROM get_user_accounts('bce15693-d2bf-42db-a2f2-68239568fafe');
```

## 🎉 Success Indicators

You'll know the system is working when:

1. ✅ Posts from artist account show "Clive Malone"
2. ✅ Account switcher works seamlessly
3. ✅ Multiple account types are supported
4. ✅ Feed displays correct account names
5. ✅ System is ready for new account types

## 📚 Architecture Overview

```
User (John) - Primary Account
├── Primary Account (John) - posts show "John"
├── Artist Account (Clive Malone) - posts show "Clive Malone"
├── Venue Account (The Venue) - posts show "The Venue"
└── Business Account (Company) - posts show "Company"
```

Each account has:
- Unique ID in accounts table
- Link to specific profile table
- Cached display information
- Account type classification

## 🚀 Ready to Deploy?

Run the deployment script and follow the output instructions:

```bash
node apply_comprehensive_system.js
```

The system will be production-ready immediately after deployment! 