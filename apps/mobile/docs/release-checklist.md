# Mobile Release Checklist

## Build + test

- Run `npm run typecheck`
- Run `npm run lint`
- Verify auth flows: email/password + Google/Apple/Facebook
- Verify API auth using bearer token for discover, follow, notifications, and payment endpoints
- Verify checkout redirect flow through `/auth/mobile-callback`
- Verify realtime notification refresh in app

## Observability

- Configure crash capture provider (Sentry or Crashlytics)
- Set release and environment tags in `lib/observability/logger.ts`
- Confirm production errors include `feature` and `userId` context

## Store distribution

- iOS: submit preview via TestFlight
- Android: submit preview to internal testing track
- Validate deep links:
  - `tourify://auth/callback`
  - `https://tourify.app/auth/mobile-callback`
- Validate privacy labels and permission descriptions
