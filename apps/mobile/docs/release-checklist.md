# Mobile Release Checklist

## Build + test

- Run `npm run typecheck`
- Run `npm run lint`
- Run `npm run launch:ready`
- Run `npm run test:android-release-readiness`
- Verify auth flows: email/password + Google/Apple/Facebook
- Verify API auth using bearer token for discover, follow, notifications, and payment endpoints
- Verify checkout redirect flow returns users to `tourify://bookings`
- Verify realtime notification refresh in app

## Observability

- Configure crash capture provider (Sentry or Crashlytics)
- Set release and environment tags in `lib/observability/logger.ts`
- Confirm logs include `appVersion`, `runtimeVersion`, `releaseChannel`, and `buildEnvironment`
- Confirm production errors include `feature` and `userId` context

## Store distribution

- iOS: submit preview via TestFlight
- OTA lane (JS/content only): `npm run mobile:ota:production`
- Native lane (runtime/plugin/dependency changes): `npm run mobile:ios:build:production` then `npm run mobile:ios:submit:production`
- Android OTA lane (JS/content only): automatic via `.github/workflows/android-ota-production.yml` or manual `npm run mobile:ota:production:android`
- Android native lane (runtime/plugin/dependency changes): run `.github/workflows/android-native-release.yml` or use `npm run mobile:android:build:production` then `npm run mobile:android:submit:production`
- Android Play release flow: internal testing track -> staged rollout -> production
- Validate deep links:
  - `tourify://callback`
  - `https://tourify.app/callback`
  - `https://tourify.app/.well-known/assetlinks.json`
- Validate privacy labels and permission descriptions
- Validate launch package docs and assets in `docs/launch/launch-runbook.md`
- Validate rollback execution steps in `docs/launch/rollback-playbooks.md`
