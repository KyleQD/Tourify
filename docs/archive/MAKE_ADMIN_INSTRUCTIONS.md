# Make Master Admin Instructions

This document provides multiple ways to make the account `kyleqdaley@gmail.com` a master admin with full access to all platform features and functionalities.

## Prerequisites

⚠️ **Important**: The user `kyleqdaley@gmail.com` must have already signed up and confirmed their email address before running any of these methods.

## Method 1: Quick SQL Script (Recommended)

This is the fastest and most direct method.

### Steps:
1. Go to your Supabase dashboard
2. Navigate to "SQL Editor"
3. Copy and paste the contents of `make_master_admin.sql`
4. Click "Run" to execute the script

The script will:
- Add necessary admin columns to the profiles table
- Make `kyleqdaley@gmail.com` a super admin
- Verify the creation was successful

## Method 2: Database Migration

Use this method for a more structured approach that can be tracked in your migration history.

### Steps:
1. Run the Supabase migration:
   ```bash
   supabase db push
   ```
   
2. Or apply the specific migration:
   ```bash
   supabase migration up 20250120000000_create_master_admin.sql
   ```

## Method 3: TypeScript/Node.js Script

Use this method if you prefer programmatic execution or want to integrate it into your deployment process.

### Prerequisites:
- Node.js installed
- Environment variables set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Steps:
1. Install dependencies if not already installed:
   ```bash
   npm install
   ```

2. Run the admin creation script:
   ```bash
   npx tsx scripts/make-admin.ts
   ```

   Or for a different email:
   ```bash
   npx tsx scripts/make-admin.ts "other@email.com"
   ```

## Method 4: Manual API Call

You can also call the TypeScript function directly from your application:

```typescript
import { makeMasterAdmin } from './lib/admin/make-master-admin'

const result = await makeMasterAdmin('kyleqdaley@gmail.com')
if (result.success) {
  console.log('Admin created successfully!')
} else {
  console.error('Failed:', result.error)
}
```

## What This Does

When any of these methods run successfully, the user `kyleqdaley@gmail.com` will have:

### Database Changes:
- `is_admin: true`
- `admin_level: 'super'`
- `profile_type: 'admin'`
- `role: 'admin'`

### Access Permissions:
- ✅ Full access to `/admin` dashboard
- ✅ Ability to view and manage all user profiles
- ✅ Access to all artist and venue profiles
- ✅ Permission to manage events, posts, and content
- ✅ Access to platform analytics and insights
- ✅ Ability to manage staff and job postings
- ✅ Full CRUD operations on all major tables
- ✅ Access to all API endpoints
- ✅ Ability to create, edit, and delete any content

## Verification

After running any method, you can verify the admin was created by:

1. **SQL Verification** (in Supabase SQL Editor):
   ```sql
   SELECT 
     u.email,
     p.is_admin,
     p.admin_level,
     p.profile_type,
     p.role
   FROM auth.users u
   JOIN profiles p ON u.id = p.id
   WHERE u.email = 'kyleqdaley@gmail.com';
   ```

2. **Application Verification**:
   - The user should log out and log back in
   - They should now see admin options in the navigation
   - They can access `/admin` without restrictions
   - All admin features should be available

## Troubleshooting

### "User not found" error:
- Ensure `kyleqdaley@gmail.com` has signed up and confirmed their email
- Check the exact email spelling
- Verify the user exists in Supabase Auth > Users

### "Permission denied" error:
- Make sure you're using the service role key (not anon key)
- Verify your Supabase URL is correct
- Check that RLS policies allow the operation

### "Column does not exist" error:
- Run the quick SQL script first to ensure all columns exist
- Or run one of the migration files to update the schema

### Admin features not showing:
- Have the user clear their browser cache
- Ensure they log out and back in
- Check that the profile was actually updated in the database

## Security Considerations

⚠️ **Important Security Notes**:

1. **Service Role Key**: Never expose the service role key in client-side code
2. **Admin Access**: Super admin accounts have full platform access - use responsibly
3. **Audit Trail**: All admin actions are logged in the `account_activity_log` table
4. **Regular Review**: Periodically review admin accounts and remove unnecessary access

## Admin Levels

The platform supports three admin levels:

- **super**: Full platform access (what we're creating)
- **moderator**: Content moderation and user management
- **support**: Limited admin access for customer support

## Additional Admin Management

To manage other admin accounts in the future, you can:

1. Use the TypeScript utilities in `lib/admin/make-master-admin.ts`
2. Create additional admin levels by modifying the `admin_level` field
3. Use the admin dashboard (once logged in as super admin) to manage other users

---

## Summary

The fastest way is **Method 1** (Quick SQL Script). Just copy the SQL from `make_master_admin.sql` and run it in Supabase SQL Editor. The user `kyleqdaley@gmail.com` will immediately have full master admin access to all platform features. 