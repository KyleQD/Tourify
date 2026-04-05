export function normalizeVenueSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export function getLegacyVenueProfileRedirect(pathname: string) {
  const match = pathname.match(/^\/venue\/([^/]+)$/)
  if (!match?.[1]) return null
  return `/venues/${match[1]}`
}
