import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto'

const DEFAULT_EXPIRY_SECONDS = 120

interface CreateTokenParams {
  sharerUserId: string
  expiresInSeconds?: number
  oneTimeClaim?: boolean
}

export interface ConnectSessionTokenPayload {
  sessionId: string
  sharerUserId: string
  exp: number
  iat: number
  oneTimeClaim: boolean
}

interface VerifyTokenResult {
  payload: ConnectSessionTokenPayload | null
  errorCode: string | null
}

export function createConnectSessionToken(params: CreateTokenParams) {
  const secret = getConnectSessionSecret()
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresInSeconds = params.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS
  const payload: ConnectSessionTokenPayload = {
    sessionId: randomUUID(),
    sharerUserId: params.sharerUserId,
    exp: issuedAt + expiresInSeconds,
    iat: issuedAt,
    oneTimeClaim: params.oneTimeClaim ?? true,
  }
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = signPayload(encodedPayload, secret)
  const token = `${encodedPayload}.${signature}`

  return {
    token,
    payload,
    tokenHash: hashConnectSessionToken(token),
  }
}

export function verifyConnectSessionToken(token: string): VerifyTokenResult {
  const secret = getConnectSessionSecret()
  const tokenParts = token.split('.')

  if (tokenParts.length !== 2)
    return { payload: null, errorCode: 'invalid_token_format' }

  const [encodedPayload, receivedSignature] = tokenParts
  const expectedSignature = signPayload(encodedPayload, secret)

  if (!isEqualSignature(receivedSignature, expectedSignature))
    return { payload: null, errorCode: 'invalid_token_signature' }

  const payload = decodeTokenPayload(encodedPayload)
  if (!payload)
    return { payload: null, errorCode: 'invalid_token_payload' }

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp <= now)
    return { payload: null, errorCode: 'token_expired' }

  return { payload, errorCode: null }
}

export function hashConnectSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function decodeTokenPayload(encodedPayload: string): ConnectSessionTokenPayload | null {
  try {
    const decodedPayload = decodeBase64Url(encodedPayload)
    const parsedPayload = JSON.parse(decodedPayload) as ConnectSessionTokenPayload

    if (!parsedPayload?.sessionId || !parsedPayload?.sharerUserId)
      return null

    if (typeof parsedPayload.exp !== 'number' || typeof parsedPayload.iat !== 'number')
      return null

    if (typeof parsedPayload.oneTimeClaim !== 'boolean')
      return null

    return parsedPayload
  } catch {
    return null
  }
}

function signPayload(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function isEqualSignature(receivedSignature: string, expectedSignature: string) {
  try {
    const receivedBuffer = Buffer.from(receivedSignature)
    const expectedBuffer = Buffer.from(expectedSignature)
    if (receivedBuffer.length !== expectedBuffer.length)
      return false

    return timingSafeEqual(receivedBuffer, expectedBuffer)
  } catch {
    return false
  }
}

function getConnectSessionSecret() {
  const secret = process.env.CONNECT_SESSION_SECRET || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_JWT_SECRET
  if (!secret)
    throw new Error('Missing CONNECT_SESSION_SECRET (or fallback auth secret) for connect session tokens')

  return secret
}
