/**
 * Privacy-safe blockchain attestation helpers (testnet only).
 * Builds idempotent outbox payloads. No user wallets. No mainnet by default.
 */

import { createHash } from "node:crypto"

export type AnchorNetwork = "sepolia" | "local" | "mainnet_disabled"
export type AnchorOutboxStatus = "requested" | "pending" | "confirmed" | "failed" | "replaced"
export type OnChainPassportStatus = "active" | "suspended" | "revoked" | "superseded"

export interface PassportAnchorCommitments {
  passportPublicId: string
  passportVersion: number
  publicManifestHash: string
  privateManifestCommitment: string
  credentialHash: string
  schemaVersion: string
  issuer: string
  issuedAt: string
  status: OnChainPassportStatus
  supersededByVersion?: number | null
  reasonCode?: string | null
}

export interface AnchorOutboxPayload {
  eventType: "music.rights.anchor.requested"
  network: AnchorNetwork
  dedupeKey: string
  passportPublicIdHash: string
  passportVersion: number
  publicManifestHash: string
  privateManifestCommitment: string
  credentialHash: string
  schemaVersion: string
  issuer: string
  issuedAt: string
  status: OnChainPassportStatus
  supersededByVersion: number | null
  reasonHash: string | null
  projectId?: string | null
  passportId?: string | null
  passportVersionId?: string | null
}

export const MUSIC_RIGHTS_ANCHOR_EVENT = "music.rights.anchor.requested"
export const DEFAULT_TESTNET_NETWORK: AnchorNetwork = "sepolia"

export function hashOpaqueCommitment(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export function assertNoPiiOnChain(payload: Record<string, unknown>): { ok: true } | { ok: false; reason: string } {
  const bannedKeys = ["email", "name", "phone", "address", "audio", "evidence_url", "signature", "ssn", "wallet"]
  const serialized = JSON.stringify(payload).toLowerCase()
  for (const key of bannedKeys) {
    if (Object.prototype.hasOwnProperty.call(payload, key))
      return { ok: false, reason: `On-chain payload must not include field: ${key}` }
  }
  if (serialized.includes("@") && serialized.includes("."))
    return { ok: false, reason: "On-chain payload appears to include an email-like value." }
  return { ok: true }
}

export function resolveAnchorNetwork(env: NodeJS.ProcessEnv = process.env): AnchorNetwork {
  if (env.MUSIC_RIGHTS_ANCHOR_MAINNET === "true") return "mainnet_disabled"
  const configured = env.MUSIC_RIGHTS_ANCHOR_NETWORK
  if (configured === "local") return "local"
  return DEFAULT_TESTNET_NETWORK
}

export function buildAnchorDedupeKey(params: {
  network: AnchorNetwork
  passportPublicId: string
  passportVersion: number
}): string {
  return `anchor:${params.network}:${params.passportPublicId}:v${params.passportVersion}`
}

export function buildAnchorOutboxPayload(params: {
  commitments: PassportAnchorCommitments
  network?: AnchorNetwork
  projectId?: string | null
  passportId?: string | null
  passportVersionId?: string | null
}): AnchorOutboxPayload {
  const network = params.network || resolveAnchorNetwork()
  if (network === "mainnet_disabled")
    throw new Error("Mainnet anchoring is disabled. Use Sepolia/local testnet only.")

  const passportPublicIdHash = hashOpaqueCommitment(params.commitments.passportPublicId)
  const reasonHash = params.commitments.reasonCode
    ? hashOpaqueCommitment(params.commitments.reasonCode)
    : null

  const payload: AnchorOutboxPayload = {
    eventType: MUSIC_RIGHTS_ANCHOR_EVENT,
    network,
    dedupeKey: buildAnchorDedupeKey({
      network,
      passportPublicId: params.commitments.passportPublicId,
      passportVersion: params.commitments.passportVersion,
    }),
    passportPublicIdHash,
    passportVersion: params.commitments.passportVersion,
    publicManifestHash: params.commitments.publicManifestHash,
    privateManifestCommitment: params.commitments.privateManifestCommitment,
    credentialHash: params.commitments.credentialHash,
    schemaVersion: params.commitments.schemaVersion,
    issuer: params.commitments.issuer,
    issuedAt: params.commitments.issuedAt,
    status: params.commitments.status,
    supersededByVersion: params.commitments.supersededByVersion ?? null,
    reasonHash,
    projectId: params.projectId ?? null,
    passportId: params.passportId ?? null,
    passportVersionId: params.passportVersionId ?? null,
  }

  const piiCheck = assertNoPiiOnChain({ ...payload })
  if (!piiCheck.ok) throw new Error(piiCheck.reason)
  return payload
}

export function mapAnchorWorkerStatus(params: {
  submitted: boolean
  confirmed: boolean
  failed: boolean
}): AnchorOutboxStatus {
  if (params.failed) return "failed"
  if (params.confirmed) return "confirmed"
  if (params.submitted) return "pending"
  return "requested"
}

/** Off-chain passport validity is independent of anchor status. */
export function doesAnchorFailureInvalidatePassport(): false {
  return false
}
