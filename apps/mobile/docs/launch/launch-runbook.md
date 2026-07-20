# Mobile App Launch Runbook (iOS + Android)

## Scope

Operational runbook for production launch across App Store and Google Play with multi-locale metadata.

## Inputs

- Locale plan: `docs/launch/locale-matrix.md`
- Asset plan: `docs/launch/asset-spec-and-registry.md`
- Screenshot process: `docs/launch/screenshot-pipeline.md`
- Metadata deck: `docs/launch/store-metadata-deck.md`
- Compliance workbook: `docs/launch/compliance-workbook.md`

## Pre-Submit Validation

From `apps/mobile`:

```bash
npm run test:unit
npm run typecheck
npm run lint
npm run launch:validate
npm run launch:check-images
npm run launch:bundle
```

Or run the full prep sequence:

```bash
npm run launch:ready
```

Bundle output:

- `dist/store-upload-bundle/<locale>/ios/*`
- `dist/store-upload-bundle/<locale>/android/*`
- `dist/store-upload-bundle/<locale>/store-metadata.csv`

## Build and Submit Commands

From `apps/mobile`:

```bash
# iOS
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production

# Android
npx eas build --platform android --profile production
npx eas submit --platform android --profile production
```

Android OTA automation:

- Automatic OTA publish on `main` for OTA-safe changes: `.github/workflows/android-ota-production.yml`
- Native Android release workflow: `.github/workflows/android-native-release.yml`
- Release policy: `../android-release-policy.md`

## App Store Connect Upload Checklist

- [ ] Upload localized app name/subtitle/promotional text for all launch locales
- [ ] Upload localized description and keywords
- [ ] Upload approved screenshot sets for each required device class
- [ ] Complete privacy labels and age rating
- [ ] Add reviewer notes using template
- [ ] Confirm support URL and privacy URL are reachable

## Google Play Console Upload Checklist

- [ ] Upload app name, short description, and full description by locale
- [ ] Upload phone screenshot sets for each locale
- [ ] Complete Data Safety and content rating forms
- [ ] Verify app content declarations and ads flag
- [ ] Confirm support URL, privacy URL, and contact email
- [ ] Assign rollout strategy (staged rollout recommended)

## Launch Decision Gate

All must be true before production release:

- [ ] Crash reporting configured for production build (`EXPO_PUBLIC_SENTRY_DSN`)
- [ ] Internal TestFlight + Play Internal smoke of: auth → home → follow → push tap → checkout verify
- [ ] Password reset deep link and venue booking-requests API verified on device
- [ ] No P0/P1 defects in booking/auth/notifications/checkout flows
- [ ] Compliance workbook signed off by legal/security/product
- [ ] Release manager confirms version/build numbers in both stores
- [ ] Rollback owner and communication channel confirmed
- [ ] Preview EAS build green via `mobile-preview-release.yml` or manual `eas build --profile preview`

## First 72 Hours Operations

### 0-6 Hours
- Monitor crash-free sessions and ANR/error rates (Sentry)
- Monitor funnel: auth → home → follow → notification open → checkout verify
- Monitor venue booking-requests API error rates
- Triage 1-star and 2-star reviews for urgent regressions

### 6-24 Hours
- Check locale-specific screenshot/copy rendering in live listings
- Confirm support inbox SLA and top issue themes
- Evaluate need for staged rollout pause/acceleration

### 24-72 Hours
- Publish metadata hotfixes if copy or screenshot issues appear
- Prioritize patch release if crash threshold exceeded
- Write launch retrospective with conversion, retention, and quality metrics

## Rollback Criteria

- Crash-free sessions < 98%
- Critical auth failure affecting > 5% sign-in attempts
- Booking failure rate exceeds baseline by > 30%
- Compliance/legal issue reported by store review teams

If triggered:
- Pause staged rollout immediately
- Escalate to engineering on-call
- Prepare patched build and revised reviewer notes
