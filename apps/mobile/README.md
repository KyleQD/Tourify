# Tourify Mobile (Expo)

React Native + Expo shell for iOS and Android that reuses Tourify Supabase auth and existing Next.js API routes.

## Quick start

1. Copy `.env.example` to `.env`
2. Install dependencies
3. Start Expo

```bash
npm install
npm run dev
```

From repository root:

```bash
npm run dev:mobile
```

## Environment variables

- `EXPO_PUBLIC_API_BASE_URL`: deployed Next app URL (for `/api/*` requests)
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key

## Implemented foundations

- Expo Router app shell with auth and tabs
- Supabase native auth (email/password + OAuth launch path)
- Bearer-token API client for existing backend routes
- Initial Discover, Bookings, Notifications, and Profile screens
- Payment bridge support for mobile deep links
- Release checklist in `docs/release-checklist.md`
- iOS build/setup guide in `docs/ios-setup.md`
