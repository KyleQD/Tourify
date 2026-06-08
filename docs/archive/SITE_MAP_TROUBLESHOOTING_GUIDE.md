# Site Map Troubleshooting Guide

## Current Status
- ✅ Authentication is working (middleware successfully authenticates user)
- ✅ Database schema is correct (site_maps table exists)
- ✅ API route fixes have been applied (relationship ambiguity resolved)
- ❌ Site maps are not visible in the UI (GET request failing)
- ❌ Site map creation may still be failing (POST request failing)

## Steps to Resolve

### Step 1: Restart Development Server
The server has been restarted to pick up the API route changes. Wait for it to fully start up.

### Step 2: Test the API Directly
Run this test script in your browser console:

```javascript
// Copy and paste the contents of test-site-map-api.js into browser console
```

### Step 3: Check for API Route Logs
After testing, look for these logs in the terminal:
```
[Site Maps API] User authenticated: [user-id]
[Site Maps API] Site map created successfully: [site-map-id]
```

### Step 4: Verify Database Connection
If the API is still failing, check if the database tables exist:

```sql
-- Run this in your Supabase SQL editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%site_map%';
```

### Step 5: Check RLS Policies
Verify that Row Level Security policies are correctly configured:

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'site_maps';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'site_maps';
```

## Expected Results

### ✅ Success Case
```
[Site Maps API] User authenticated: 97b9e178-b65f-47a3-910e-550864a4568a
[Site Maps API] Site map created successfully: [site-map-id]
POST /api/admin/logistics/site-maps 200 in 150ms
GET /api/admin/logistics/site-maps 200 in 100ms
```

### ❌ Failure Cases
If you still see errors, check:

1. **401 Unauthorized**: Authentication issue
2. **500 Internal Server Error**: Database or API route issue
3. **No API logs**: API route not being called (routing issue)

## Next Steps

1. **Wait for server restart** to complete
2. **Test the API** using the test script
3. **Check terminal logs** for API route messages
4. **Try creating a site map** in the UI
5. **Check if site maps appear** in the list

## If Still Failing

If the issue persists after the server restart:

1. **Check Supabase connection** - ensure environment variables are correct
2. **Verify database permissions** - ensure the user has access to site_maps table
3. **Check RLS policies** - ensure they allow the authenticated user to read/write
4. **Test with a simple query** - try creating a site map with minimal data

The fixes we've applied should resolve the relationship ambiguity error. The server restart should pick up all the changes.
