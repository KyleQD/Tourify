# Apply Follow/Friend Request System Fix

## Quick Start

Follow these steps to fix the follow request notification system.

## Step 1: Apply the Migration

### Option A: Using Supabase CLI (Recommended)

```bash
# Navigate to your project directory
cd /Users/kyledaley/Developer/myproject/tourify-beta-K2

# Push the migration to your Supabase database
supabase db push
```

### Option B: Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the entire contents of:
   ```
   supabase/migrations/20250210000000_complete_follow_friend_system.sql
   ```
5. Paste into the SQL Editor
6. Click **Run**
7. Wait for confirmation: "✅ Complete follow/friend request system migration finished successfully"

## Step 2: Verify the Migration

Run the test script to verify everything is working:

```bash
node test-friend-request-flow.js
```

### Expected Output

```
🔍 Testing Friend Request Flow...

1️⃣ Getting available users...
✅ Found 2 users
👤 Requester: john_doe
👤 Target: jane_smith

2️⃣ Checking existing follow requests...

3️⃣ Creating follow request...
✅ Follow request created: [uuid]

4️⃣ Checking for notification...
✅ Found 1 follow request notifications for target user
📧 Latest notification: {
  id: '[uuid]',
  title: 'New Follow Request',
  content: 'john_doe wants to follow you',
  type: 'follow_request',
  is_read: false,
  created_at: '[timestamp]'
}

5️⃣ Testing manual notification creation...
✅ Manual notification created successfully: [uuid]
🧹 Manual test notification cleaned up

6️⃣ Cleaning up test follow request...
🧹 Follow request cleaned up

🎉 Friend Request Flow Test Complete!

📋 Results:
✅ Friend request notifications are working correctly
```

### If Test Fails

If you see:
```
❌ Friend request notifications are NOT working
🔧 Action needed: Apply the SQL schema fix
```

This means the migration didn't run successfully. Check:
1. Database connection is active
2. You have proper permissions
3. No conflicting migrations
4. Check Supabase logs for errors

## Step 3: Manual Testing in the App

### Test Follow Request Flow

1. **Log in as User A**
   - Navigate to the application
   - Log in with test user credentials

2. **Send Follow Request**
   - Go to User B's profile
   - Click the "Follow" button
   - Should see success message

3. **Log in as User B**
   - Log out from User A
   - Log in as User B

4. **Check Notifications**
   - Click the notification bell icon (top right)
   - Should see a follow request from User A
   - Notification should show:
     - ✅ User A's name
     - ✅ User A's avatar
     - ✅ "New Follow Request" title
     - ✅ Accept and Reject buttons
     - ✅ Blue unread indicator

5. **Accept the Request**
   - Click "Accept" button
   - Notification should mark as read
   - Should see success toast

6. **Verify User A Receives Acceptance**
   - Log back in as User A
   - Click notification bell
   - Should see "Follow Request Accepted" notification

## Step 4: Verify Database State

### Check Triggers Are Installed

Run this query in Supabase SQL Editor:

```sql
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('follow_requests', 'follows', 'notifications')
ORDER BY event_object_table, trigger_name;
```

**Expected triggers:**
- `trigger_follow_request_notification` - AFTER INSERT on follow_requests
- `trigger_follow_acceptance_notification` - AFTER UPDATE on follow_requests
- `trigger_follow_request_accepted` - AFTER UPDATE on follow_requests
- `trigger_follow_requests_updated_at` - BEFORE UPDATE on follow_requests
- `trigger_follows_count_update` - AFTER INSERT OR DELETE on follows

### Check Notifications Table Schema

```sql
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
```

**Should include these columns:**
- `id` (uuid)
- `user_id` (uuid)
- `type` (text)
- `title` (text)
- `content` (text)
- `summary` (text) ⚠️ Must exist
- `related_user_id` (uuid) ⚠️ Must exist
- `related_content_id` (uuid)
- `related_content_type` (text)
- `priority` (text) ⚠️ Must exist
- `is_read` (boolean) ⚠️ Must exist
- `read_at` (timestamp)
- `created_at` (timestamp)
- `metadata` (jsonb)
- `expires_at` (timestamp)

### Check RLS Policies

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('notifications', 'follow_requests', 'follows')
ORDER BY tablename, policyname;
```

**Expected policies:**
- **notifications**: `notifications_select`, `notifications_update`, `notifications_insert`
- **follow_requests**: `follow_requests_select`, `follow_requests_insert`, `follow_requests_update`, `follow_requests_delete`
- **follows**: `follows_select`, `follows_insert`, `follows_delete`

## Troubleshooting

### Issue: "Column does not exist" errors

**Solution:** The migration didn't add all columns properly. Run this manually:

```sql
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
```

### Issue: Notifications created but not visible in UI

**Possible causes:**
1. RLS policy blocking SELECT
2. Real-time subscription not working
3. Frontend not fetching properly

**Debug query:**
```sql
-- Check if notifications exist for a user
SELECT * FROM notifications 
WHERE user_id = '[your-user-id]' 
AND type = 'follow_request'
ORDER BY created_at DESC;
```

### Issue: Trigger not firing

**Check if function exists:**
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%follow%'
AND routine_schema = 'public';
```

**Should see:**
- `create_follow_request_notification` (function)
- `create_follow_acceptance_notification` (function)
- `handle_follow_request_accepted` (function)
- `update_follower_counts_on_follow` (function)

**Manually test trigger:**
```sql
-- Insert a test follow request (will trigger notification creation)
INSERT INTO follow_requests (requester_id, target_id, status)
VALUES ('[user-a-id]', '[user-b-id]', 'pending');

-- Check if notification was created
SELECT * FROM notifications 
WHERE user_id = '[user-b-id]' 
AND type = 'follow_request'
ORDER BY created_at DESC
LIMIT 1;

-- Clean up
DELETE FROM follow_requests WHERE requester_id = '[user-a-id]' AND target_id = '[user-b-id]';
```

### Issue: SECURITY DEFINER permission denied

This usually means the function wasn't created with proper permissions.

**Solution:** Recreate the function as a superuser:

```sql
-- In Supabase Dashboard (which has superuser access)
CREATE OR REPLACE FUNCTION create_follow_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  requester_profile RECORD;
BEGIN
  SELECT full_name, username INTO requester_profile
  FROM profiles
  WHERE id = NEW.requester_id
  LIMIT 1;

  INSERT INTO notifications (
    user_id, type, title, content, summary,
    related_user_id, priority, is_read
  ) VALUES (
    NEW.target_id, 'follow_request', 'New Follow Request',
    COALESCE(requester_profile.full_name, requester_profile.username, 'Someone') || ' wants to follow you',
    'New follow request', NEW.requester_id, 'normal', FALSE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Verification Checklist

- [ ] Migration ran successfully
- [ ] Test script passes
- [ ] Notifications table has all required columns
- [ ] Database triggers are installed
- [ ] SECURITY DEFINER is set on trigger functions
- [ ] RLS policies are properly configured
- [ ] Follow request creates notification
- [ ] Notification appears in notification bell
- [ ] Accept/Reject buttons work
- [ ] Acceptance creates counter-notification
- [ ] Follow relationship created on accept
- [ ] Real-time updates work

## Success Criteria

When everything is working correctly:

✅ User A sends follow request to User B
✅ User B immediately sees notification (real-time)
✅ Notification shows User A's name and avatar
✅ User B can accept or reject from notification
✅ On accept, User A receives acceptance notification
✅ Follow relationship is created in `follows` table
✅ Follower counts are updated
✅ All operations are secure (RLS enforced)
✅ No manual notification creation needed

## Support

If you continue to have issues after following this guide:

1. **Check database logs:**
   - Supabase Dashboard → Logs → Database

2. **Check function logs:**
   - Look for errors related to `create_follow_request_notification`

3. **Verify environment:**
   - Supabase project is not paused
   - Real-time is enabled
   - Tables exist and are accessible

4. **Review the complete documentation:**
   - See `FOLLOW_FRIEND_REQUEST_SYSTEM_SETUP.md`

## Next Steps

After the system is working:

1. **Add more notification types**
   - Likes, comments, mentions, etc.
   - Follow the same pattern

2. **Implement notification preferences**
   - Let users control which notifications they receive
   - Email digest options

3. **Add notification filtering**
   - Filter by type, read status, date range
   - Search functionality

4. **Performance optimization**
   - Archive old notifications
   - Pagination for large notification lists
   - Optimize database queries

## Additional Resources

- [Supabase Triggers Documentation](https://supabase.com/docs/guides/database/triggers)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)

---

**Ready to apply the fix?** Start with Step 1 above! 🚀

