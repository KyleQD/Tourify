/**
 * Artist profile visibility contract (ARTIST-005).
 *
 * Canonical read model: `artist_profiles.settings.public_profile` (boolean).
 * Public read/discovery surfaces gate on `settings.public_profile !== false`
 * and default to public when the flag is absent.
 *
 * The artist profile settings UI keeps a legacy display string at
 * `settings.preferences.privacy_settings` ("public" | "verified" | "private").
 * These helpers map the selector state to the canonical boolean so the
 * visibility selector actually gates public reads and search discovery.
 *
 * Visibility mapping:
 * - "public"   → `public_profile: true`
 * - "verified" → `public_profile: true` (read-side verified-only enforcement
 *   does not exist today; the value is preserved for display and future work)
 * - "private"  → `public_profile: false` (hidden from everyone but the owner)
 *
 * The write path keeps `preferences.privacy_settings` and `public_profile` in
 * sync; when they disagree, the canonical boolean wins for read-side behavior
 * and for the settings UI round-trip.
 */

export type ArtistPrivacySetting = 'public' | 'verified' | 'private'

const PRIVACY_SETTINGS: ReadonlySet<string> = new Set(['public', 'verified', 'private'])

/**
 * True when the canonical flag marks the profile hidden (owner-only).
 * Missing/non-boolean settings default to public, matching every public read
 * gate (`settings.public_profile !== false`).
 */
export function isArtistProfileHidden(
  settings: Record<string, unknown> | null | undefined
): boolean {
  if (!settings || typeof settings.public_profile !== 'boolean') return false
  return settings.public_profile === false
}

/** Inverse of {@link isArtistProfileHidden}; the public read surface contract. */
export function isArtistProfilePublic(
  settings: Record<string, unknown> | null | undefined
): boolean {
  return !isArtistProfileHidden(settings)
}

/**
 * Map the visibility selector to the boolean persisted at
 * `settings.public_profile`. Only "private" hides the profile from non-owners.
 */
export function privacySettingsToPublicProfileFlag(privacy: unknown): boolean {
  return privacy !== 'private'
}

/**
 * Resolve the selector value for the settings UI.
 *
 * The canonical flag wins: a profile hidden by any writer round-trips to
 * "private". Otherwise the legacy privacy_settings string is preserved when
 * valid, defaulting to "public".
 */
export function resolveArtistProfileVisibility(
  settings: Record<string, unknown> | null | undefined
): ArtistPrivacySetting {
  if (isArtistProfileHidden(settings)) return 'private'

  const preferences = settings?.preferences
  const legacy =
    preferences && typeof preferences === 'object'
      ? (preferences as Record<string, unknown>).privacy_settings
      : null

  return typeof legacy === 'string' && PRIVACY_SETTINGS.has(legacy)
    ? (legacy as ArtistPrivacySetting)
    : 'public'
}