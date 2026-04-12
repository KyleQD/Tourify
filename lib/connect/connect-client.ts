export const CONNECT_TOKEN_MIN_LENGTH = 20

export interface CreateConnectSessionPayload {
  handshakeMethod: 'nfc_ble'
  oneTimeClaim: boolean
  expiresInSeconds: number
}

export interface CreateConnectSessionResponse {
  connectSessionId: string
  ephemeralToken: string
  expiresAt: string
  claimUrl: string
  webClaimUrl: string
  deepLinkUrl: string
}

export interface ClaimConnectSessionPayload {
  ephemeralToken: string
  deviceContext?: Record<string, unknown>
}

export interface ClaimConnectSessionResponse {
  connectSessionId: string
  profilePreview: {
    userId: string
    username: string | null
    fullName: string | null
    avatarUrl: string | null
    bio: string | null
    location: string | null
    email: string | null
    phone: string | null
  }
  relationshipStatus: string
  requiresConfirm: boolean
}

export interface ConfirmConnectSessionPayload {
  connectSessionId: string
  intent: 'send_follow_request'
  deviceContext?: Record<string, unknown>
}

export interface ConnectTelemetryPayload {
  eventName: string
  connectSessionId?: string
  platform?: string
  sessionId?: string
  appVersion?: string
  osVersion?: string
  deviceModel?: string
  metadata?: Record<string, unknown>
}

export async function createConnectSession(payload: CreateConnectSessionPayload) {
  return postJson<CreateConnectSessionResponse>('/api/connect/sessions', payload)
}

export async function claimConnectSession(payload: ClaimConnectSessionPayload) {
  return postJson<ClaimConnectSessionResponse>('/api/connect/sessions/claim', payload)
}

export async function confirmConnectSession(payload: ConfirmConnectSessionPayload) {
  return postJson<{ success: boolean; followRequestId: string | null; relationshipStatus: string }>(
    '/api/connect/sessions/confirm',
    payload
  )
}

export async function sendConnectTelemetry(payload: ConnectTelemetryPayload) {
  try {
    const defaults = getWebTelemetryDefaults()
    await postJson<{ success: boolean }>('/api/connect/telemetry', {
      ...defaults,
      ...payload,
      platform: payload.platform || 'web',
      metadata: payload.metadata || {},
    })
  } catch {
    // telemetry should not block user flows
  }
}

function getWebTelemetryDefaults() {
  if (typeof navigator === 'undefined') {
    return {
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || null,
      osVersion: null,
      deviceModel: null,
    }
  }

  return {
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || null,
    osVersion: navigator.userAgent,
    deviceModel: navigator.platform || null,
  }
}

async function postJson<TResponse>(path: string, payload: unknown): Promise<TResponse> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const json = await response.json()
  if (response.ok) return json as TResponse

  const message = extractErrorMessage(json, response.status)
  throw new Error(message)
}

function extractErrorMessage(payload: unknown, statusCode: number) {
  if (payload && typeof payload === 'object') {
    const maybeRecord = payload as Record<string, unknown>
    const errorPayload = maybeRecord.error

    if (errorPayload && typeof errorPayload === 'object') {
      const nestedMessage = (errorPayload as Record<string, unknown>).message
      if (typeof nestedMessage === 'string' && nestedMessage.trim()) return nestedMessage
    }

    if (typeof maybeRecord.error === 'string' && maybeRecord.error.trim()) return maybeRecord.error
    if (typeof maybeRecord.message === 'string' && maybeRecord.message.trim()) return maybeRecord.message
  }

  return `Request failed (${statusCode})`
}
