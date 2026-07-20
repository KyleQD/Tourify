# Mobile Release Checklist

## Build + test

- [ ] Run `npm run test:unit` (push routing, checkout verify status, reset-password guard)
- [ ] Run `npm run typecheck`
- [ ] Run `npm run lint`
- [ ] Run `npm run launch:ready`
- [ ] Run root `npm run test:mobile-redirect`
- [ ] Run root `npm run mobile:verify` (typecheck + lint + unit)
- [ ] Verify auth flows: email/password + Google/Apple/Facebook
- [ ] Verify password reset deep link lands on `/(auth)/reset-password`
- [ ] Verify API auth using bearer token for discover, follow, notifications, payment, venue booking-requests
- [ ] Verify event checkout opens browser then **server-verifies** before showing completed
- [ ] Verify push notification tap navigates via `data.url`
- [ ] Verify realtime notification refresh in app

## Observability

- [ ] Set `EXPO_PUBLIC_SENTRY_DSN` for preview/production builds
- [ ] Confirm Sentry initializes via `lib/observability/sentry.ts`
- [ ] Confirm release tags: `appVersion`, `runtimeVersion`, `releaseChannel`, `buildEnvironment`
- [ ] Confirm production errors include `feature` and `userId` context when provided
- [ ] Smoke: force a handled exception in an internal build and confirm it appears in Sentry

## Store distribution

- [ ] iOS: submit preview via TestFlight (`eas build --profile preview` or workflow `mobile-preview-release.yml`)
- [ ] Android: Play Internal testing track before staged production
- [ ] OTA lane (JS/content only): `npm run mobile:ota:production`
- [ ] Native lane (runtime/plugin/dependency changes): rebuild with production profile (plugins, permissions, SDK)
- [ ] Android OTA lane: `.github/workflows/android-ota-production.yml` or `npm run mobile:ota:production:android`
- [ ] Android native lane: `.github/workflows/android-native-release.yml`
- [ ] Validate deep links:
  - `tourify://callback`
  - `tourify://reset-password`
  - `tourify://checkout`
  - `https://tourify.app/callback`
  - `https://tourify.app/reset-password`
  - `https://tourify.app/checkout`
  - `https://tourify.app/connect`
  - `https://tourify.app/.well-known/assetlinks.json`
- [ ] Validate privacy labels and permission descriptions (notifications, location, photo library)
- [ ] Validate launch package docs and assets in `docs/launch/launch-runbook.md`
- [ ] Validate rollback execution steps in `docs/launch/rollback-playbooks.md`

## Post-launch telemetry gate (first 72 hours)

Track funnel in Sentry + API logs:

1. Auth success → Home feed load
2. Follow action
3. Notification open (push `data.url`)
4. Event checkout verify success
5. Venue booking approve/reject (venue accounts)

Hold or roll back if any Phase-5 trigger in `docs/launch/production-rollout-monitoring.md` fires.
