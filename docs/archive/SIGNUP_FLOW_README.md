# Comprehensive Signup Flow Documentation

## Overview

This implementation provides a complete signup and onboarding flow for Tourify that takes users from initial registration to their fully configured account. The flow supports multiple account types (General, Artist, Venue, Industry Professional) and integrates with Supabase for authentication and data storage.

## Features

### ✅ Multi-Step Signup Process
- **Step 1**: Basic user information (name, username, email, password)
- **Step 2**: Account type selection with clear descriptions
- **Step 3**: Account-specific profile completion

### ✅ Account Types Supported
- **General User**: Basic community member
- **Artist/Performer**: Musicians and performers
- **Venue/Event Space**: Venues and event organizers
- **Industry Professional**: Managers, agents, labels, etc.

### ✅ Email Verification
- Automatic email confirmation flow
- Professional confirmation page
- Resend functionality

### ✅ Onboarding Process
- Post-verification account setup
- Account-specific data collection
- Progress tracking with visual indicators

### ✅ Multi-Account System
- Account switching capabilities
- Unified dashboard experience
- Permission-based access control

## File Structure

```
├── app/
│   ├── auth/
│   │   ├── signup/
│   │   │   ├── page.tsx                 # Multi-step signup form
│   │   │   └── confirmation/
│   │   │       └── page.tsx             # Email confirmation page
│   │   ├── signin/
│   │   │   └── page.tsx                 # Enhanced signin page
│   │   └── verification/
│   │       └── page.tsx                 # Email verification handling
│   ├── onboarding/
│   │   └── page.tsx                     # Post-signup onboarding
│   └── dashboard/
│       └── page.tsx                     # Main dashboard
├── hooks/
│   └── use-multi-account.tsx            # Multi-account management
├── contexts/
│   └── auth-context.tsx                 # Authentication context
├── lib/
│   └── services/
│       └── account-management.service.ts # Account management logic
└── supabase/
    └── migrations/                      # Database migrations
```

## Database Schema

### Core Tables

#### `profiles`
```sql
- id (UUID, Primary Key, References auth.users)
- name (TEXT)
- username (TEXT, Unique)
- bio (TEXT)
- avatar_url (TEXT)
- onboarding_completed (BOOLEAN, Default: false)
- account_settings (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `artist_profiles`
```sql
- id (UUID, Primary Key)
- user_id (UUID, References auth.users)
- artist_name (TEXT, Required)
- bio (TEXT)
- genres (TEXT[])
- social_links (JSONB)
- verification_status (TEXT)
- settings (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `venue_profiles`
```sql
- id (UUID, Primary Key)
- user_id (UUID, References auth.users)
- venue_name (TEXT, Required)
- description (TEXT)
- address (TEXT)
- capacity (INTEGER)
- venue_types (TEXT[])
- contact_info (JSONB)
- social_links (JSONB)
- verification_status (TEXT)
- settings (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Database Functions

#### `create_artist_account()`
Creates an artist profile and marks onboarding as complete.

#### `create_venue_account()`
Creates a venue profile and marks onboarding as complete.

#### `handle_new_user()`
Automatically creates a basic profile when a user signs up.

## Setup Instructions

### 1. Database Setup

1. **Apply the SQL setup script**:
   ```bash
   # Copy the content of setup_signup_flow.sql
   # Run it in your Supabase SQL Editor
   ```

2. **Or apply via Supabase CLI**:
   ```bash
   npx supabase db push
   ```

### 2. Environment Variables

Ensure these environment variables are set:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Email Configuration

Configure email templates in Supabase Dashboard:
- Go to Authentication → Email Templates
- Customize the "Confirm signup" template
- Set redirect URL to: `https://yourdomain.com/auth/callback`

## User Journey

### 1. Signup Process

1. **User visits `/auth/signup`**
   - Sees professional signup form
   - Optional social login (Google, Facebook)
   - Fills basic information

2. **Account Type Selection**
   - Choose from 4 account types
   - Clear descriptions and icons
   - Can be changed later

3. **Account-Specific Information**
   - Artist: Artist name, bio, genres, social links
   - Venue: Venue name, address, capacity, description
   - Industry: Company name, role
   - General: Optional bio

4. **Account Creation**
   - Supabase Auth signup
   - Email verification sent
   - Data stored in localStorage for onboarding

### 2. Email Verification

1. **Email Confirmation**
   - User receives verification email
   - Clicks verification link
   - Redirected to `/auth/callback`

2. **Verification Page**
   - Professional verification confirmation
   - Success/error states
   - Automatic redirect to onboarding

### 3. Onboarding Process

1. **Welcome Step**
   - Confirms account creation
   - Shows selected account type
   - Progress indicator

2. **Profile Completion**
   - Additional account-specific fields
   - Social media links
   - Profile customization

3. **Account Creation**
   - Creates artist/venue profile if applicable
   - Marks onboarding as complete
   - Redirects to dashboard

### 4. Dashboard Experience

1. **Unified Dashboard**
   - Account switcher for multiple account types
   - Quick actions based on account type
   - Activity feed and stats

2. **Multi-Account Support**
   - Switch between different account types
   - Unified sidebar with all accounts
   - Permission-based features

## API Integration

### Authentication Context

```typescript
const { user, loading, signIn, signUp, signOut } = useAuth()
```

### Multi-Account Hook

```typescript
const { 
  accounts, 
  activeAccount, 
  switchAccount, 
  createArtistAccount, 
  createVenueAccount 
} = useMultiAccount()
```

### Account Creation

```typescript
// Create artist account
const artistId = await createArtistAccount({
  artist_name: "My Band",
  bio: "We make music",
  genres: ["Rock", "Pop"],
  social_links: { spotify: "https://..." }
})

// Create venue account
const venueId = await createVenueAccount({
  venue_name: "My Venue",
  description: "Great live music venue",
  address: "123 Music St",
  capacity: 500
})
```

## Error Handling

### Database Errors
- Graceful fallback for missing tables
- User-friendly error messages
- Detailed console logging for debugging

### Authentication Errors
- Email validation
- Password requirements
- Duplicate account prevention

### Network Errors
- Retry mechanisms
- Offline state handling
- Loading states

## Testing

### Manual Testing

1. **Run the test script**:
   ```bash
   node test-signup-flow.js
   ```

2. **Test complete flow**:
   - Sign up with new email
   - Verify email
   - Complete onboarding
   - Test dashboard features

### Test Scenarios

- [ ] Basic signup with email/password
- [ ] Social login (if configured)
- [ ] Email verification
- [ ] Artist account creation
- [ ] Venue account creation
- [ ] Account switching
- [ ] Onboarding completion
- [ ] Dashboard functionality

## Security Features

### Row Level Security (RLS)
- Users can only access their own data
- Public profiles are viewable by everyone
- Admin access controls

### Input Validation
- Email format validation
- Password strength requirements
- SQL injection prevention
- XSS protection

### Session Management
- Secure JWT tokens
- Automatic session refresh
- Logout functionality

## Customization

### Styling
- All components use Tailwind CSS
- Dark theme by default
- Consistent design system
- Mobile-responsive

### Branding
- Logo placement in header
- Custom color scheme (purple/indigo gradient)
- Professional typography
- Consistent iconography

### Account Types
- Easy to add new account types
- Configurable permissions
- Flexible profile schemas

## Troubleshooting

### Common Issues

1. **Migration Conflicts**
   - Use `setup_signup_flow.sql` directly in Supabase
   - Check existing table structures
   - Apply only missing components

2. **Email Not Sending**
   - Check Supabase email configuration
   - Verify SMTP settings
   - Test with different email providers

3. **Profile Creation Errors**
   - Check database functions exist
   - Verify table permissions
   - Test with SQL editor

### Debug Mode

Enable debug logging:
```javascript
// In your component
console.log('Signup data:', formData)
console.log('User created:', data.user)
console.log('Profile created:', profileData)
```

## Performance Optimizations

### Database
- Indexed frequently queried columns
- Efficient RLS policies
- Minimal data fetching

### Frontend
- Lazy loading for non-critical components
- Optimized images (WebP format)
- Progressive enhancement

### Caching
- Local storage for onboarding data
- React Query for server state
- Session caching

## Next Steps

1. **Enhanced Features**
   - Profile photo upload
   - Advanced account verification
   - Social media integration
   - Email preferences

2. **Analytics**
   - Signup conversion tracking
   - User journey analytics
   - A/B testing setup

3. **Notifications**
   - Welcome email sequences
   - Onboarding progress emails
   - Feature announcement system

---

For questions or issues, please refer to the codebase or contact the development team. 