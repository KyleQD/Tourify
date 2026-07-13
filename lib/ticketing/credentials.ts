import { randomBytes } from 'crypto'

/**
 * Opaque ticket credential helpers.
 * QR payload is the token only — never embed predictable ticket IDs as the sole secret.
 */

export function generateCredentialToken(): string {
  return randomBytes(32).toString('base64url')
}

export function buildQrPayload(token: string): string {
  return token
}

export function parseQrPayload(raw: string): string {
  const trimmed = (raw || '').trim()
  if (!trimmed) return ''

  // Support signed envelope {v,token} for future rotation without breaking v1
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { token?: string; t?: string }
      return String(parsed.token || parsed.t || '').trim()
    } catch {
      return trimmed
    }
  }

  return trimmed
}
