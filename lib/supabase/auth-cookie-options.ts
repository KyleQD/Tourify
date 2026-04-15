/**
 * Normalize Supabase auth cookie flags for browsers and reverse proxies.
 */
export function mergeAuthCookieOptions(options?: Record<string, unknown>) {
  const secure =
    typeof options?.secure === "boolean"
      ? options.secure
      : process.env.NODE_ENV === "production"
  return {
    ...options,
    path: typeof options?.path === "string" ? options.path : "/",
    sameSite: (options?.sameSite as "lax" | "strict" | "none" | undefined) ?? "lax",
    secure,
  }
}
