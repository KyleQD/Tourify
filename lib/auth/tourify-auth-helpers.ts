export type AuthTab = "signup" | "signin"

const AUTH_REDIRECT_FALLBACK = "/dashboard"
const AUTH_REDIRECT_DENIED_PREFIXES = [
  "/api",
  "/auth",
  "/debug",
  "/login",
  "/reset-password",
  "/signup",
  "/_next",
] as const

/**
 * Allow only a same-site application path after an auth transition.
 *
 * URL parsing is intentionally performed against a fixed sentinel origin so
 * scheme-relative paths, backslashes, encoded separators and absolute URLs
 * cannot become an off-site redirect in a browser or proxy runtime.
 */
export function normalizePostLoginRedirect(
  target: string | null | undefined,
  fallback = AUTH_REDIRECT_FALLBACK,
): string {
  const candidate = target?.trim()
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback
  }
  if (candidate.includes("\\") || /[\u0000-\u001f\u007f]/.test(candidate)) {
    return fallback
  }

  let parsed: URL
  try {
    parsed = new URL(candidate, "https://tourify.invalid")
  } catch {
    return fallback
  }

  if (parsed.origin !== "https://tourify.invalid") return fallback
  const lowerPath = parsed.pathname.toLowerCase()
  if (lowerPath === "/") return fallback
  if (
    AUTH_REDIRECT_DENIED_PREFIXES.some(
      (prefix) => lowerPath === prefix || lowerPath.startsWith(`${prefix}/`),
    )
  ) {
    return fallback
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export function generateUsername({
  fullName,
  email,
}: {
  fullName: string
  email: string
}) {
  const nameSeed = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
  const emailSeed =
    email
      .split("@")[0]
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") || ""
  const baseSeed = nameSeed || emailSeed
  if (!baseSeed) return ""
  return baseSeed.slice(0, 20)
}

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32)
}
