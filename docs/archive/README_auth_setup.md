# Tourify Authentication Setup

## Overview

Based on analysis of your Tourify codebase, I've identified the missing database tables and configurations needed for a smooth login/signup process. The `missing_auth_tables.sql` file contains all the necessary SQL to set up your authentication system properly.

## What Was Missing

Your current database schema was incomplete for the authentication flow. Here's what was missing:

### 1. **Enhanced Profiles Table**
- Missing `onboarding_completed` field
- Missing `account_settings` JSONB field
- Missing user `role` field
- Missing social media counts

### 2. **Artist & Venue Profile Tables**
- No `artist_profiles` table for artist accounts
- No `venue_profiles` table for venue accounts
- Missing verification status tracking
- Missing account tier management

### 3. **Onboarding System**
- No `onboarding` table to track user progress
- Missing onboarding step management
- No completion tracking

### 4. **Session Management**
- No `user_sessions` table for enhanced session tracking
- Missing device/IP tracking
- No session expiration management

### 5. **Authentication Triggers**
- Missing automatic profile creation on signup
- No trigger to create onboarding records
- Missing timestamp update triggers

### 6. **Row Level Security (RLS)**
- Missing RLS policies for data security
- No proper access control policies

### 7. **Performance Indexes**
- Missing database indexes for optimal performance
- No foreign key indexes

## What The SQL File Adds

### Tables Created/Enhanced:
- ✅ **profiles** - Enhanced with onboarding and role support
- ✅ **artist_profiles** - Complete artist account management
- ✅ **venue_profiles** - Complete venue account management  
- ✅ **user_sessions** - Enhanced session tracking
- ✅ **onboarding** - User onboarding flow management

### Functions Created:
- ✅ **handle_new_user()** - Automatic profile creation on signup
- ✅ **create_artist_account()** - Artist profile creation
- ✅ **create_venue_account()** - Venue profile creation
- ✅ **update_updated_at_column()** - Timestamp management

### Security Features:
- ✅ **Row Level Security** policies for all tables
- ✅ **Proper permissions** for authenticated/anonymous users
- ✅ **Data access control** based on user ownership

### Performance Optimizations:
- ✅ **Database indexes** for all frequently queried fields
- ✅ **Foreign key indexes** for relationship performance
- ✅ **Composite indexes** for complex queries

## How to Apply the Changes

### Method 1: Supabase Dashboard (Recommended)
1. Log into your Supabase dashboard
2. Go to the **SQL Editor**
3. Copy the contents of `missing_auth_tables.sql`
4. Paste and run the SQL
5. Check the output for success messages

### Method 2: Local Development
```bash
# If you have Supabase CLI set up locally
supabase db reset
# Then apply the SQL through the dashboard
```

### Method 3: Command Line (if you have psql access)
```bash
psql -h your-supabase-host -U postgres -d postgres -f missing_auth_tables.sql
```

## Expected Behavior After Setup

### 1. **User Signup Flow**
- ✅ User signs up with Supabase Auth
- ✅ Profile automatically created via trigger
- ✅ Onboarding record created
- ✅ User can complete onboarding process

### 2. **Artist Account Creation**
- ✅ User can create artist profile
- ✅ Role updated to 'artist'
- ✅ Onboarding marked complete
- ✅ Artist-specific settings configured

### 3. **Venue Account Creation**
- ✅ User can create venue profile
- ✅ Role updated to 'venue'
- ✅ Onboarding marked complete
- ✅ Venue-specific settings configured

### 4. **Session Management**
- ✅ Enhanced session tracking
- ✅ Device and IP logging
- ✅ Session expiration handling

## Integration with Your Code

Your existing auth context (`contexts/auth-context.tsx`) should work seamlessly with these tables. The key integration points:

### 1. **Profile Creation**
```typescript
// This will now work automatically via the trigger
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: 'User Name',
      username: 'username'
    }
  }
})
```

### 2. **Artist Account Creation**
```sql
-- Call this function from your app
SELECT create_artist_account(
  user_id := auth.uid(),
  artist_name := 'Artist Name',
  bio := 'Artist bio',
  genres := ARRAY['rock', 'pop']
);
```

### 3. **Venue Account Creation**  
```sql
-- Call this function from your app
SELECT create_venue_account(
  user_id := auth.uid(),
  venue_name := 'Venue Name',
  description := 'Venue description',
  address := 'Venue address'
);
```

## Verification Steps

After running the SQL, verify the setup:

1. **Check Tables Created**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('profiles', 'artist_profiles', 'venue_profiles', 'onboarding', 'user_sessions');
   ```

2. **Test User Signup**:
   - Try creating a new user
   - Check if profile is automatically created
   - Verify onboarding record exists

3. **Test RLS Policies**:
   - Ensure users can only see their own data
   - Verify public profile data is accessible

## Troubleshooting

### Common Issues:

1. **"Table already exists" errors**: 
   - The SQL uses `IF NOT EXISTS` so this is safe to ignore

2. **"Column already exists" errors**:
   - The SQL handles this gracefully with exception handling

3. **Permission errors**:
   - Ensure you're running as a superuser or have proper permissions

4. **Trigger not firing**:
   - Check if the trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`

### Getting Help:

If you encounter issues:
1. Check the Supabase logs for detailed error messages
2. Verify your environment variables are set correctly
3. Ensure your Supabase project is active and accessible

## Next Steps

After applying these changes:
1. Test the complete signup/login flow
2. Implement artist/venue account creation in your UI
3. Build out the onboarding flow components
4. Consider adding email verification flow
5. Implement password reset functionality

The authentication foundation is now solid and ready for your application's growth! 