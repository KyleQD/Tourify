export type ArtistEventVisibility = "public" | "unlisted" | "private"

export function getArtistEventVisibility(event: {
  producer_settings?: { visibility?: string } | null
  visibility?: string | null
  is_public?: boolean | null
} | null | undefined): ArtistEventVisibility {
  const fromSettings = event?.producer_settings?.visibility
  if (fromSettings === "public" || fromSettings === "unlisted" || fromSettings === "private") {
    return fromSettings
  }
  if (event?.visibility === "public" || event?.visibility === "unlisted" || event?.visibility === "private") {
    return event.visibility
  }
  if (event?.is_public === false) return "private"
  return "public"
}

/** Discover/search: only published + public visibility. */
export function isArtistEventDiscoverable(event: {
  status?: string | null
  producer_settings?: { visibility?: string } | null
  visibility?: string | null
  is_public?: boolean | null
} | null | undefined): boolean {
  if (!event || event.status !== "published") return false
  return getArtistEventVisibility(event) === "public"
}

/**
 * Public page access for non-owners.
 * - private → deny
 * - unlisted / public → allow when published
 */
export function canNonOwnerViewArtistEvent(event: {
  status?: string | null
  producer_settings?: { visibility?: string } | null
  visibility?: string | null
  is_public?: boolean | null
} | null | undefined): boolean {
  if (!event || event.status !== "published") return false
  return getArtistEventVisibility(event) !== "private"
}

export function visibilityToIsPublic(visibility: ArtistEventVisibility): boolean {
  return visibility === "public" || visibility === "unlisted"
}
