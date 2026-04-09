export type AuthTab = "signup" | "signin"

export function normalizePostLoginRedirect(target: string): string {
  if (!target.startsWith("/")) return "/dashboard"
  if (target === "/" || target.startsWith("/login") || target.startsWith("/auth")) return "/dashboard"
  return target
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
