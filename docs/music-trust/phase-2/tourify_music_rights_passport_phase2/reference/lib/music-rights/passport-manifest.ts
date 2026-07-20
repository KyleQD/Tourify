import { createHash, randomBytes } from "node:crypto"

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
  issuedAt: string
  previousVersionHash?: string
  nonce: string
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

export function canonicalizeManifest(manifest: PublicPassportManifest): string {
  return JSON.stringify(stableObject(manifest))
}

export function hashPassportManifest(manifest: PublicPassportManifest): string {
  return createHash("sha256").update(canonicalizeManifest(manifest)).digest("hex")
}

export function createManifestNonce(): string {
  return randomBytes(16).toString("hex")
}
