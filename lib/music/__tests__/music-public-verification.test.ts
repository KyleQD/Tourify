import { toPublicCertificateVerificationDto, toPublicOriginVerificationDto } from "../music-public-verification"

const forbidden = ["storage_path", "storage_bucket", "evidence", "signature", "reviewer_user_id", "internal_notes", "detector_score", "user_id"]

function allKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") return []
  if (Array.isArray(value)) return value.flatMap(allKeys)
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => [key, ...allKeys(nested)])
}

describe("public music verification DTOs", () => {
  test("origin response filters private and legal-conclusion fields", () => {
    const dto = toPublicOriginVerificationDto({
      public_id: "public", track_id: "track", schema_version: "1.0.0", manifest_hash: "hash",
      status: "active", recorded_at: "2026-07-17T00:00:00Z", storage_path: "secret",
      evidence: { private: true }, internal_notes: "never", artist_music: { title: "Song" },
    })
    forbidden.forEach((field) => expect(allKeys(dto)).not.toContain(field))
    expect(dto.disclaimer).toContain("not a legal ownership determination")
  })

  test("certificate response exposes only active public verification fields", () => {
    const dto = toPublicCertificateVerificationDto({
      public_id: "public", track_id: "track", certificate_version: 2, standard_version: "1.0.0",
      certification_level: 1, manifest_hash: "hash", issued_at: "2026-07-17T00:00:00Z",
      reviewer_user_id: "private", internal_notes: "private", artist_music: [{ title: "Song" }],
    })
    forbidden.forEach((field) => expect(allKeys(dto)).not.toContain(field))
    expect(dto).toMatchObject({ status: "active", label: "Human-created certified" })
  })
})
