# Environment Setup Guide

## Quick Fix for Authentication Issues

The authentication error you're experiencing is due to missing or invalid Supabase environment variables. Here's how to fix it:

### Step 1: Create .env.local file

Create a `.env.local` file in the root directory of your project with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://auqddrodjezjlypkzfpi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here

# Other required variables
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### Step 2: Get Your Supabase Keys

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** > **API**
4. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Restart Your Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

### Step 4: Test the Signup Process

1. Go to `/signup` or `/onboarding`
2. Try creating a new account
3. The authentication should now work properly

## Troubleshooting

### If you still get authentication errors:

1. **Check the console** for detailed error messages
2. **Verify your keys** are correct and not placeholder values
3. **Ensure the .env.local file** is in the root directory
4. **Restart the development server** after making changes

### Common Issues:

- **"your_anon_key_here"** → You're using placeholder values
- **"Missing environment variables"** → .env.local file is missing or in wrong location
- **"Rate limit exceeded"** → Wait a few minutes and try again
- **"Network error"** → Check your internet connection

## Production Deployment

For production deployment, set these environment variables in your hosting platform:

- **Vercel**: Go to Project Settings > Environment Variables
- **Netlify**: Go to Site Settings > Environment Variables
- **Railway**: Go to Variables tab

## Support

If you continue to have issues:

1. Check the browser console for detailed error messages
2. Verify your Supabase project is active and not paused
3. Ensure your Supabase project has authentication enabled
4. Contact support with the specific error message you're seeing

## Security Notes

- Never commit your `.env.local` file to version control
- Keep your service role key secure and only use it server-side
- The anon key is safe to use in client-side code
- Rotate your keys regularly for security
