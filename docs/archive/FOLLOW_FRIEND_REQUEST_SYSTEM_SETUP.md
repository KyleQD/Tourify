# Follow/Friend Request System - Complete Setup Guide

## Overview
This document explains the complete follow/friend request ecosystem in Tourify, including how notifications are created and delivered to users.

## System Architecture

### Database Tables

#### 1. **notifications**
Stores all user notifications including follow requests.

**Key Columns:**
- `user_id` - Recipient of the notification
- `type` - Notification type (e.g., 'follow_request', 'follow_accepted')
- `title` - Notification title
- `content` - Full notification message
- `summary` - Short preview text
- `related_user_id` - ID of the user who triggered the notification
- `related_content_id` - ID of related content (optional)
- `priority` - Priority level ('low', 'normal', 'high', 'urgent')
- `is_read` - Boolean flag for read status
- `read_at` - Timestamp when notification was read
- `created_at` - When notification was created

#### 2. **follow_requests**
Tracks follow request relationships between users.

**Key Columns:**
- `requester_id` - User sending the follow request
- `target_id` - User receiving the follow request
- `status` - Request status ('pending', 'accepted', 'rejected', 'cancelled')
- `created_at` - When request was sent
- `updated_at` - Last update timestamp

**Constraints:**
- UNIQUE(requester_id, target_id) - One request per user pair
- CHECK(requester_id != target_id) - Can't follow yourself

#### 3. **follows**
Stores actual follow relationships after acceptance.

**Key Columns:**
- `follower_id` - User who is following
- `following_id` - User being followed
- `created_at` - When follow relationship was created

**Constraints:**
- UNIQUE(follower_id, following_id) - One follow per user pair
- CHECK(follower_id != following_id) - Can't follow yourself

### Database Triggers (The Key to Automatic Notifications!)

#### Trigger 1: `create_follow_request_notification()`
**Purpose:** Automatically creates a notification when a follow request is sent

**How it works:**
1. Fires AFTER INSERT on `follow_requests` table
2. Uses `SECURITY DEFINER` to bypass RLS policies
3. Fetches requester's profile information
4. Creates a notification for the target user
5. Sets notification type to 'follow_request'

**Why SECURITY DEFINER is critical:**
- RLS policies normally prevent User A from creating notifications for User B
- SECURITY DEFINER runs with superuser privileges
- This allows the trigger to create cross-user notifications

```sql
CREATE TRIGGER trigger_follow_request_notification
  AFTER INSERT ON follow_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION create_follow_request_notification();
```

#### Trigger 2: `create_follow_acceptance_notification()`
**Purpose:** Notifies requester when their follow request is accepted

**How it works:**
1. Fires AFTER UPDATE on `follow_requests` table
2. Only when status changes to 'accepted'
3. Creates notification for the original requester
4. Confirms their request was accepted

#### Trigger 3: `handle_follow_request_accepted()`
**Purpose:** Automatically creates follow relationship when request is accepted

**How it works:**
1. Fires AFTER UPDATE on `follow_requests` table
2. Creates entry in `follows` table
3. Updates follower/following counts in profiles

## RLS Policies

### Notifications
- **SELECT:** Users can read their own notifications (`user_id = auth.uid()`)
- **UPDATE:** Users can update their own notifications (mark as read)
- **INSERT:** Authenticated users can create notifications
  - Note: Triggers bypass this with SECURITY DEFINER

### Follow_requests
- **SELECT:** Users can view requests they sent OR received
- **INSERT:** Users can create requests (as requester only)
- **UPDATE:** Users involved in the request can update it
- **DELETE:** Users involved can delete the request

### Follows
- **SELECT:** Public (anyone can view the social graph)
- **INSERT:** Users can create follows (as follower)
- **DELETE:** Users can delete their own follows (unfollow)

## API Endpoints

### POST /api/social/follow-request
**Actions:**
- `send` - Send a follow request
- `accept` - Accept a received follow request
- `reject` - Reject a received follow request

**Request Body:**
```json
{
  "targetUserId": "uuid-of-target-user",
  "action": "send" | "accept" | "reject"
}
```

**Response:**
```json
{
  "success": true,
  "action": "request_sent",
  "message": "Follow request sent successfully"
}
```

### GET /api/social/follow-request
**Actions:**
- `?action=pending` - Get all pending follow requests for current user
- `?action=check&targetUserId=uuid` - Check relationship status with a user

## Frontend Components

### Notification Bell Components
Multiple notification bell implementations exist:

1. **`components/enhanced-notification-bell.tsx`** - Full-featured notification center
2. **`components/working-notification-bell.tsx`** - Simpler working version
3. **`components/notifications.tsx`** - Basic notifications component

**Key Features:**
- Real-time updates via Supabase subscriptions
- Displays follow request notifications
- Allows accepting/rejecting requests directly from notification
- Shows unread count badge
- Filters by notification type

### How Notifications Display

```typescript
// Fetch notifications for current user
const { data, error } = await supabase
  .from("notifications")
  .select(`
    *,
    related_user:profiles!notifications_related_user_id_fkey(
      id,
      full_name,
      username,
      avatar_url
    )
  `)
  .eq("user_id", session.user.id)
  .order("created_at", { ascending: false })
```

The notification bell automatically:
1. Fetches notifications on mount
2. Subscribes to real-time updates
3. Displays follow_request type notifications
4. Shows action buttons to accept/reject
5. Updates UI when requests are handled

## Complete Flow

### Sending a Follow Request

1. **User A clicks "Follow" on User B's profile**
   - Frontend calls `POST /api/social/follow-request` with `action: "send"`

2. **API validates the request**
   - Checks User A is authenticated
   - Verifies no existing request or follow
   - Checks User A != User B

3. **API creates follow_request record**
   ```sql
   INSERT INTO follow_requests (requester_id, target_id, status)
   VALUES (user_a_id, user_b_id, 'pending')
   ```

4. **Database trigger fires automatically**
   - `trigger_follow_request_notification` executes
   - Runs `create_follow_request_notification()` function
   - Function creates notification for User B
   - Uses SECURITY DEFINER to bypass RLS

5. **User B receives notification**
   - Notification appears in their notification bell
   - Real-time subscription updates UI instantly
   - Shows "User A wants to follow you"

### Accepting a Follow Request

1. **User B clicks "Accept" in notification**
   - Frontend calls `POST /api/social/follow-request` with `action: "accept"`

2. **API updates follow_request status**
   ```sql
   UPDATE follow_requests 
   SET status = 'accepted' 
   WHERE requester_id = user_a_id AND target_id = user_b_id
   ```

3. **Database triggers fire automatically**
   - `trigger_follow_request_accepted` creates follow relationship
   - `trigger_follow_acceptance_notification` notifies User A
   - Follower counts are updated

4. **User A receives acceptance notification**
   - "User B accepted your follow request"
   - Now they're connected!

## Testing

### Running the Test Script

```bash
node test-friend-request-flow.js
```

This script:
1. Gets two test users from the database
2. Creates a follow request between them
3. Verifies a notification was created
4. Tests manual notification creation
5. Cleans up test data
6. Reports results

**Expected Output:**
```
✅ Follow request created: [uuid]
✅ Found 1 follow request notifications for target user
✅ Manual notification created successfully
```

### Manual Testing Checklist

- [ ] User A can send follow request to User B
- [ ] User B sees notification in notification bell
- [ ] Notification shows User A's name and avatar
- [ ] User B can accept request from notification
- [ ] User A receives acceptance notification
- [ ] Users are now in "friends" relationship
- [ ] Follower counts updated correctly
- [ ] User B can reject request instead
- [ ] Rejected requests don't create follow relationship

## Troubleshooting

### Notifications Not Appearing

**Problem:** User sends follow request but recipient doesn't see notification

**Possible Causes:**

1. **Database triggers not installed**
   - Run the migration: `20250210000000_complete_follow_friend_system.sql`
   - Verify triggers exist in database

2. **RLS policies blocking notification creation**
   - Check if triggers use `SECURITY DEFINER`
   - Verify notification INSERT policy exists

3. **Missing columns in notifications table**
   - Migration adds: `related_user_id`, `summary`, `is_read`, `priority`
   - Without these, INSERT will fail

4. **Frontend not subscribed to real-time updates**
   - Check Supabase real-time is enabled
   - Verify subscription channel is active

### Checking Trigger Installation

```sql
-- List all triggers on follow_requests table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'follow_requests';

-- Should see:
-- trigger_follow_request_notification (AFTER INSERT)
-- trigger_follow_acceptance_notification (AFTER UPDATE)
-- trigger_follow_request_accepted (AFTER UPDATE)
```

### Checking Notification Creation

```sql
-- Get recent follow request notifications
SELECT 
  n.id,
  n.user_id,
  n.type,
  n.title,
  n.content,
  n.related_user_id,
  n.is_read,
  n.created_at,
  p.username as recipient_username,
  p2.username as sender_username
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.id
LEFT JOIN profiles p2 ON n.related_user_id = p2.id
WHERE n.type = 'follow_request'
ORDER BY n.created_at DESC
LIMIT 10;
```

## Migration Instructions

### Step 1: Run the Migration

```bash
# Using Supabase CLI
supabase db push

# Or directly in Supabase Dashboard SQL Editor
# Copy and paste: supabase/migrations/20250210000000_complete_follow_friend_system.sql
```

### Step 2: Verify Installation

```bash
# Run the test script
node test-friend-request-flow.js
```

### Step 3: Test in Application

1. Log in as User A
2. Navigate to User B's profile
3. Click "Follow" button
4. Log in as User B
5. Check notification bell
6. Should see follow request from User A
7. Click "Accept"
8. Log in as User A
9. Check notification bell
10. Should see acceptance notification

## Key Takeaways

1. **Triggers are essential** - They create notifications automatically
2. **SECURITY DEFINER is critical** - Allows cross-user notification creation
3. **RLS policies must be balanced** - Secure but not too restrictive
4. **Real-time subscriptions** - Provide instant notification delivery
5. **Comprehensive testing** - Use test script before deploying

## Support

If you encounter issues:

1. Check database logs for trigger errors
2. Verify RLS policies with test queries
3. Run the test script to isolate the issue
4. Check browser console for frontend errors
5. Verify Supabase real-time is enabled for your project

## Future Enhancements

- [ ] Email notifications for follow requests
- [ ] Push notifications via service workers
- [ ] Batch notification delivery
- [ ] Notification preferences per user
- [ ] Mute/unmute specific notification types
- [ ] Archive old notifications
- [ ] Notification digest emails

