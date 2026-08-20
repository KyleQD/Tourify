import { createHash, randomBytes } from 'node:crypto'

const TOKEN_BYTES = 32

export function createOpaqueTrackingToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function hashTrackingToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function isSafePromoterDestinationPath(path: string): boolean {
  return path.startsWith('/')
    && !path.startsWith('//')
    && !path.includes('\\\\')
    && !/^[a-z][a-z0-9+.-]*:/i.test(path)
}
