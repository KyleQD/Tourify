# Notification System Documentation

## Implementation Status (May 2026)

- DM notification fan-out is now database-triggered on `messages` inserts, with `message` and `message_request` routing based on conversation trust tier.
- Event group chat notification fan-out is now database-triggered on `event_group_messages` inserts (`group_message`).
- `EnhancedNotificationCenter` is the canonical UI surface; legacy bell components were removed.
- Notification deep links for direct messages now target `/messages?conversation=<id>`.

## Overview

The Tourify notification system is a comprehensive, real-time notification platform that provides social media-style notifications for users. It supports multiple notification types, delivery channels, and user preferences.

## Features

### 🎯 Core Features
- **Real-time notifications** with WebSocket support
- **Multiple notification types** (likes, comments, follows, messages, bookings, etc.)
- **Multi-channel delivery** (in-app, email, push, SMS)
- **User preferences** with granular control
- **Quiet hours** support
- **Digest emails** for batch notifications
- **Priority levels** (low, normal, high, urgent)
- **Rich metadata** support for enhanced notifications

### 🔔 Notification Types
- **Social Interactions**: likes, comments, follows, mentions, tags
- **Messages**: direct messages, message requests, group messages
- **Events & Bookings**: event invites, booking requests, acceptances, declines
- **Content & Activity**: post creation, content approval/rejection, achievements
- **System & Admin**: system alerts, maintenance, feature updates, security alerts
- **Business & Professional**: job applications, collaboration requests, partnerships
- **Venue & Artist Specific**: venue bookings, performance reminders, soundcheck reminders
- **Payment & Financial**: payment confirmations, refunds, subscription renewals

## Database Schema

### Tables

#### `notifications`
Main notifications table with comprehensive metadata:
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- Notification type
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT, -- Short version for preview
  metadata JSONB DEFAULT '{}', -- Rich metadata
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_content_id UUID,
  related_content_type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  email_sent BOOLEAN DEFAULT FALSE,
  push_sent BOOLEAN DEFAULT FALSE,
  sms_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);
```

#### `notification_preferences`
User preferences for notification delivery:
```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  preferences JSONB DEFAULT '{}', -- Type-specific preferences
  digest_frequency TEXT DEFAULT 'daily',
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

#### `notification_templates`
Templates for different notification types:
```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  title_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  summary_template TEXT,
  default_priority TEXT DEFAULT 'normal',
  default_expiry_days INTEGER DEFAULT 30,
  icon TEXT,
  color TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

#### `notification_delivery_log`
Log of delivery attempts and status:
```sql
CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push', 'sms', 'in_app')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  provider TEXT,
  provider_message_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);
```

#### `notification_batches`
Batched notifications for digest emails:
```sql
CREATE TABLE notification_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  batch_type TEXT NOT NULL CHECK (batch_type IN ('digest', 'summary', 'bulk')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  notifications JSONB NOT NULL, -- Array of notification IDs
  digest_content TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE
);
```

## API Endpoints

### Core Notification Endpoints

#### `GET /api/notifications`
Fetch user's notifications with filtering and pagination:
```typescript
// Query parameters
{
  limit?: number,        // Number of notifications to fetch (default: 50)
  offset?: number,       // Pagination offset (default: 0)
  unreadOnly?: boolean,  // Filter unread notifications only
  type?: string         // Filter by notification type
}

// Response
{
  notifications: Notification[]
}
```

#### `POST /api/notifications`
Create a new notification:
```typescript
// Request body
{
  userId: string,
  type: string,
  title: string,
  content: string,
  summary?: string,
  metadata?: Record<string, any>,
  relatedUserId?: string,
  relatedContentId?: string,
  relatedContentType?: string,
  priority?: 'low' | 'normal' | 'high' | 'urgent',
  expiresAt?: string
}
```

#### `PATCH /api/notifications`
Update notification status:
```typescript
// Request body
{
  action: 'markAsRead' | 'markAllAsRead',
  notificationId?: string  // Required for markAsRead
}
```

#### `DELETE /api/notifications?id={notificationId}`
Delete a notification.

### Preferences Endpoints

#### `GET /api/notifications/preferences`
Get user's notification preferences.

#### `PATCH /api/notifications/preferences`
Update user's notification preferences:
```typescript
{
  emailEnabled?: boolean,
  pushEnabled?: boolean,
  smsEnabled?: boolean,
  inAppEnabled?: boolean,
  preferences?: Record<string, { email: boolean, push: boolean, sms: boolean }>,
  digestFrequency?: 'never' | 'hourly' | 'daily' | 'weekly',
  quietHoursEnabled?: boolean,
  quietHoursStart?: string,
  quietHoursEnd?: string
}
```

### Test Endpoints

#### `POST /api/notifications/test`
Create test notifications for development:
```typescript
{
  type?: 'all' | 'like' | 'comment' | 'follow' | 'message' | 'booking_request' | 'event_invite' | 'system_alert' | 'feature_update'
}
```

## Components

### `EnhancedNotificationCenter`
Main notification dropdown component with real-time updates:
```tsx
import { EnhancedNotificationCenter } from "@/components/notifications/enhanced-notification-center"

<EnhancedNotificationCenter className="relative" />
```

Features:
- Real-time notification updates
- Search and filtering
- Mark as read/unread
- Delete notifications
- Grouped by date
- Rich notification display with icons and metadata

### `NotificationSettings`
Comprehensive settings component:
```tsx
import { NotificationSettings } from "@/components/notifications/notification-settings"

<NotificationSettings />
```

Features:
- Channel preferences (email, push, SMS, in-app)
- Type-specific preferences
- Digest frequency settings
- Quiet hours configuration
- Real-time preference updates

### `NotificationBell`
Simple notification bell for headers:
```tsx
import { NotificationBell } from "@/components/notifications/notification-bell"

<NotificationBell />
```

## Hooks

### `useNotifications`
Comprehensive hook for notification management:
```tsx
import { useNotifications } from "@/hooks/use-notifications"

const {
  notifications,
  unreadCount,
  isLoading,
  preferences,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  updatePreferences,
  createNotification
} = useNotifications()
```

## Service Layer

### `NotificationService`
Service class for creating and managing notifications:
```typescript
import { NotificationService } from "@/lib/services/notification-service"

// Create a notification
await NotificationService.createNotification({
  userId: "user-id",
  type: "like",
  title: "John liked your post",
  content: "John liked your post 'Summer Tour'",
  relatedUserId: "john-id"
})

// Convenience methods
await NotificationService.sendLikeNotification(userId, likedByUserId, contentId, contentType, contentTitle)
await NotificationService.sendCommentNotification(userId, commentedByUserId, contentId, contentType, commentText)
await NotificationService.sendFollowNotification(userId, followedByUserId)
await NotificationService.sendMessageNotification(userId, senderId, messagePreview)
await NotificationService.sendBookingRequestNotification(userId, requesterId, eventName, eventDate)
```

## Usage Examples

### Creating Notifications

#### Basic Notification
```typescript
import { NotificationService } from "@/lib/services/notification-service"

await NotificationService.createNotification({
  userId: "user-id",
  type: "like",
  title: "John liked your post",
  content: "John liked your post 'Summer Tour Announcement'",
  summary: "John liked your post",
  relatedUserId: "john-id",
  metadata: {
    contentTitle: "Summer Tour Announcement",
    contentType: "post"
  }
})
```

#### High Priority Notification
```typescript
await NotificationService.createNotification({
  userId: "user-id",
  type: "booking_request",
  title: "New booking request",
  content: "The Grand Hall wants to book you for their Summer Music Festival",
  priority: "high",
  metadata: {
    eventName: "Summer Music Festival",
    eventDate: "2024-07-15"
  }
})
```

### Using the Hook
```tsx
import { useNotifications } from "@/hooks/use-notifications"

function MyComponent() {
  const { notifications, unreadCount, markAsRead } = useNotifications()

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId)
    // Navigate to relevant page
  }

  return (
    <div>
      <p>You have {unreadCount} unread notifications</p>
      {notifications.map(notification => (
        <div key={notification.id} onClick={() => handleNotificationClick(notification.id)}>
          <h3>{notification.title}</h3>
          <p>{notification.content}</p>
        </div>
      ))}
    </div>
  )
}
```

### Adding to Layout
```tsx
// In your header/navigation component
import { NotificationBell } from "@/components/notifications/notification-bell"

function Header() {
  return (
    <header>
      <nav>
        {/* Other navigation items */}
        <NotificationBell />
      </nav>
    </header>
  )
}
```

## Configuration

### Environment Variables
```env
# Email service (for email notifications)
RESEND_API_KEY=your_resend_api_key

# Push notifications (if using a service like OneSignal)
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_api_key

# SMS service (if using Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### Database Migration
Run the notification system migration:
```sql
-- Run this in your Supabase SQL editor
\i supabase/migrations/20250122000000_enhanced_notification_system.sql
```

## Testing

### Create Test Notifications
```typescript
// Using the test API
const response = await fetch('/api/notifications/test', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ type: 'all' })
})

// Or create specific types
await fetch('/api/notifications/test', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ type: 'like' })
})
```

### Testing Different Scenarios
1. **Real-time updates**: Open multiple browser tabs and create notifications
2. **Preferences**: Test different notification settings
3. **Quiet hours**: Set quiet hours and verify notifications are delayed
4. **Digest emails**: Test digest email functionality
5. **Priority levels**: Create notifications with different priorities

## Best Practices

### Performance
- Use pagination for large notification lists
- Implement proper indexing on database queries
- Use real-time subscriptions sparingly
- Clean up old notifications regularly

### User Experience
- Provide clear, actionable notification content
- Use appropriate icons and colors for different types
- Allow users to control notification frequency
- Respect quiet hours settings
- Provide easy ways to mark notifications as read

### Security
- Always validate user permissions before creating notifications
- Use Row Level Security (RLS) policies
- Sanitize notification content
- Log delivery attempts for debugging

### Monitoring
- Track notification delivery success rates
- Monitor user engagement with notifications
- Set up alerts for delivery failures
- Monitor database performance

## Troubleshooting

### Common Issues

#### Notifications not appearing
1. Check if user has notification preferences set
2. Verify RLS policies are correct
3. Check real-time subscription is active
4. Verify user is authenticated

#### Real-time updates not working
1. Check Supabase real-time is enabled
2. Verify channel subscription is active
3. Check for JavaScript errors in console
4. Verify user permissions

#### Email notifications not sending
1. Check email service configuration
2. Verify user has email notifications enabled
3. Check delivery logs for errors
4. Verify email templates are configured

#### Performance issues
1. Check database indexes
2. Implement pagination
3. Optimize queries
4. Monitor real-time subscription usage

## Future Enhancements

### Planned Features
- **Push notifications** with service worker
- **Advanced filtering** and search
- **Notification analytics** and insights
- **Custom notification sounds**
- **Notification scheduling**
- **Bulk operations** (mark all as read, delete multiple)
- **Notification templates** for admins
- **A/B testing** for notification content
- **Smart notifications** with ML recommendations

### Integration Opportunities
- **Email marketing** platforms
- **CRM systems** for business notifications
- **Analytics platforms** for tracking engagement
- **Social media** integration for cross-platform notifications
- **Calendar systems** for event reminders 