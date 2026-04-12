import { apiRequest } from "@/lib/api/client"
import {
  claimConnectSessionResponseSchema,
  confirmConnectSessionResponseSchema,
  createConnectSessionResponseSchema,
} from "@tourify/api-contracts"
import type {
  ClaimConnectSessionRequest,
  ClaimConnectSessionResponse,
  ConfirmConnectSessionRequest,
  ConfirmConnectSessionResponse,
  CreateConnectSessionRequest,
  CreateConnectSessionResponse,
} from "@tourify/api-contracts"

export type {
  ClaimConnectSessionResponse,
  ConfirmConnectSessionResponse,
  CreateConnectSessionResponse,
}

export async function createConnectSession(payload: CreateConnectSessionRequest) {
  const response = await apiRequest<CreateConnectSessionResponse>("/api/connect/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
    queueOnOffline: false,
    preferCachedOnOffline: false,
  })
  return createConnectSessionResponseSchema.parse(response)
}

export async function claimConnectSession(payload: ClaimConnectSessionRequest) {
  const response = await apiRequest<ClaimConnectSessionResponse>("/api/connect/sessions/claim", {
    method: "POST",
    body: JSON.stringify(payload),
    queueOnOffline: false,
    preferCachedOnOffline: false,
  })
  return claimConnectSessionResponseSchema.parse(response)
}

export async function confirmConnectSession(payload: ConfirmConnectSessionRequest) {
  const response = await apiRequest<ConfirmConnectSessionResponse>("/api/connect/sessions/confirm", {
    method: "POST",
    body: JSON.stringify(payload),
    queueOnOffline: false,
    preferCachedOnOffline: false,
  })
  return confirmConnectSessionResponseSchema.parse(response)
}
