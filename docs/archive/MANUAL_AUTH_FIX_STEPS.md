# 🔧 Manual Authentication Fix Steps

Since the automated script approach isn't working, here are the manual steps to apply the authentication fix directly in your Supabase Dashboard.

## Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

## Step 2: Apply the Core Fix

Copy and paste the following SQL into the SQL Editor and execute it:

```sql
-- Step 1: Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Drop all existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_enhanced ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_safe ON auth.users;

-- Step 3: Create a robust, consolidated handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _username TEXT;
  _full_name TEXT;
  _profile_name TEXT;
BEGIN
  -- Extract metadata with proper fallbacks
  _username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'username'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    split_part(COALESCE(NEW.email, NEW.phone, NEW.id::text), '@', 1)
  );
  
  _full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    _username
  );
  
  _profile_name := COALESCE(_full_name, _username);

  -- Step 1: Create or update profile with UPSERT
  BEGIN
    INSERT INTO public.profiles (
      id, 
      name, 
      username, 
      full_name, 
      email,
      onboarding_completed,
      created_at, 
      updated_at
    ) VALUES (
      NEW.id, 
      _profile_name,
      _username, 
      _full_name, 
      NEW.email,
      COALESCE((NEW.raw_user_meta_data ->> 'onboarding_completed')::boolean, false),
      NOW(), 
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, profiles.name),
      username = COALESCE(EXCLUDED.username, profiles.username),
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      email = COALESCE(EXCLUDED.email, profiles.email),
      updated_at = NOW();
      
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating/updating profile for user %: % (SQLSTATE: %)', 
        NEW.id, SQLERRM, SQLSTATE;
  END;

  -- Step 2: Create user_active_profiles entry
  BEGIN
    INSERT INTO public.user_active_profiles (
      user_id, 
      active_profile_type, 
      created_at, 
      updated_at
    ) VALUES (
      NEW.id, 
      'general', 
      NOW(), 
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      active_profile_type = COALESCE(EXCLUDED.active_profile_type, user_active_profiles.active_profile_type),
      updated_at = NOW();
      
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating active profile for user %: % (SQLSTATE: %)', 
        NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Ultimate fallback - log error but don't crash the signup
    RAISE WARNING 'Unexpected error in handle_new_user for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Step 3: Add Missing Columns (if needed)

If you get errors about missing columns, run this additional SQL:

```sql
-- Add missing columns to profiles table if they don't exist
DO $$
BEGIN
  -- Add email column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
  
  -- Add onboarding_completed column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
  END IF;
  
  -- Add account_settings column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_settings') THEN
    ALTER TABLE public.profiles ADD COLUMN account_settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
```

## Step 4: Create Indexes (Optional but Recommended)

```sql
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_active_profiles_user_id ON public.user_active_profiles(user_id);
```

## Step 5: Test the Fix

After applying the SQL, test the fix:

1. **Using the test script:**
   ```bash
   node scripts/test-auth-fix.js
   ```

2. **Manual testing:**
   - Go to your signup page
   - Try creating a new account
   - Check that you get a success message
   - Verify the user can sign in

## Step 6: Verify the Fix Worked

You should see:
- ✅ No more "Database error saving new user" messages
- ✅ New users can sign up successfully
- ✅ Profiles are created automatically
- ✅ Users can sign in after signup

## Troubleshooting

### If you get errors:

1. **"Table 'profiles' doesn't exist"**
   - The profiles table needs to be created first
   - Check if you have the basic database schema set up

2. **"Function already exists"**
   - This is normal, the `CREATE OR REPLACE` will handle it

3. **"Trigger already exists"**
   - The `DROP TRIGGER IF EXISTS` should handle this

4. **"Permission denied"**
   - Make sure you're using the service role key
   - Check that your user has the necessary permissions

### If the fix still doesn't work:

1. **Check the logs:**
   - Go to Supabase Dashboard → Logs
   - Look for any error messages during signup

2. **Verify the trigger is working:**
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created';
   ```

3. **Test the function manually:**
   ```sql
   SELECT public.handle_new_user();
   ```

## Success Indicators

After applying the fix, you should see:

- ✅ New user signups work without errors
- ✅ Profiles are created automatically in the `profiles` table
- ✅ Active profiles are created in `user_active_profiles` table
- ✅ No more "Database error saving new user" messages
- ✅ Users can sign in successfully after signup

## Next Steps

Once the fix is applied and working:

1. **Test thoroughly** - Try different signup scenarios
2. **Monitor for issues** - Watch the logs for any new errors
3. **Update your application** - Make sure all signup forms use the new AuthService
4. **Consider additional improvements** - Email verification, password reset, etc.

---

**Note**: This manual approach is more reliable than automated scripts and gives you full control over the process. If you encounter any issues, the error messages will be more specific and easier to troubleshoot.
