# Android Release Policy (OTA vs Native)

## Purpose

Define when Android updates are shipped as OTA updates versus native Play Store releases so `main` stays continuously deployable without breaking installed apps.

## Channel and Branch Mapping

- EAS update channel: `production`
- EAS update branch: `production`
- Automatic trigger: `.github/workflows/android-ota-production.yml` after successful CI on `main`
- Manual native release trigger: `.github/workflows/android-native-release.yml`

## OTA-Safe Changes (auto-publish)

Changes can ship through OTA when they only affect JavaScript/TypeScript behavior and do not require a native rebuild.

Examples:

- `apps/mobile/app/**`
- `apps/mobile/components/**`
- `apps/mobile/lib/**`
- `packages/api-contracts/**`
- Backend/API route changes that are contract-compatible with the current app runtime

## Native-Required Changes (Play release required)

Changes must go through Android native build + Play rollout when they affect runtime/native capabilities or app binary metadata.

Examples:

- `apps/mobile/android/**`
- `apps/mobile/app.config.ts`
- `apps/mobile/eas.json`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- Expo SDK or native module changes
- New Android permissions, intent filters, or signing changes

## Rollout Rules

1. Every merge to `main` runs CI.
2. If CI succeeds and changes are OTA-safe, Android OTA publishes automatically.
3. If native-impacting changes are detected, OTA skips with a warning.
4. Native changes are released through `android-native-release.yml` to internal testing first, then staged production rollout in Google Play.

## Rollback

- OTA rollback: republish the previous known-good update group to `production`.
- Native rollback: halt staged rollout in Play Console and promote the previous stable build.

## Required Secrets (placeholder until access is granted)

- `EXPO_TOKEN`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (required only for automated Play submit)
