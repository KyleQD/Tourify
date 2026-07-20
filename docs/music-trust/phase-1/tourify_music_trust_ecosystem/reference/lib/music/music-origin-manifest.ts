import { createHash } from "node:crypto"

export interface MusicOriginManifestInput {
  schemaVersion: string
  trackId: string
  artistUserId: string
  sourceSha256: string
  title: string
  durationSeconds?: number | null
  declarationVersion: string
  declarationStatementHash: string
  aiUseCategory: string
  trainingUsePolicy: string
  recordedAt: string
  previousManifestHash?: string | null
}

export interface MusicOriginManifest extends MusicOriginManifestInput {
  manifestType: "tourify.music-origin"
}

function canonicalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue)
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalizeValue(nested)]),
    )
  }

  return value
}

export function buildMusicOriginManifest(input: MusicOriginManifestInput): MusicOriginManifest {
  return {
    manifestType: "tourify.music-origin",
    ...input,
  }
}

export function serializeMusicOriginManifest(manifest: MusicOriginManifest): string {
  return JSON.stringify(canonicalizeValue(manifest))
}

export function hashMusicOriginManifest(manifest: MusicOriginManifest): string {
  return createHash("sha256").update(serializeMusicOriginManifest(manifest)).digest("hex")
}

// This deterministic serializer is sufficient for the initial internal origin record.
// Before external cryptographic interoperability, replace or verify it against an audited
// RFC 8785 JSON Canonicalization Scheme implementation.
