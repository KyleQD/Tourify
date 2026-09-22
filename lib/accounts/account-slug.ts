const RESERVED_ACCOUNT_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "artist",
  "auth",
  "calendar",
  "create",
  "dashboard",
  "discover",
  "events",
  "feed",
  "help",
  "jobs",
  "login",
  "messages",
  "notifications",
  "onboarding",
  "privacy",
  "profile",
  "search",
  "settings",
  "signup",
  "support",
  "terms",
  "tickets",
  "venue",
  "work",
  "www",
])

export function normalizeAccountSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

export function validateAccountSlug(value: string):
  | { valid: true; slug: string }
  | { valid: false; slug: string; reason: "length" | "reserved" } {
  const slug = normalizeAccountSlug(value)
  if (slug.length < 3) return { valid: false, slug, reason: "length" }
  if (RESERVED_ACCOUNT_SLUGS.has(slug)) {
    return { valid: false, slug, reason: "reserved" }
  }
  return { valid: true, slug }
}

