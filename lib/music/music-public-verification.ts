export function toPublicOriginVerificationDto(data: any) {
  const track = Array.isArray(data.artist_music) ? data.artist_music[0] : data.artist_music
  return {
    public_id: data.public_id,
    record_type: "music_origin" as const,
    status: data.status,
    schema_version: data.schema_version,
    manifest_hash: data.manifest_hash,
    recorded_at: data.recorded_at,
    track: { id: data.track_id, title: track?.title || "Untitled" },
    disclaimer: "This record documents an artist submission and file integrity; it is not a legal ownership determination.",
  }
}

export function toPublicCertificateVerificationDto(data: any) {
  const track = Array.isArray(data.artist_music) ? data.artist_music[0] : data.artist_music
  return {
    public_id: data.public_id,
    record_type: "music_certificate" as const,
    status: "active" as const,
    certificate_version: data.certificate_version,
    standard_version: data.standard_version,
    certification_level: data.certification_level,
    manifest_hash: data.manifest_hash,
    issued_at: data.issued_at,
    label: "Human-created certified",
    track: { id: data.track_id, title: track?.title || "Untitled" },
    disclaimer: "Tourify certification reflects the evidence reviewed under the named standard; it is not a legal ownership determination.",
  }
}
