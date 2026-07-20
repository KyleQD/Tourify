import { createHash, randomBytes } from "node:crypto"

export const PASSPORT_SCHEMA_VERSION = "1.0.0"
export const PASSPORT_CANONICALIZATION_VERSION = "stable-json-v1"
export const PASSPORT_DISCLAIMER =
  "Tourify Rights Passport records participant-supplied information and completed review procedures. It is not a legal adjudication of copyright ownership."

export interface PublicPassportManifest {
  schemaVersion: string
  publicId: string
  passportVersion: number
  artistName: string
  title: string
  recordingIdentifiers: Record<string, string>
  workIdentifiers: Record<string, string>
  publicCredits: Array<{ name: string; roles: string[] }>
  verification: {
    originStatus: string
    humanOriginStatus: string
    contributorStatus: string
    documentStatus: string
    registryStatus: string
  }
  standardVersion: string
  status: string
  issuedAt: string
  previousVersionHash?: string
  nonce: string
  disclaimer: string
}

export interface PrivatePassportManifest extends PublicPassportManifest {
  projectId: string
  artistMusicId: string
  soundRecordingId?: string
  musicalWorkId?: string
  contributionIds: string[]
  claimIds: string[]
  agreementVersionHashes: string[]
  evidenceRefs: Array<{ id: string; category: string; contentSha256?: string | null }>
  sourceHashes: Record<string, string>
}

function stableObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableObject)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableObject(child)]),
    )
  }
  return value
}

export function canonicalizeManifest(manifest: object): string {
  return JSON.stringify(stableObject(manifest))
}

export function hashPassportManifest(manifest: object): string {
  return createHash("sha256").update(canonicalizeManifest(manifest)).digest("hex")
}

export function createManifestNonce(): string {
  return randomBytes(16).toString("hex")
}

export function buildPublicPassportManifest(params: {
  publicId: string
  passportVersion: number
  artistName: string
  title: string
  recordingIdentifiers?: Record<string, string>
  workIdentifiers?: Record<string, string>
  publicCredits?: Array<{ name: string; roles: string[] }>
  verification?: Partial<PublicPassportManifest["verification"]>
  standardVersion?: string
  status?: string
  issuedAt?: string
  previousVersionHash?: string
  nonce?: string
}): PublicPassportManifest {
  return {
    schemaVersion: PASSPORT_SCHEMA_VERSION,
    publicId: params.publicId,
    passportVersion: params.passportVersion,
    artistName: params.artistName,
    title: params.title,
    recordingIdentifiers: params.recordingIdentifiers || {},
    workIdentifiers: params.workIdentifiers || {},
    publicCredits: params.publicCredits || [],
    verification: {
      originStatus: params.verification?.originStatus || "unknown",
      humanOriginStatus: params.verification?.humanOriginStatus || "not_requested",
      contributorStatus: params.verification?.contributorStatus || "unknown",
      documentStatus: params.verification?.documentStatus || "unknown",
      registryStatus: params.verification?.registryStatus || "unknown",
    },
    standardVersion: params.standardVersion || "rights-passport-v1.0",
    status: params.status || "issued",
    issuedAt: params.issuedAt || new Date().toISOString(),
    previousVersionHash: params.previousVersionHash,
    nonce: params.nonce || createManifestNonce(),
    disclaimer: PASSPORT_DISCLAIMER,
  }
}

export function toPublicPassportVerificationDto(params: {
  publicId: string
  status: string
  standardVersion: string
  passportVersion: number
  publicManifest: PublicPassportManifest | Record<string, unknown>
  publicManifestHash: string
  issuedAt: string
  credentialPublicId?: string | null
  credentialStatus?: string | null
  trackTitle?: string
}) {
  const manifest = params.publicManifest as PublicPassportManifest
  return {
    public_id: params.publicId,
    record_type: "music_rights_passport" as const,
    status: params.status,
    standard_version: params.standardVersion,
    passport_version: params.passportVersion,
    manifest_hash: params.publicManifestHash,
    issued_at: params.issuedAt,
    artist_name: manifest.artistName,
    title: manifest.title || params.trackTitle || "Untitled",
    public_credits: manifest.publicCredits || [],
    verification: manifest.verification,
    credential_public_id: params.credentialPublicId || null,
    credential_status: params.credentialStatus || null,
    disclaimer: PASSPORT_DISCLAIMER,
  }
}
