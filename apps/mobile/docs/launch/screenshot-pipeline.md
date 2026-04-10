# Screenshot Pipeline

## Objective

Produce App Store and Google Play screenshot sets that are consistent across locales and repeatable every release.

## Canonical Screen Set

Capture the same narrative in this order:

1. Discover feed
2. Booking flow
3. Notifications
4. Profile and account mode
5. Auth sign-in

## Device Classes

### iOS
- 6.9-inch display class (required)
- 6.5-inch display class (fallback)

### Android
- Phone screenshots (minimum 2, target 5-8)
- Optional 7-inch and 10-inch tablet sets for merchandising

## Locale and Device Matrix

Use locales from `locale-matrix.md`.

| Platform | Device Class | Resolution Target | Locales |
| --- | --- | --- | --- |
| iOS | 6.9-inch | 1290x2796 | en-US, es-ES, fr-FR, de-DE, pt-BR, ja-JP |
| iOS | 6.5-inch | 1242x2688 | en-US, es-ES, fr-FR, de-DE, pt-BR, ja-JP |
| Android | Phone | 1080x2400 | en-US, es-ES, fr-FR, de-DE, pt-BR, ja-JP |

## Pre-Capture Setup

- Use seeded test accounts with stable sample data
- Disable debug overlays and development banners
- Set device language and region to target locale
- Use consistent connectivity and time format
- Confirm feature flags match production launch defaults

## Capture Procedure

1. Start from a clean app install
2. Log in with locale-specific test user
3. Navigate to each canonical screen in order
4. Capture screenshot with no system notifications visible
5. Save using naming convention:
   - `<platform>-<device>-<locale>-<screen>-v1.png`
   - Example: `ios-6_9-en-US-discover-v1.png`

## QA Checklist

- Text is fully localized and not truncated
- No placeholder copy remains
- CTA labels match store metadata language
- Safe areas and navigation bars are not clipped
- Images look consistent in light and dark mode where applicable
- Legal-sensitive claims are consistent with approved metadata

## Review + Approval

- Design signs visual consistency
- Localization signs language correctness
- Product signs feature narrative order
- Release manager marks set as `approved` in matrix tracker

## Storage

- Store working files in shared design folder
- Store final export package in release artifact storage
- Upload approved set to App Store Connect and Play Console
