# Site Map Database Relationship Fix

## ✅ **Issue Resolved**

The site map creation was failing due to a **Supabase PostgREST relationship ambiguity error**.

### **Error Details:**
```
Could not embed because more than one relationship was found for 'site_map_collaborators' and 'profiles'
```

### **Root Cause:**
The `site_map_collaborators` table has **two foreign key relationships** with the `profiles` table:
1. `user_id` → `profiles(id)` 
2. `invited_by` → `profiles(id)`

When Supabase tried to join `site_map_collaborators` with `profiles`, it didn't know which relationship to use.

## 🛠️ **Fix Applied**

### **Before (Ambiguous):**
```sql
collaborators:site_map_collaborators(
  *,
  user:profiles(id, username, full_name, avatar_url, email)
)
```

### **After (Explicit):**
```sql
collaborators:site_map_collaborators(
  *,
  user:profiles!site_map_collaborators_user_id_fkey(id, username, full_name, avatar_url, email)
)
```

The `!site_map_collaborators_user_id_fkey` explicitly tells Supabase to use the `user_id` foreign key relationship.

## 📊 **Expected Results**

### **Before Fix:**
```
[Site Maps API] Database insertion error: PGRST201
POST /api/admin/logistics/site-maps 500 in 273ms
```

### **After Fix:**
```
[Site Maps API] Site map created successfully: [site-map-id]
POST /api/admin/logistics/site-maps 200 in 150ms
```

## 🧪 **Testing**

1. **Try creating a site map again** - it should now work without the 500 error
2. **Check the console** for success messages:
   ```
   [Site Maps API] Site map created successfully: [site-map-id]
   ```
3. **Verify the site map appears** in your site maps list

## 📝 **What Was Fixed**

- **GET method**: Fixed relationship ambiguity in site map retrieval
- **POST method**: Fixed relationship ambiguity in site map creation
- **Database queries**: Now explicitly specify which foreign key relationship to use

## 🎯 **No SQL Migration Needed**

The database schema was already correct. The issue was purely in the **query syntax** - we just needed to tell Supabase which relationship to use when joining tables.

The site map creation should now work perfectly! 🎉
