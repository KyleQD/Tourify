/**
 * Detects browser SecurityError variants caused by privacy settings blocking
 * cookies, localStorage, or sessionStorage access. Covers Safari ITP, Firefox
 * ETP, incognito/private browsing, and sandboxed iframes.
 *
 * Next.js error boundaries may wrap the original DOMException in a plain Error,
 * stripping the `.name` property. We therefore match broadly against the
 * stringified representation of the entire error (including `.cause`).
 */
export function isStorageSecurityError(error: unknown): boolean {
  if (!error) return false
  const e = error as { name?: string; message?: string; code?: number; cause?: unknown }

  // DOMException.SECURITY_ERR === 18
  if (typeof e.code === "number" && e.code === 18) return true

  const parts: string[] = []
  try { parts.push(e?.name ?? "") } catch { /* noop */ }
  try { parts.push(e?.message ?? "") } catch { /* noop */ }
  try { parts.push(String(e?.cause ?? "")) } catch { /* noop */ }
  try { parts.push(String(error)) } catch { /* noop */ }

  const msg = parts
    .join(" ")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\u202f/g, " ")

  return (
    e?.name === "SecurityError" ||
    e?.name === "NS_ERROR_DOM_SECURITY_ERR" ||
    msg.includes("operation is insecure") ||
    msg.includes("securityerror") ||
    msg.includes("access is denied") ||
    msg.includes("the operation is not allowed") ||
    msg.includes("dom exception 18") ||
    msg.includes("failed to read the \"cookie\"") ||
    msg.includes("failed to read the \"localstorage\"") ||
    msg.includes("failed to read the 'localstorage'") ||
    msg.includes("failed to read the 'cookie'") ||
    msg.includes("failed to read the 'sessionstorage'") ||
    msg.includes("failed to read the \"sessionstorage\"")
  )
}
