# Account Creation Fix

## 🚨 **Root Cause Identified**

The account creation was failing due to **broken RPC functions** in the database:

```
❌ RPC function error: {
  code: 'P0001',
  message: 'Failed to create artist account: column reference "user_id" is ambiguous'
}
```

## ✅ **Fix Applied**

**File:** `lib/services/account-management.service.ts`

### **Changes Made:**

1. **Artist Account Creation:**
   - Removed broken RPC function call
   - Updated to use direct table insert method
   - Added proper error handling for duplicate accounts
   - Added default values for required fields

2. **Venue Account Creation:**
   - Removed broken RPC function call
   - Updated to use direct table insert method
   - Added proper error handling for duplicate accounts
   - Added default values for required fields

### **Code Changes:**

```typescript
// Before (broken RPC function)
const { data, error } = await supabase.rpc('create_artist_account', {
  user_id: userId,
  artist_name: artistData.artist_name,
  // ... other params
})

// After (direct table insert)
const { data: artistProfile, error: artistError } = await supabase
  .from('artist_profiles')
  .insert({
    user_id: userId,
    artist_name: artistData.artist_name,
    bio: artistData.bio || null,
    genres: artistData.genres || [],
    social_links: artistData.social_links || {},
    verification_status: 'unverified',
    account_tier: 'basic',
    settings: {
      allow_bookings: true,
      public_profile: true,
      show_contact_info: false,
      auto_accept_follows: true
    }
  })
  .select()
  .single()
```

## 🎯 **Expected Results**

### **Before Fix:**
```
❌ Error: Failed to create artist account
❌ RPC function ambiguous column reference
❌ Account creation fails
```

### **After Fix:**
```
✅ Artist account created successfully: [account-id]
✅ Venue account created successfully: [account-id]
✅ Account creation works properly
```

## 🧪 **Test It Now**

1. **Try creating an artist account** - it should work now
2. **Try creating a venue account** - it should work now
3. **Check terminal logs** for success messages:
   ```
   Creating artist account for user: [user-id] with data: {...}
   Artist account created successfully: [account-id]
   ```

## 🔧 **Why This Works**

- **Direct Table Insert**: Bypasses the broken RPC function
- **Proper Error Handling**: Handles duplicate accounts gracefully
- **Default Values**: Provides required fields for new accounts
- **Better Logging**: Enhanced debugging information

## 📝 **Additional Benefits**

- **Faster Performance**: Direct table insert is faster than RPC calls
- **Better Error Messages**: More specific error handling
- **Duplicate Handling**: Gracefully handles existing accounts
- **Consistent Behavior**: Same approach for both artist and venue accounts

The account creation should now work without any RPC function errors! 🎉
