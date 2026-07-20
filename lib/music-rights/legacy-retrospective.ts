/**
 * Retrospective rights workflows for existing artist_music rows.
 * Does not auto-certify, mutate DSP distribution, or change original release dates.
 */

export interface LegacyTrackRightsBootstrapInput {
  trackId: string
  title: string
  releaseDate?: string | null
  createdAt?: string | null
  importSource?: string | null
}

export interface LegacyTrackRightsBootstrapPlan {
  preserveOriginalReleaseDate: string | null
  tourifyRecordedAt: string | null
  autoCertify: false
  mutateDistribution: false
  recommendedStatus: "draft"
  notes: string[]
}

export function planLegacyRightsBootstrap(input: LegacyTrackRightsBootstrapInput): LegacyTrackRightsBootstrapPlan {
  const notes = [
    "Create a rights project linked to the existing artist_music row.",
    "Preserve original_release_date separately from Tourify created_at.",
    "Do not auto-certify legacy catalog entries.",
    "Do not modify live DSP distribution metadata.",
  ]
  if (input.importSource)
    notes.push(`Import source recorded as metadata only: ${input.importSource}`)

  return {
    preserveOriginalReleaseDate: input.releaseDate || null,
    tourifyRecordedAt: input.createdAt || null,
    autoCertify: false,
    mutateDistribution: false,
    recommendedStatus: "draft",
    notes,
  }
}

export function flagsOffRestoresPrePhase2Experience(flags: Record<string, boolean>): boolean {
  return Object.values(flags).every((enabled) => enabled === false)
}
