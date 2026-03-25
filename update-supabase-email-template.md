# Update Supabase Email Template Instructions

## Problem
Users are being redirected to an obsolete onboarding page with profile selection options after confirming their email, instead of being directed to the login page.

## Solution
Update the Supabase email template to redirect users to the correct login page.

## Steps to Fix

### 1. Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your Tourify project
3. Navigate to **Authentication** → **Email Templates**

### 2. Update the "Confirm signup" Template
1. Click on the **"Confirm signup"** template
2. Replace the current HTML content with the updated template from `updated-email-template.html`
3. Make sure the **Subject** is: `Welcome to Tourify - Confirm Your Email`

### 3. Configure Redirect URLs
1. Go to **Authentication** → **Settings**
2. Under **URL Configuration**, ensure these URLs are set:

**Site URL:**
```
https://demo.tourify.live
```

**Additional Redirect URLs:**
```
https://demo.tourify.live/auth/callback
https://demo.tourify.live/login
https://demo.tourify.live/dashboard
```

### 4. Test the Flow
1. Create a new test account
2. Check the email confirmation
3. Click the confirmation link
4. Verify it redirects to `https://demo.tourify.live/login` instead of the obsolete onboarding page

## Key Changes Made

1. **Removed obsolete components:**
   - `components/profile-type-selection.tsx` - The component showing Artist/Venue/Industry/General profile selection
   - `components/profile-info-modal.tsx` - Modal used by the profile selection component

2. **Updated email template:**
   - Added clearer messaging about being redirected to login page
   - Maintained professional Tourify branding
   - Kept the same confirmation URL structure

3. **Verified auth callback:**
   - The callback route already properly redirects to login page after email confirmation
   - No changes needed to the authentication flow

## Expected User Journey After Fix

1. **User signs up** → Account created, email sent
2. **User clicks email confirmation** → Email verified
3. **User redirected to** → `https://demo.tourify.live/login` (not obsolete onboarding)
4. **User logs in** → Access to dashboard with welcome message

## Files Modified
- ✅ `components/profile-type-selection.tsx` - Deleted (obsolete)
- ✅ `components/profile-info-modal.tsx` - Deleted (obsolete)  
- ✅ `updated-email-template.html` - Created (new template)
- ✅ `app/auth/callback/route.ts` - Verified (already correct)

## Next Steps
1. Update the Supabase email template using the provided HTML
2. Test the complete signup → email confirmation → login flow
3. Verify users are no longer seeing the obsolete profile selection page
