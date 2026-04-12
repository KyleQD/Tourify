# Android Setup (Google Play + EAS)

## Do you need Android Studio?

- Not required to ship cloud Android builds with EAS.
- Required if you want to run local Android emulator builds or debug native-only issues.

## Local Android run

1. Install Android Studio and Android SDK tools.
2. Configure an emulator or connect an Android device.
3. From `apps/mobile` run:
   - `npm run android`

## Google Play release flow (recommended)

1. Sign in to Expo:
   - `npx eas login`
2. Configure Expo credentials:
   - `npx eas credentials -p android`
3. Build Android app bundle:
   - `npx eas build --platform android --profile production`
4. Submit to Play internal testing:
   - `npx eas submit --platform android --profile production`
5. Promote internal -> closed -> production with staged rollout in Play Console.

## CI automation in this repo

- OTA updates on `main` (Android-safe JS changes): `.github/workflows/android-ota-production.yml`
- Native Android build/submit workflow: `.github/workflows/android-native-release.yml`
- OTA/native policy: `docs/android-release-policy.md`
- Offline readiness check (no secrets required): `npm run test:android-release-readiness`

## Required environment variables

Set these in EAS build environment:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Optional for App Links verification:

- `ANDROID_APP_SHA256_CERT_FINGERPRINTS` (comma-separated SHA256 cert fingerprints)

## Required GitHub secrets for automation

- `EXPO_TOKEN`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (needed only when automated submit is enabled)

## App Links verification

This repo serves Android Digital Asset Links from:

- `https://tourify.app/.well-known/assetlinks.json`

Before production rollout, confirm:

1. Package name is `com.tourify.mobile`.
2. Play signing certificate fingerprints are configured.
3. `adb shell pm get-app-links com.tourify.mobile` reports verified links.
