/**
 * Narrow trust/passport metadata for mobile and public surfaces.
 * Must never expose private shares, evidence paths, or agreement content.
 */

export interface NarrowMusicTrustMetadata {
  originStatus?: string | null
  certificationStatus?: string | null
  certificationPublicId?: string | null
  passportPublicId?: string | null
  passportStatus?: string | null
  humanOriginStatus?: string | null
  trainingReservationUrl?: string | null
}

export function toNarrowMusicTrustMetadata(input: {
  origin_status?: string | null
  certification_status?: string | null
  certification_public_id?: string | null
  passport_public_id?: string | null
  passport_status?: string | null
  human_origin_status?: string | null
  includeTrainingReservation?: boolean
}): NarrowMusicTrustMetadata {
  return {
    originStatus: input.origin_status || null,
    certificationStatus: input.certification_status || null,
    certificationPublicId: input.certification_public_id || null,
    passportPublicId: input.passport_public_id || null,
    passportStatus: input.passport_status || null,
    humanOriginStatus: input.human_origin_status || null,
    trainingReservationUrl: input.includeTrainingReservation
      ? "/legal/music-training-reservation"
      : null,
  }
}
