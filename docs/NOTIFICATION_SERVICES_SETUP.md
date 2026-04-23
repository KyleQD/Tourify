# Notification Services Setup Guide

## Overview

The Phase 2 onboarding system includes a comprehensive multi-channel notification system that supports:
- **Email notifications** via SMTP or email service providers
- **SMS notifications** via Twilio or similar services
- **Push notifications** via web push or mobile push services
- **In-app notifications** stored in the database

## Required Environment Variables

Add the following environment variables to your `.env.local` file:

### Email Configuration
```bash
# Email Service (Choose one)
# Option 1: SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Option 2: SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Option 3: Resend
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### SMS Configuration
```bash
# Twilio SMS
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Push Notifications
```bash
# Web Push (VAPID)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@domain.com
```

## Service Provider Setup

### 1. Email Service Setup

#### Option A: Gmail SMTP
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use the generated password as `SMTP_PASS`

#### Option B: SendGrid
1. Create a SendGrid account
2. Verify your sender domain
3. Create an API key with "Mail Send" permissions
4. Use the API key as `SENDGRID_API_KEY`

#### Option C: Resend
1. Create a Resend account
2. Verify your domain
3. Create an API key
4. Use the API key as `RESEND_API_KEY`

### 2. SMS Service Setup (Twilio)

1. Create a Twilio account
2. Get your Account SID and Auth Token from the dashboard
3. Purchase a phone number
4. Configure the environment variables

### 3. Push Notifications Setup

1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Use the generated keys as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`

## Implementation

### 1. Install Required Packages

```bash
npm install nodemailer @sendgrid/mail resend twilio web-push
```

### 2. Create Notification Service Configuration

Create `lib/services/notification-config.ts`:

```typescript
export const notificationConfig = {
  email: {
    provider: process.env.EMAIL_PROVIDER || 'smtp', // 'smtp', 'sendgrid', 'resend'
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL,
    },
    resend: {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL,
    },
  },
  sms: {
    provider: 'twilio',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
  },
  push: {
    vapid: {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT,
    },
  },
};
```

### 3. Update Notification Service

The `NotificationService` in `lib/services/notification.service.ts` is already configured to use these services. The service will automatically:

- Send emails through the configured provider
- Send SMS via Twilio
- Send push notifications via web-push
- Store in-app notifications in the database

## Testing

### 1. Test Email Notifications

```typescript
// Test email sending
const notificationService = new NotificationService();
await notificationService.sendNotification({
  userId: 'user-id',
  type: 'test',
  title: 'Test Email',
  message: 'This is a test email notification',
  channels: ['email'],
  priority: 'normal',
});
```

### 2. Test SMS Notifications

```typescript
// Test SMS sending
await notificationService.sendNotification({
  userId: 'user-id',
  type: 'test',
  title: 'Test SMS',
  message: 'This is a test SMS notification',
  channels: ['sms'],
  priority: 'high',
});
```

### 3. Test Push Notifications

```typescript
// Test push notification
await notificationService.sendNotification({
  userId: 'user-id',
  type: 'test',
  title: 'Test Push',
  message: 'This is a test push notification',
  channels: ['push'],
  priority: 'normal',
});
```

## Templates

The notification system includes predefined templates for common onboarding events:

### Onboarding Templates

1. **Welcome Email**
   - Sent when a candidate is invited
   - Includes onboarding link and instructions

2. **Stage Update Notifications**
   - Sent when workflow stage changes
   - Includes current status and next steps

3. **Reminder Notifications**
   - Sent for incomplete onboarding steps
   - Includes deadline and action items

4. **Completion Notifications**
   - Sent when onboarding is completed
   - Includes next steps and contact information

### Customizing Templates

You can customize notification templates by modifying the `NOTIFICATION_TEMPLATES` in `lib/services/notification.service.ts`:

```typescript
const NOTIFICATION_TEMPLATES = {
  onboarding_welcome: {
    email: {
      subject: 'Welcome to {venue_name} - Complete Your Onboarding',
      body: `
        Hi {candidate_name},
        
        Welcome to {venue_name}! We're excited to have you join our team.
        
        Please complete your onboarding by clicking the link below:
        {onboarding_link}
        
        If you have any questions, please contact {contact_email}.
        
        Best regards,
        {venue_name} Team
      `,
    },
    sms: {
      body: 'Welcome to {venue_name}! Complete your onboarding: {onboarding_link}',
    },
  },
  // Add more templates as needed
};
```

## Monitoring and Analytics

### 1. Notification Delivery Tracking

The system tracks:
- Delivery status for each notification
- Delivery time and success rates
- Channel performance metrics
- User engagement statistics

### 2. Error Handling

The system includes comprehensive error handling:
- Failed delivery retry logic
- Fallback to alternative channels
- Error logging and monitoring
- User notification of delivery failures

### 3. Rate Limiting

To prevent abuse, the system includes:
- Rate limiting per user
- Channel-specific limits
- Daily/monthly quotas
- Spam prevention measures

## Security Considerations

### 1. API Key Security
- Store API keys in environment variables
- Never commit keys to version control
- Rotate keys regularly
- Use least-privilege access

### 2. Data Privacy
- Encrypt sensitive notification data
- Implement user consent management
- Comply with GDPR requirements
- Provide opt-out mechanisms

### 3. Content Security
- Sanitize notification content
- Prevent injection attacks
- Validate user permissions
- Audit notification history

## Troubleshooting

### Common Issues

1. **Email Not Sending**
   - Check SMTP credentials
   - Verify sender email is authorized
   - Check spam folder
   - Review email provider logs

2. **SMS Not Delivering**
   - Verify Twilio credentials
   - Check phone number format
   - Review Twilio logs
   - Ensure sufficient credits

3. **Push Notifications Not Working**
   - Verify VAPID keys
   - Check browser permissions
   - Review service worker setup
   - Test with different browsers

### Debug Mode

Enable debug mode by setting:
```bash
NOTIFICATION_DEBUG=true
```

This will log detailed information about notification delivery attempts.

## Account notifications (Resend, Twilio, Expo)

Outbound delivery for rows in `public.notifications` is handled by:

- **App path**: `OptimizedNotificationService` after insert.
- **Database triggers** (likes, comments, shares, follow): configure a **Database Webhook** on `INSERT` for `public.notifications` so your app can send email/SMS/push for those rows.

### Environment variables (server)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Email via Resend (`lib/services/notification-channels.ts`) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS |
| `NOTIFICATION_INSERT_WEBHOOK_SECRET` | Shared secret for `POST /api/webhooks/supabase/notifications` |

### Supabase Database Webhook

1. Dashboard → **Database** → **Webhooks** → **Create hook**.
2. Table: `notifications`, Events: **Insert**.
3. URL: `https://<your-app-host>/api/webhooks/supabase/notifications`
4. HTTP Headers: `Authorization: Bearer <same value as NOTIFICATION_INSERT_WEBHOOK_SECRET>`  
   (Alternatively send header `x-notification-webhook-secret: <secret>`.)

Enable **Realtime** replication for `public.notifications` if you use the in-app bell with Supabase Realtime.

## Next Steps

1. **Set up environment variables** for your chosen providers
2. **Test notification delivery** for each channel
3. **Customize templates** for your specific needs
4. **Monitor delivery rates** and optimize performance
5. **Implement user preferences** for notification channels

## Support

For issues with specific providers:
- **SendGrid**: [SendGrid Support](https://support.sendgrid.com/)
- **Twilio**: [Twilio Support](https://www.twilio.com/help)
- **Resend**: [Resend Support](https://resend.com/support)
- **Web Push**: [Web Push Documentation](https://web-push-codelab.glitch.me/) 