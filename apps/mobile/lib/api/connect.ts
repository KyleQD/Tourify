import { apiRequest } from "@/lib/api/client"

interface CreateConnectSessionRequest {
  handshakeMethod: "nfc_ble"
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

interface ClaimConnectSessionRequest {
  ephemeralToken: string
  transportProof?: Record<string, unknown>
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

interface ConfirmConnectSessionRequest {
  connectSessionId: string
  intent: "send_follow_request"
  deviceContext?: Record<string, unknown>
}

export interface ConfirmConnectSessionResponse {
  success: boolean
  followRequestId: string | null
  relationshipStatus: string
}

export async function createConnectSession(payload: CreateConnectSessionRequest) {
  return apiRequest<CreateConnectSessionResponse>("/api/connect/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
    queueOnOffline: false,
    preferCachedOnOffline: false,
  })
}

export async function claimConnectSession(payload: ClaimConnectSessionRequest) {
  return apiRequest<ClaimConnectSessionResponse>("/api/connect/sessions/claim", {
    method: "POST",
    body: JSON.stringify(payload),
    queueOnOffline: false,
    preferCachedOnOffline: false,
  })
}

export async function confirmConnectSession(payload: ConfirmConnectSessionRequest) {
  return apiRequest<ConfirmConnectSessionResponse>("/api/connect/sessions/confirm", {
    method: "POST",
    body: JSON.stringify(payload),
    queueOnOffline: false,
    preferCachedOnOffline: false,
  })
}
