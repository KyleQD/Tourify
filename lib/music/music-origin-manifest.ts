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

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonicalize(nested)]))
  }
  return value
}

export function buildMusicOriginManifest(input: MusicOriginManifestInput): MusicOriginManifest {
  return { manifestType: "tourify.music-origin", ...input }
}

export function serializeMusicOriginManifest(manifest: MusicOriginManifest) {
  return JSON.stringify(canonicalize(manifest))
}

export function hashMusicOriginManifest(manifest: MusicOriginManifest) {
  return createHash("sha256").update(serializeMusicOriginManifest(manifest)).digest("hex")
}

export function hashMusicDeclarationStatement(input: unknown) {
  return createHash("sha256").update(JSON.stringify(canonicalize(input))).digest("hex")
}
