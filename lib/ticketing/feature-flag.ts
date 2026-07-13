/**
 * Ticketing feature flag — env or per-request override.
 * When off, legacy purchase/check-in paths remain unchanged.
 */
export function isTicketingV2Enabled(): boolean {
  const raw = (process.env.FEATURE_TICKETING_V2 || process.env.NEXT_PUBLIC_FEATURE_TICKETING_V2 || '')
    .toLowerCase()
    .trim()
  if (!raw || raw === '0' || raw === 'false' || raw === 'off') return false
  return raw === '1' || raw === 'true' || raw === 'on' || raw === 'enforce'
}
