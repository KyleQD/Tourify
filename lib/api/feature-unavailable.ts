/** Shared helpers for degrading Event HQ / ops features when a backend is unavailable. */

export interface FeatureUnavailablePayload {
  error?: string
  featureUnavailable?: boolean
  message?: string
}

export function isFeatureUnavailableResponse(status: number, payload?: FeatureUnavailablePayload | null): boolean {
  if (payload?.featureUnavailable) return true
  return status === 501 || status === 503
}

export function featureUnavailableMessage(
  payload?: FeatureUnavailablePayload | null,
  fallback = 'This feature is temporarily unavailable.',
): string {
  return payload?.error || payload?.message || fallback
}
