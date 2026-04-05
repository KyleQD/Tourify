# iOS Setup (Xcode + TestFlight)

## Do you need Xcode?

- **Not required** to continue coding or run cloud iOS builds with EAS.
- **Required** if you want to:
  - run iOS simulator locally
  - debug native iOS issues
  - inspect/modify native iOS project files

## Local iOS run

1. Install Xcode from App Store
2. Open Xcode once and install additional components
3. Install CocoaPods if needed: `sudo gem install cocoapods`
4. From `apps/mobile` run:
   - `npm run ios`

## TestFlight release (recommended)

1. Sign in to Expo:
   - `npx eas login`
2. Configure Apple credentials:
   - `npx eas credentials`
3. Build iOS app:
   - `npx eas build --platform ios --profile preview`
4. Submit to TestFlight:
   - `npx eas submit --platform ios --profile production`

## Required environment variables

Set these for EAS build environment:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

You can set them with:

- `npx eas secret:create --name EXPO_PUBLIC_API_BASE_URL --value https://tourify.app`
