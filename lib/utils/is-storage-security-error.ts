/**
 * Detects browser SecurityError variants caused by privacy settings blocking
 * cookies, localStorage, or sessionStorage access. Covers Safari ITP, Firefox
 * ETP, incognito/private browsing, and sandboxed iframes.
 */
export function isStorageSecurityError(error: unknown): boolean {
  if (!error) return false
  const e = error as { name?: string; message?: string; cause?: unknown }
  const raw = `${e?.name ?? ""} ${e?.message ?? ""} ${String(e?.cause ?? "")} ${String(error)}`
  const msg = raw.toLowerCase().replace(/\u00a0/g, ' ').replace(/\u202f/g, ' ')
  return (
    e?.name === "SecurityError" ||
    e?.name === "NS_ERROR_DOM_SECURITY_ERR" ||
    msg.includes("operation is insecure") ||
    msg.includes("securityerror") ||
    msg.includes("access is denied") ||
    msg.includes("the operation is not allowed") ||
    msg.includes("failed to read the \"cookie\"") ||
    msg.includes("failed to read the \"localstorage\"") ||
    msg.includes("failed to read the 'localstorage'") ||
    msg.includes("failed to read the 'cookie'")
  )
}
