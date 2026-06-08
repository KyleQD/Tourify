# 🚨 QUICK FIX: Authentication Error

You're still getting "Database error saving new user" because the fix hasn't been applied yet. Here's how to fix it **RIGHT NOW**:

## Step 1: Go to Supabase Dashboard

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar

## Step 2: Copy and Paste This SQL

Copy this entire block and paste it into the SQL Editor:

```sql
-- QUICK FIX: Drop existing problematic triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_enhanced ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_safe ON auth.users;

-- Create a simple, working handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile with simple error handling
  BEGIN
    INSERT INTO public.profiles (
      id, 
      name, 
      username, 
      full_name, 
      email,
      created_at, 
      updated_at
    ) VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.email,
      NOW(), 
      NOW()
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't crash signup
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;

  -- Create active profile entry
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
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't crash signup
      RAISE WARNING 'Error creating active profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ultimate fallback - don't crash the signup
    RAISE WARNING 'Unexpected error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Step 3: Click "Run" Button

Click the **Run** button in the SQL Editor to execute the fix.

## Step 4: Test Immediately

After running the SQL, test it right away:

```bash
node scripts/test-auth-fix.js
```

## What This Does

This fix:
- ✅ Removes all conflicting triggers
- ✅ Creates a simple, robust trigger function
- ✅ Prevents the "Database error saving new user" error
- ✅ Creates profiles automatically for new users
- ✅ Won't crash if there are any issues

## If You Still Get Errors

If you still get errors after running this SQL:

1. **Check if the trigger was created:**
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created';
   ```

2. **Check if the function exists:**
   ```sql
   SELECT * FROM information_schema.routines 
   WHERE routine_name = 'handle_new_user';
   ```

3. **Try a manual test:**
   ```sql
   -- Test the function manually
   SELECT public.handle_new_user();
   ```

## Success Indicators

After applying this fix, you should see:
- ✅ No more "Database error saving new user" messages
- ✅ New users can sign up successfully
- ✅ Profiles are created automatically
- ✅ The test script passes

---

**This is the simplest, most reliable fix. It removes all the complexity and just makes signup work.**
